import { getStore } from "@netlify/blobs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NEGOCIO, CARDAPIO, COMBOS } from "../../public/loja.mjs";

export { NEGOCIO, CARDAPIO, COMBOS };

/* ---------- respostas ---------- */
export const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
export const erro = (msg, status = 400) => json({ erro: msg }, status);

/* ---------- armazenamento ---------- */
export const loja = () => getStore({ name: "pedidos", consistency: "strong" });

/* Dia de trabalho em São Paulo: quem pede à 0h20 ainda conta no dia anterior (o turno vai até 0h30) */
export function diaDeTrabalho(d = new Date()) {
  const sp = new Date(d.getTime() - 3 * 3600e3 - 6 * 3600e3); // UTC-3 e "vira o dia" às 6h
  return sp.toISOString().slice(0, 10);
}
export const chaveDe = (id) => `${id.slice(0, 10)}/${id}`;   // id = "AAAA-MM-DD_xxxxx"

export async function lerPedido(id) {
  if (!/^\d{4}-\d{2}-\d{2}_[a-z0-9]{6,20}$/.test(id || "")) return null;
  return loja().get(chaveDe(id), { type: "json" });
}
export async function salvarPedido(p) {
  p.atualizadoEm = new Date().toISOString();
  await loja().setJSON(chaveDe(p.id), p);
  return p;
}
export async function listarDia(dia) {
  const s = loja();
  const { blobs } = await s.list({ prefix: `${dia}/` });
  const itens = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
  return itens.filter(Boolean).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

/* ---------- utilidades ---------- */
export const so = (t) => String(t ?? "").replace(/\D/g, "");
export const txt = (t, max = 200) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, max);
export const novoToken = () => randomBytes(18).toString("base64url");
export function novoId() {
  const alfa = "abcdefghjkmnpqrstuvwxyz23456789";
  let r = "";
  for (const b of randomBytes(6)) r += alfa[b % alfa.length];
  return `${diaDeTrabalho()}_${r}`;
}
export const codigoDe = (id) => id.slice(-4).toUpperCase();

export function cpfValido(c) {
  c = so(c);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (const n of [9, 10]) {
    let s = 0;
    for (let i = 0; i < n; i++) s += +c[i] * (n + 1 - i);
    let d = (s * 10) % 11;
    if (d === 10) d = 0;
    if (d !== +c[n]) return false;
  }
  return true;
}
export const centavos = (v) => Math.round(v * 100) / 100;

/* ---------- Mercado Pago ---------- */
const MP_API = () => Netlify.env.get("MP_API_BASE") || "https://api.mercadopago.com";
const mpToken = () => Netlify.env.get("MP_ACCESS_TOKEN");
export const mpConfigurado = () => !!mpToken();

export async function mpCriarPix(pedido, urlBase) {
  const expira = new Date(Date.now() + NEGOCIO.pixExpiraMin * 60e3);
  const corpo = {
    transaction_amount: pedido.total,
    description: `Pedido ${NEGOCIO.nome} #${pedido.codigo}`,
    payment_method_id: "pix",
    external_reference: pedido.id,
    date_of_expiration: isoSP(expira),
    payer: {
      email: `pedido-${pedido.codigo.toLowerCase()}@kananba.com.br`,
      first_name: pedido.cliente.nome.split(" ")[0],
      identification: { type: "CPF", number: so(pedido.cliente.cpf) }
    }
  };
  // O Mercado Pago só aceita notification_url pública (https). Em teste local fica sem.
  if (urlBase.startsWith("https://")) corpo.notification_url = `${urlBase}/api/mp-webhook`;

  const r = await fetch(`${MP_API()}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mpToken()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": pedido.id
    },
    body: JSON.stringify(corpo)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Mercado Pago recusou o Pix", r.status, JSON.stringify(d));
    throw new Error(d.message || `Mercado Pago respondeu ${r.status}`);
  }
  const t = d.point_of_interaction?.transaction_data || {};
  return { mpId: String(d.id), mpStatus: d.status, qr: t.qr_code, qrImg: t.qr_code_base64, expiraEm: expira.toISOString() };
}

export async function mpConsultar(mpId) {
  const r = await fetch(`${MP_API()}/v1/payments/${encodeURIComponent(mpId)}`, {
    headers: { Authorization: `Bearer ${mpToken()}` }
  });
  if (!r.ok) throw new Error(`Mercado Pago respondeu ${r.status}`);
  return r.json();
}

/* Atualiza o pedido com o que o Mercado Pago diz sobre o pagamento. Retorna true se mudou. */
export function aplicarPagamento(pedido, pg) {
  if (!pedido || pedido.pagamento.forma !== "Pix") return false;
  if (String(pg.id) !== String(pedido.pagamento.mpId) && pg.external_reference !== pedido.id) return false;
  const antes = pedido.pagamento.status;
  if (pg.status === "approved") {
    pedido.pagamento.status = "pago";
    pedido.pagamento.pagoEm = pg.date_approved || new Date().toISOString();
    pedido.pagamento.valorPago = pg.transaction_amount;
    if (pedido.status === "aguardando_pagamento") { pedido.status = "novo"; marcar(pedido, "novo"); }
  } else if (["cancelled", "rejected", "refunded", "charged_back"].includes(pg.status)) {
    if (pedido.pagamento.status !== "pago") {
      pedido.pagamento.status = pg.status_detail === "expired" ? "expirado" : "cancelado";
      if (pedido.status === "aguardando_pagamento") { pedido.status = "cancelado"; marcar(pedido, "cancelado"); }
    } else if (pg.status === "refunded") {
      pedido.pagamento.status = "devolvido";
    }
  }
  return pedido.pagamento.status !== antes;
}

/* Se o Pix ainda está pendente, pergunta ao Mercado Pago (backup caso o aviso automático atrase) */
export async function conferirPix(pedido) {
  if (pedido?.pagamento?.forma !== "Pix" || pedido.pagamento.status !== "pendente" || !mpConfigurado()) return false;
  try {
    const pg = await mpConsultar(pedido.pagamento.mpId);
    if (aplicarPagamento(pedido, pg)) { await salvarPedido(pedido); return true; }
    // o Mercado Pago às vezes demora para marcar como expirado: a gente marca depois do prazo + 10 min
    if (pedido.pagamento.expiraEm && Date.now() > new Date(pedido.pagamento.expiraEm).getTime() + 10 * 60e3) {
      pedido.pagamento.status = "expirado";
      if (pedido.status === "aguardando_pagamento") { pedido.status = "cancelado"; marcar(pedido, "cancelado"); }
      await salvarPedido(pedido);
      return true;
    }
  } catch (e) {
    console.error("Falha ao conferir Pix", pedido.id, e.message);
  }
  return false;
}

export function marcar(pedido, status) {
  pedido.historico = pedido.historico || [];
  pedido.historico.push({ status, em: new Date().toISOString() });
}

function isoSP(d) {
  const sp = new Date(d.getTime() - 3 * 3600e3);
  return sp.toISOString().replace("Z", "-03:00");
}

/* O que o cliente pode ver do próprio pedido (sem token do painel, sem dados internos) */
export function visaoCliente(p) {
  return {
    id: p.id, codigo: p.codigo, status: p.status, criadoEm: p.criadoEm,
    entrega: p.entrega, itens: p.itens, subtotal: p.subtotal, taxa: p.taxa, total: p.total,
    pagamento: {
      forma: p.pagamento.forma, status: p.pagamento.status, troco: p.pagamento.troco || null,
      qr: p.pagamento.status === "pendente" ? p.pagamento.qr : null,
      qrImg: p.pagamento.status === "pendente" ? p.pagamento.qrImg : null,
      expiraEm: p.pagamento.expiraEm || null
    },
    historico: p.historico
  };
}

/* ---------- senha do painel ---------- */
export function senhaOk(req) {
  const certa = Netlify.env.get("PAINEL_SENHA");
  if (!certa) return null; // não configurada
  const dada = req.headers.get("x-painel-senha") || "";
  const h = (s) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(dada), h(certa));
}

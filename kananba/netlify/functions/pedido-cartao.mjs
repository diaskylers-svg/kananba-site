// POST /api/pedidos/:id/cartao?t=TOKEN → cobra o cartão de crédito do pedido
// O navegador manda só o "token" criado pelo formulário seguro do Mercado Pago (o número do cartão nunca chega aqui).
import { json, erro, lerPedido, salvarPedido, aplicarPagamento, mpCobrarCartao, motivoRecusa, cartaoConfigurado, visaoCliente, listarDia, filaDe } from "../lib/comum.mjs";

export default async (req, context) => {
  if (req.method !== "POST") return erro("Método não permitido", 405);
  if (!cartaoConfigurado()) return erro("O pagamento com cartão ainda não está disponível.", 503);
  const t = new URL(req.url).searchParams.get("t") || "";
  const p = await lerPedido(context.params.id);
  if (!p || !t || t !== p.token) return erro("Pedido não encontrado", 404);
  if (p.pagamento.forma !== "Cartão de crédito") return erro("Esse pedido não é no cartão.", 409);
  if (p.pagamento.status === "pago") return json({ ok: true, pedido: visaoCliente(p) });
  if (p.status !== "aguardando_pagamento" || !["pendente", "recusado"].includes(p.pagamento.status)) return erro("Esse pedido não está mais esperando pagamento.", 409);
  if (p.pagamento.expiraEm && Date.now() > new Date(p.pagamento.expiraEm).getTime()) return erro("O tempo para pagar acabou. Faça o pedido de novo.", 409);
  if ((p.pagamento.tentativas || 0) >= 5) return erro("Muitas tentativas neste pedido. Desista dele e faça de novo, ou pague com Pix.", 429);

  let b; try { b = await req.json(); } catch { return erro("Dados do cartão inválidos"); }
  if (!b?.token || typeof b.token !== "string" || !b.payment_method_id) return erro("Dados do cartão incompletos.");
  const dados = {
    token: b.token.slice(0, 200),
    payment_method_id: String(b.payment_method_id).slice(0, 40),
    issuer_id: b.issuer_id ? String(b.issuer_id).slice(0, 20) : null,
    email: typeof b.payer?.email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.payer.email) ? b.payer.email.slice(0, 120) : null,
    docTipo: b.payer?.identification?.type === "CNPJ" ? "CNPJ" : "CPF",
    docNumero: String(b.payer?.identification?.number || "")
  };

  const pg = await mpCobrarCartao(p, dados, Netlify.env.get("URL") || new URL(req.url).origin);
  if (pg.id) p.pagamento.mpId = String(pg.id);
  if (!aplicarPagamento(p, pg) && pg.status !== "approved") {
    p.pagamento.status = "recusado";
    p.pagamento.motivo = motivoRecusa(pg.status_detail);
  }
  await salvarPedido(p);
  const v = visaoCliente(p);
  if (p.status === "novo") { try { v.fila = filaDe(await listarDia(p.id.slice(0, 10)), p); } catch {} }
  return json({ ok: p.pagamento.status === "pago", pedido: v });
};

export const config = { path: "/api/pedidos/:id/cartao" };

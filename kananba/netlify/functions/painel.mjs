// Bastidores: precisa da senha do painel (variável PAINEL_SENHA na Netlify)
// GET  /api/painel/pedidos?dia=AAAA-MM-DD  → pedidos do dia
// POST /api/painel/status {id, status}     → muda o status do pedido
import { json, erro, senhaOk, diaDeTrabalho, listarDia, lerPedido, salvarPedido, conferirPix, marcar, mpConfigurado } from "../lib/comum.mjs";

const PROXIMOS = {
  novo: ["em_preparo", "cancelado"],
  em_preparo: ["saiu", "pronto", "cancelado"],
  saiu: ["concluido", "cancelado"],
  pronto: ["concluido", "cancelado"],
  aguardando_pagamento: ["cancelado"],
  concluido: [],
  cancelado: []
};

export default async (req, context) => {
  const ok = senhaOk(req);
  if (ok === null) return erro("Defina a variável PAINEL_SENHA na Netlify para usar o painel.", 503);
  if (!ok) return erro("Senha incorreta", 401);

  const acao = context.params["0"] || context.params.acao;

  if (req.method === "GET" && acao === "pedidos") {
    const q = new URL(req.url).searchParams.get("dia");
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(q || "") ? q : diaDeTrabalho();
    let lista = await listarDia(dia);
    // backup do aviso automático: confere Pix pendentes recentes direto no Mercado Pago
    const pendentes = lista.filter((p) => p.pagamento.status === "pendente").slice(0, 8);
    if (pendentes.length) await Promise.all(pendentes.map(conferirPix));
    return json({ dia, hoje: diaDeTrabalho(), pixAtivo: mpConfigurado(), pedidos: lista });
  }

  if (req.method === "POST" && acao === "status") {
    let b; try { b = await req.json(); } catch { return erro("Requisição inválida"); }
    const p = await lerPedido(b.id);
    if (!p) return erro("Pedido não encontrado", 404);
    if (!(PROXIMOS[p.status] || []).includes(b.status)) return erro(`Não dá para ir de "${p.status}" para "${b.status}".`, 409);
    if (b.status === "em_preparo" && p.pagamento.status === "pendente") return erro("Esse Pix ainda não foi pago.", 409);
    p.status = b.status;
    marcar(p, b.status);
    await salvarPedido(p);
    return json({ ok: true, pedido: p });
  }

  if (req.method === "GET" && acao === "ping") return json({ ok: true, pixAtivo: mpConfigurado() });

  return erro("Não encontrado", 404);
};

export const config = { path: "/api/painel/:acao" };

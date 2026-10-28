// POST /api/mp-webhook  → aviso automático do Mercado Pago quando um Pix muda de status.
// Nunca confiamos no conteúdo do aviso: buscamos o pagamento direto no Mercado Pago.
import { json, lerPedido, salvarPedido, aplicarPagamento, mpConsultar, mpConfigurado } from "../lib/comum.mjs";

export default async (req) => {
  if (!mpConfigurado()) return json({ ok: true });
  const url = new URL(req.url);
  let corpo = {};
  try { corpo = await req.json(); } catch {}
  const tipo = corpo.type || corpo.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  const mpId = corpo.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
  if (tipo && tipo !== "payment") return json({ ok: true });
  if (!mpId || !/^\d+$/.test(String(mpId))) return json({ ok: true });

  try {
    const pg = await mpConsultar(mpId);
    const pedido = await lerPedido(pg.external_reference);
    if (pedido && aplicarPagamento(pedido, pg)) await salvarPedido(pedido);
  } catch (e) {
    console.error("Webhook Mercado Pago", mpId, e.message);
    return json({ ok: false }, 500); // o Mercado Pago tenta de novo depois
  }
  return json({ ok: true });
};

export const config = { path: "/api/mp-webhook" };

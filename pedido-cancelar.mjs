// POST /api/pedidos/:id/cancelar?t=TOKEN  → o cliente desiste do pedido (antes de ir pra brasa)
import { json, erro, lerPedido, salvarPedido, conferirPix, marcar, podeDesistir, mpCancelar, mpConfigurado, visaoCliente } from "../lib/comum.mjs";

export default async (req, context) => {
  if (req.method !== "POST") return erro("Método não permitido", 405);
  const t = new URL(req.url).searchParams.get("t") || "";
  const p = await lerPedido(context.params.id);
  if (!p || !t || t !== p.token) return erro("Pedido não encontrado", 404);

  await conferirPix(p); // pode ter sido pago agorinha
  if (!podeDesistir(p)) {
    const msg = p.pagamento.status === "pago"
      ? "Esse pedido já foi pago. Para cancelar e receber o dinheiro de volta, fale com a gente pelo WhatsApp."
      : "Seu pedido já está sendo preparado e não dá mais para cancelar por aqui. Fale com a gente pelo WhatsApp.";
    return json({ erro: msg, pedido: visaoCliente(p) }, 409);
  }
  if (p.pagamento.forma === "Pix" && p.pagamento.status === "pendente" && p.pagamento.mpId && mpConfigurado()) {
    await mpCancelar(p.pagamento.mpId);
    p.pagamento.status = "cancelado";
  }
  p.status = "cancelado";
  p.canceladoPor = "cliente";
  marcar(p, "cancelado");
  await salvarPedido(p);
  return json({ ok: true, pedido: visaoCliente(p) });
};

export const config = { path: "/api/pedidos/:id/cancelar" };

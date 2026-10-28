// GET /api/pedidos/:id?t=TOKEN  → o cliente acompanha o próprio pedido
import { json, erro, lerPedido, conferirPix, visaoCliente } from "../lib/comum.mjs";

export default async (req, context) => {
  const id = context.params.id;
  const t = new URL(req.url).searchParams.get("t") || "";
  const p = await lerPedido(id);
  if (!p || !t || t !== p.token) return erro("Pedido não encontrado", 404);
  await conferirPix(p);
  return json({ pedido: visaoCliente(p) });
};

export const config = { path: "/api/pedidos/:id" };

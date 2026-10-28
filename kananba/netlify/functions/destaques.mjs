// GET /api/destaques → o item mais pedido de cada tópico (ou a sugestão da casa, enquanto há poucos pedidos)
import { lerRanking, json } from "../lib/comum.mjs";
import { CARDAPIO, COMBOS, DESTAQUES_CASA } from "../../public/loja.mjs";

const MINIMO_PEDIDOS = 8;

export default async () => {
  let r = { pedidos: 0, itens: {} };
  try { r = await lerRanking(); } catch {}
  const real = (r.pedidos || 0) >= MINIMO_PEDIDOS;
  const grupos = {
    combos: COMBOS.map((c) => c.id),
    espetos: CARDAPIO.filter((c) => c.grupo === "espetos").map((c) => c.id),
    acomp: CARDAPIO.filter((c) => c.grupo === "acomp" && !c.oculto).map((c) => c.id),
    bebidas: CARDAPIO.filter((c) => c.grupo === "bebidas" && c.preco != null).map((c) => c.id)
  };
  const ids = {};
  for (const [g, lista] of Object.entries(grupos)) {
    const top = lista.map((id) => [id, r.itens?.[id] || 0]).sort((a, b) => b[1] - a[1])[0];
    ids[g] = real && top && top[1] > 0 ? top[0] : DESTAQUES_CASA[g] || null;
  }
  const resp = json({ fonte: real ? "pedidos" : "casa", ids });
  resp.headers.set("cache-control", "public, max-age=300");
  return resp;
};

export const config = { path: "/api/destaques" };

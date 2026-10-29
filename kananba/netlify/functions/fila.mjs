// GET /api/fila → quantos pedidos estão na fila agora e a previsão de tempo (mostrado antes de pedir)
import { json, listarDia, diaDeTrabalho, previsao, ATIVOS_FILA } from "../lib/comum.mjs";

export default async () => {
  let n = 0;
  try { n = (await listarDia(diaDeTrabalho())).filter((p) => ATIVOS_FILA.includes(p.status)).length; } catch {}
  const r = json({ naFila: n, entrega: previsao(n, "Entrega"), retirada: previsao(n, "Retirada") });
  r.headers.set("cache-control", "no-store");
  return r;
};

export const config = { path: "/api/fila" };

// GET /api/config → o que o site precisa saber para mostrar o pagamento com cartão (a Public Key é pública por natureza)
import { json, cartaoConfigurado, mpPublicKey } from "../lib/comum.mjs";

export default async () => {
  const r = json({ cartao: cartaoConfigurado(), publicKey: cartaoConfigurado() ? mpPublicKey() : null });
  r.headers.set("cache-control", "public, max-age=60");
  return r;
};

export const config = { path: "/api/config" };

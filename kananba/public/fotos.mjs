// Fotos do cardápio (públicas, só leitura)
// GET /api/fotos         → { fotos: { idDoItem: versao } }
// GET /api/foto/:id?v=N  → a imagem
import { getStore } from "@netlify/blobs";

export const lojaFotos = () => getStore({ name: "fotos", consistency: "strong" });

export default async (req, context) => {
  const s = lojaFotos();
  const id = context.params.id;
  if (!id) {
    const indice = (await s.get("_indice", { type: "json" })) || {};
    return new Response(JSON.stringify({ fotos: indice }), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" }
    });
  }
  if (!/^[a-z0-9_-]{1,40}$/.test(id)) return new Response("Não encontrada", { status: 404 });
  const r = await s.getWithMetadata(`img/${id}`, { type: "arrayBuffer" });
  if (!r) return new Response("Não encontrada", { status: 404 });
  const versionada = new URL(req.url).searchParams.has("v");
  return new Response(r.data, {
    headers: {
      "content-type": r.metadata?.tipo || "image/jpeg",
      "cache-control": versionada ? "public, max-age=31536000, immutable" : "public, max-age=60"
    }
  });
};

export const config = { path: ["/api/fotos", "/api/foto/:id"] };

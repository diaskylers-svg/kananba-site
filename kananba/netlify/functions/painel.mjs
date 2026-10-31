// Bastidores: precisa da senha do painel (variável PAINEL_SENHA na Netlify)
// GET  /api/painel/pedidos?dia=AAAA-MM-DD  → pedidos do dia
// POST /api/painel/status {id, status}     → muda o status do pedido
import { getStore } from "@netlify/blobs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { CARDAPIO, COMBOS, json, erro, senhaOk, diaDeTrabalho, listarDia, lerPedido, salvarPedido, conferirPix, marcar, mpConfigurado, loja, chaveDe, registrarVenda, lojaGestao, listarPrefixo, txt, centavos } from "../lib/comum.mjs";

const PROXIMOS = {
  novo: ["em_preparo", "cancelado"],
  em_preparo: ["saiu", "pronto", "cancelado"],
  saiu: ["concluido", "cancelado"],
  pronto: ["concluido", "cancelado"],
  aguardando_pagamento: ["cancelado"],
  concluido: [],
  cancelado: []
};

/* ---------- equipe: o dono (senha do painel) é o único Master; funcionários entram com nome + PIN ---------- */
const NIVEIS = ["gerente", "atendente"];
// o que cada nível pode fazer (Master pode tudo)
const PERMISSOES = {
  atendente: new Set(["ping", "pedidos", "status"]),           // ver e andar com os pedidos (sem cancelar)
  gerente: new Set(["ping", "pedidos", "status", "cancelar", "excluir", "limpar", "foto", "foto-remover"])
};
const normNome = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
const hashPin = (sal, pin) => createHash("sha256").update(`${sal}:${pin}`).digest("hex");
const lerEquipe = async () => (await lojaGestao().get("equipe", { type: "json" })) || [];
const salvarEquipe = (lista) => lojaGestao().setJSON("equipe", lista);
const semPin = ({ pinHash, sal, falhas, bloqueadoAte, ...f }) => ({ ...f, bloqueado: !!(bloqueadoAte && Date.parse(bloqueadoAte) > Date.now()) });

async function autenticar(req) {
  let bruto = req.headers.get("x-painel-usuario") || "";
  try { bruto = decodeURIComponent(bruto); } catch {}
  const nome = normNome(bruto);
  if (!nome) {
    const ok = senhaOk(req);
    if (ok === null) return { erro: erro("Defina a variável PAINEL_SENHA na Netlify para usar o painel.", 503) };
    return ok ? { quem: { nome: "Dono", nivel: "master" } } : { erro: erro("Senha incorreta", 401) };
  }
  const pin = req.headers.get("x-painel-senha") || "";
  const equipe = await lerEquipe();
  const f = equipe.find((x) => normNome(x.nome) === nome);
  if (!f || !f.ativo) return { erro: erro("Nome ou PIN incorreto", 401) };
  if (f.bloqueadoAte && Date.parse(f.bloqueadoAte) > Date.now()) return { erro: erro("Muitas tentativas erradas. Tente de novo em 15 minutos ou peça ao dono.", 429) };
  const certo = timingSafeEqual(Buffer.from(hashPin(f.sal, pin)), Buffer.from(f.pinHash));
  if (!certo) {
    // trava depois de 5 erros seguidos (PIN de 4 dígitos é curto)
    f.falhas = (f.falhas || 0) + 1;
    if (f.falhas >= 5) { f.falhas = 0; f.bloqueadoAte = new Date(Date.now() + 15 * 60e3).toISOString(); }
    await salvarEquipe(equipe);
    return { erro: erro("Nome ou PIN incorreto", 401) };
  }
  if (f.falhas || f.bloqueadoAte) { f.falhas = 0; f.bloqueadoAte = null; await salvarEquipe(equipe); }
  return { quem: { id: f.id, nome: f.nome, nivel: f.nivel } };
}

// registro de ações dos funcionários (o que o dono faz não entra)
async function registrar(quem, acao, detalhe) {
  if (quem.nivel === "master") return;
  const agora = new Date();
  const id = `${diaDeTrabalho(agora)}/${agora.toISOString()}_${Math.random().toString(36).slice(2, 7)}`;
  await lojaGestao().setJSON(`registro/${id}`, { quando: agora.toISOString(), quem: quem.nome, quemId: quem.id, nivel: quem.nivel, acao, detalhe: txt(detalhe, 200) });
}

const ROTULO = { novo: "Novo", em_preparo: "Na brasa", saiu: "Saiu para entrega", pronto: "Pronto", concluido: "Concluído", cancelado: "Cancelado", aguardando_pagamento: "Aguardando pagamento" };

export default async (req, context) => {
  const acao = context.params["0"] || context.params.acao;
  const auth = await autenticar(req);
  if (auth.erro) return auth.erro;
  const quem = auth.quem;
  const pode = (a) => quem.nivel === "master" || PERMISSOES[quem.nivel]?.has(a);
  if (!pode(acao)) return erro("Seu nível de acesso não permite isso. Fale com o dono.", 403);

  if (req.method === "GET" && acao === "ping") return json({ ok: true, pixAtivo: mpConfigurado(), quem });

  /* ---- equipe (só o dono) ---- */
  if (req.method === "GET" && acao === "equipe") return json({ equipe: (await lerEquipe()).map(semPin) });
  if (req.method === "POST" && acao === "equipe-salvar") {
    let b; try { b = await req.json(); } catch { return erro("Requisição inválida"); }
    const nome = txt(b.nome, 40).trim().replace(/\s+/g, " ");
    if (!nome) return erro("Informe o nome do funcionário.");
    if (!NIVEIS.includes(b.nivel)) return erro("Escolha o nível de acesso.");
    const pin = b.pin == null || b.pin === "" ? null : String(b.pin);
    if (pin !== null && !/^\d{4}$/.test(pin)) return erro("O PIN precisa ter 4 números.");
    const equipe = await lerEquipe();
    if (equipe.some((x) => x.id !== b.id && normNome(x.nome) === normNome(nome))) return erro("Já existe um funcionário com esse nome.");
    let f = b.id ? equipe.find((x) => x.id === b.id) : null;
    if (b.id && !f) return erro("Funcionário não encontrado", 404);
    if (!f) {
      if (!pin) return erro("Defina um PIN de 4 números.");
      f = { id: randomBytes(5).toString("hex"), criadoEm: new Date().toISOString(), ativo: true };
      equipe.push(f);
    }
    f.nome = nome; f.nivel = b.nivel;
    if (typeof b.ativo === "boolean") f.ativo = b.ativo;
    if (pin) { f.sal = randomBytes(8).toString("hex"); f.pinHash = hashPin(f.sal, pin); f.falhas = 0; f.bloqueadoAte = null; }
    await salvarEquipe(equipe);
    return json({ ok: true, equipe: equipe.map(semPin) });
  }
  if (req.method === "POST" && acao === "equipe-remover") {
    let b; try { b = await req.json(); } catch { return erro("Requisição inválida"); }
    const equipe = (await lerEquipe()).filter((x) => x.id !== b.id);
    await salvarEquipe(equipe);
    return json({ ok: true, equipe: equipe.map(semPin) });
  }
  if (req.method === "GET" && acao === "registro") {
    const q = new URL(req.url).searchParams.get("dia");
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(q || "") ? q : diaDeTrabalho();
    const itens = (await listarPrefixo(`registro/${dia}/`)).sort((a, z) => z.quando.localeCompare(a.quando));
    return json({ dia, registro: itens });
  }

  if (req.method === "GET" && acao === "pedidos") {
    const q = new URL(req.url).searchParams.get("dia");
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(q || "") ? q : diaDeTrabalho();
    let lista = await listarDia(dia);
    // backup do aviso automático: confere Pix pendentes recentes direto no Mercado Pago
    const pendentes = lista.filter((p) => ["pendente", "recusado"].includes(p.pagamento.status)).slice(0, 8);
    if (pendentes.length) await Promise.all(pendentes.map(conferirPix));
    return json({ dia, hoje: diaDeTrabalho(), pixAtivo: mpConfigurado(), pedidos: lista });
  }

  if (req.method === "POST" && acao === "status") {
    let b; try { b = await req.json(); } catch { return erro("Requisição inválida"); }
    const p = await lerPedido(b.id);
    if (!p) return erro("Pedido não encontrado", 404);
    if (!(PROXIMOS[p.status] || []).includes(b.status)) return erro(`Não dá para ir de "${p.status}" para "${b.status}".`, 409);
    if (b.status === "cancelado" && !pode("cancelar")) return erro("Só o gerente ou o dono podem cancelar pedidos.", 403);
    if (b.status === "em_preparo" && p.pagamento.status === "pendente") return erro("Esse pedido ainda não foi pago.", 409);
    if (b.status === "em_preparo") {
      // fila: só libera o pedido mais antigo que está esperando
      const antes = (await listarDia(p.id.slice(0, 10))).filter((x) => x.status === "novo" && x.id !== p.id && x.criadoEm < p.criadoEm);
      if (antes.length) return erro(`Siga a fila: libere antes o pedido #${antes.sort((a, z) => a.criadoEm.localeCompare(z.criadoEm))[0].codigo}.`, 409);
    }
    p.status = b.status;
    marcar(p, b.status);
    await salvarPedido(p);
    if (p.status === "concluido") await registrarVenda(p);
    await registrar(quem, b.status === "cancelado" ? "Cancelou pedido" : "Mudou status", `#${p.codigo}: ${ROTULO[b.status] || b.status}`);
    return json({ ok: true, pedido: p });
  }

  /* ---- limpar pedidos concluídos e cancelados do dia (vendas concluídas ficam guardadas na gestão) ---- */
  if (req.method === "POST" && acao === "limpar") {
    let b; try { b = await req.json(); } catch { b = {}; }
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(b.dia || "") ? b.dia : diaDeTrabalho();
    const lista = await listarDia(dia);
    let concluidos = 0, cancelados = 0;
    for (const p of lista) {
      if (p.status === "concluido") { await registrarVenda(p); await loja().delete(chaveDe(p.id)); concluidos++; }
      else if (p.status === "cancelado") { await loja().delete(chaveDe(p.id)); cancelados++; }
    }
    if (concluidos || cancelados) await registrar(quem, "Limpou pedidos", `Dia ${dia}: ${concluidos} concluído(s), ${cancelados} cancelado(s)`);
    return json({ ok: true, concluidos, cancelados });
  }

  /* ---- excluir UM pedido finalizado (some do painel e do "Meus pedidos" do cliente) ---- */
  if (req.method === "POST" && acao === "excluir") {
    let b; try { b = await req.json(); } catch { return erro("Requisição inválida"); }
    if (!/^\d{4}-\d{2}-\d{2}_[a-z0-9]+$/i.test(b.id || "")) return erro("Pedido não encontrado", 404);
    const p = await lerPedido(b.id);
    if (!p) return erro("Pedido não encontrado", 404);
    if (!["concluido", "cancelado"].includes(p.status)) return erro("Só dá para excluir pedido concluído ou cancelado. Cancele o pedido antes.", 409);
    // concluído: por padrão a venda continua na Gestão; com manterVenda=false (ex.: pedido de teste) sai de lá também
    const chaveVenda = `venda/${p.id.slice(0, 10)}/${p.id}`;
    if (p.status === "concluido" && b.manterVenda !== false) await registrarVenda(p);
    else await lojaGestao().delete(chaveVenda);
    await loja().delete(chaveDe(p.id));
    await registrar(quem, "Excluiu pedido", `#${p.codigo} (${ROTULO[p.status]}, ${p.total.toFixed(2).replace(".", ",")})${p.status === "concluido" ? (b.manterVenda !== false ? " · venda mantida na Gestão" : " · tirado da Gestão") : ""}`);
    return json({ ok: true });
  }

  /* ---- gestão: vendas, insumos, lucro e contas a pagar ---- */
  if (req.method === "GET" && acao === "gestao") {
    const q = new URL(req.url).searchParams.get("mes");
    const mes = /^\d{4}-\d{2}$/.test(q || "") ? q : diaDeTrabalho().slice(0, 7);
    const [vendas, insumos] = await Promise.all([listarPrefixo(`venda/${mes}`), listarPrefixo(`insumo/${mes}/`)]);
    // contas a pagar de meses anteriores continuam aparecendo
    const pendentes = (await listarPrefixo("insumo/")).filter((i) => !i.pago && !i.id.startsWith(mes));
    return json({ mes, vendas, insumos, pendentesAntigos: pendentes });
  }
  /* ---- cadastro: insumos (preço por kg/L/un), preparos e fichas técnicas ---- */
  if (req.method === "GET" && acao === "cadastro") {
    return json({ cadastro: (await lojaGestao().get("cadastro", { type: "json" })) || null });
  }
  if (req.method === "POST" && acao === "cadastro") {
    const texto = await req.text();
    if (texto.length > 400000) return erro("Cadastro grande demais.", 413);
    let c; try { c = JSON.parse(texto).cadastro; } catch { return erro("Requisição inválida"); }
    if (!c || !Array.isArray(c.insumos) || typeof c.fichas !== "object" || typeof c.preparos !== "object") return erro("Cadastro inválido");
    c.insumos = c.insumos.slice(0, 400).map((i) => ({ id: txt(i.id, 60), nome: txt(i.nome, 80), cat: txt(i.cat, 40) || "Outros",
      un: ["kg", "L", "un"].includes(i.un) ? i.un : "un", preco: i.preco == null || i.preco === "" ? null : centavos(Number(i.preco)) }))
      .filter((i) => i.id && i.nome);
    await lojaGestao().setJSON("cadastro", c);
    return json({ ok: true });
  }

  if (req.method === "POST" && acao === "insumo") {
    let b; try { b = await req.json(); } catch { return erro("Requisição inválida"); }
    const data = /^\d{4}-\d{2}-\d{2}$/.test(b.data || "") ? b.data : diaDeTrabalho();
    const valor = centavos(Number(String(b.valor).replace(",", ".")));
    if (!(valor > 0)) return erro("Informe o valor da compra.");
    const descricao = txt(b.descricao, 80); if (!descricao) return erro("Informe o que foi comprado.");
    const id = `${data.slice(0, 7)}/${data}_${Date.now().toString(36)}`;
    const ins = { id, data, descricao, categoria: txt(b.categoria, 30) || "Outros", qtd: txt(b.qtd, 30) || null,
      valor, pago: !!b.pago, vencimento: b.pago ? null : (/^\d{4}-\d{2}-\d{2}$/.test(b.vencimento || "") ? b.vencimento : null),
      fornecedor: txt(b.fornecedor, 60) || null, criadoEm: new Date().toISOString() };
    // compra ligada a um insumo cadastrado: atualiza o preço por kg/L/un usado no cálculo do custo
    const qn = Number(String(b.quantidade ?? "").replace(",", "."));
    if (b.insumoId && qn > 0) {
      const g = lojaGestao(); const cad = (await g.get("cadastro", { type: "json" })) || null;
      ins.insumoId = txt(b.insumoId, 60); ins.quantidade = qn;
      if (cad) {
        const alvo = cad.insumos.find((x) => x.id === ins.insumoId);
        if (alvo) { alvo.preco = centavos(valor / qn); await g.setJSON("cadastro", cad); ins.precoUnit = alvo.preco; ins.un = alvo.un; }
      } else ins.precoPendente = centavos(valor / qn);
    }
    await lojaGestao().setJSON(`insumo/${id}`, ins);
    return json({ ok: true, insumo: ins });
  }
  if (req.method === "POST" && (acao === "insumo-pago" || acao === "insumo-remover")) {
    let b; try { b = await req.json(); } catch { return erro("Requisição inválida"); }
    if (!/^\d{4}-\d{2}\/\d{4}-\d{2}-\d{2}_[a-z0-9]+$/.test(b.id || "")) return erro("Compra não encontrada", 404);
    const s = lojaGestao(), k = `insumo/${b.id}`;
    if (acao === "insumo-remover") { await s.delete(k); return json({ ok: true }); }
    const ins = await s.get(k, { type: "json" }); if (!ins) return erro("Compra não encontrada", 404);
    ins.pago = !!b.pago; ins.pagoEm = ins.pago ? new Date().toISOString() : null;
    await s.setJSON(k, ins);
    return json({ ok: true, insumo: ins });
  }


  /* ---- fotos do cardápio ---- */
  if (req.method === "POST" && (acao === "foto" || acao === "foto-remover")) {
    let b; try { b = await req.json(); } catch { return erro("Requisição inválida"); }
    const valido = new Set([...CARDAPIO.map((c) => c.id), ...COMBOS.map((c) => c.id)]);
    if (!valido.has(b.id)) return erro("Item do cardápio não encontrado.", 404);
    const s = getStore({ name: "fotos", consistency: "strong" });
    const indice = (await s.get("_indice", { type: "json" })) || {};
    if (acao === "foto-remover") {
      await s.delete(`img/${b.id}`);
      delete indice[b.id];
    } else {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(b.imagem || "");
      if (!m) return erro("Formato de imagem inválido. Use JPG, PNG ou WEBP.");
      const bytes = Buffer.from(m[2], "base64");
      if (bytes.length > 2.5 * 1024 * 1024) return erro("Imagem muito grande (máximo 2,5 MB).", 413);
      await s.set(`img/${b.id}`, bytes, { metadata: { tipo: m[1] } });
      indice[b.id] = Date.now();
    }
    await s.setJSON("_indice", indice);
    const nomeItem = [...CARDAPIO, ...COMBOS].find((c) => c.id === b.id)?.nome || b.id;
    await registrar(quem, acao === "foto" ? "Trocou foto" : "Removeu foto", nomeItem);
    return json({ ok: true, fotos: indice });
  }

  return erro("Não encontrado", 404);
};

export const config = { path: "/api/painel/:acao" };

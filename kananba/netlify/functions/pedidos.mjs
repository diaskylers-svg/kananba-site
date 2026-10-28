// POST /api/pedidos  → cria o pedido (e o Pix, se for o caso)
import {
  NEGOCIO, CARDAPIO, COMBOS, json, erro, so, txt, novoId, novoToken, codigoDe, cpfValido, centavos,
  salvarPedido, marcar, mpConfigurado, mpCriarPix, visaoCliente
} from "../lib/comum.mjs";

export default async (req) => {
  if (req.method !== "POST") return erro("Método não permitido", 405);
  let b;
  try { b = await req.json(); } catch { return erro("Pedido inválido"); }

  /* ---- itens: o servidor recalcula tudo a partir do cardápio ---- */
  const lista = Array.isArray(b.itens) ? b.itens.slice(0, 30) : [];
  const itens = [];
  for (const i of lista) {
    const combo = COMBOS.find((c) => c.id === i?.id);
    if (combo) {
      const sab = i.sabores && typeof i.sabores === "object" ? i.sabores : {};
      let soma = 0; const partes = []; const limpo = {};
      for (const [sid, n] of Object.entries(sab)) {
        const e = CARDAPIO.find((c) => c.id === sid && c.grupo === "espetos");
        const q = Math.floor(Number(n));
        if (!e || !(q >= 1 && q <= combo.espetos)) return erro("Sabor inválido no combo. Atualize a página e tente de novo.");
        soma += q; limpo[e.id] = q; partes.push(`${q}× ${e.nome}`);
      }
      if (soma !== combo.espetos) return erro(`O combo precisa ter exatamente ${combo.espetos} espetos.`);
      const extras = [...new Set(Array.isArray(i.extras) ? i.extras : [])];
      let precoExtras = 0; const nomesExtras = [];
      for (const xid of extras) {
        const x = (combo.adicionais || []).includes(xid) && CARDAPIO.find((c) => c.id === xid);
        if (!x) return erro("Adicional inválido no combo. Atualize a página e tente de novo.");
        precoExtras += x.preco; nomesExtras.push(`+ ${x.nome}`);
      }
      const precoCombo = centavos(combo.preco + precoExtras);
      const detalhe = partes.join(", ") + (nomesExtras.length ? ` · ${nomesExtras.join(", ")}` : "");
      itens.push({ id: combo.id, combo: true, nome: combo.nome, detalhe, sabores: limpo, extras, qtd: 1, preco: precoCombo, total: precoCombo, ponto: null, obs: txt(i.obs, 300) || null });
      continue;
    }
    const prod = CARDAPIO.find((c) => c.id === i?.id);
    const qtd = Math.floor(Number(i?.qtd));
    if (!prod || !(qtd >= 1 && qtd <= 50)) return erro("Tem um item inválido no pedido. Atualize a página e tente de novo.");
    const completo = !!i.completo && prod.precoCompleto != null;
    const preco = completo ? prod.precoCompleto : prod.preco;
    if (preco == null) return erro(`O preço de "${prod.nome}" ainda não foi definido.`);
    const nome = completo ? `${prod.nome} · Completinho` : (prod.precoCompleto != null ? `${prod.nome} · só o espeto` : prod.nome);
    itens.push({ id: prod.id, completo, nome, qtd, preco, total: centavos(preco * qtd), ponto: txt(i.ponto, 40) || null, obs: txt(i.obs, 300) || null });
  }
  if (!itens.length) return erro("Seu pedido está vazio.");

  /* ---- cliente ---- */
  const c = b.cliente || {};
  const cliente = {
    nome: txt(c.nome, 80),
    cpf: so(c.cpf),
    tel: so(c.tel),
    telWhats: !!c.telWhats
  };
  if (cliente.nome.length < 2) return erro("Informe seu nome.");
  if (!cpfValido(cliente.cpf)) return erro("CPF inválido.");
  if (cliente.tel.length < 10 || cliente.tel.length > 11) return erro("Informe um celular com DDD.");

  /* ---- entrega ---- */
  const modo = b.entrega?.modo === "Retirada" && NEGOCIO.retirada ? "Retirada" : "Entrega";
  const e = b.entrega || {};
  const entrega = { modo };
  if (modo === "Entrega") {
    Object.assign(entrega, {
      cep: so(e.cep).slice(0, 8), cidade: txt(e.cidade, 60), rua: txt(e.rua, 120),
      numero: e.semNumero ? "s/n" : txt(e.numero, 15), complemento: txt(e.complemento, 80),
      bairro: txt(e.bairro, 60), referencia: txt(e.referencia, 150)
    });
    if (!entrega.rua || !entrega.numero || !entrega.bairro) return erro("Endereço incompleto.");
  }

  /* ---- pagamento ---- */
  const forma = NEGOCIO.pagamentos.includes(b.pagamento?.forma) ? b.pagamento.forma : null;
  if (!forma) return erro("Escolha a forma de pagamento.");
  const taxa = modo === "Entrega" ? (NEGOCIO.taxaEntrega ?? 0) : 0;
  const subtotal = centavos(itens.reduce((s, i) => s + i.total, 0));
  const total = centavos(subtotal + taxa);
  const pagamento = { forma, status: forma === "Pix" ? "pendente" : "na_entrega" };
  if (forma === "Dinheiro" && b.pagamento?.troco) pagamento.troco = txt(b.pagamento.troco, 20);

  const id = novoId();
  const pedido = {
    id, codigo: codigoDe(id), token: novoToken(),
    criadoEm: new Date().toISOString(),
    status: forma === "Pix" ? "aguardando_pagamento" : "novo",
    cliente, entrega, itens, obsGeral: txt(b.obsGeral, 400) || null,
    subtotal, taxa, total, pagamento, historico: []
  };
  marcar(pedido, pedido.status);

  if (forma === "Pix") {
    if (!mpConfigurado()) return erro("O pagamento por Pix ainda não foi configurado. Escolha outra forma de pagamento.", 503);
    try {
      const pix = await mpCriarPix(pedido, Netlify.env.get("URL") || new URL(req.url).origin);
      Object.assign(pedido.pagamento, pix);
    } catch (err) {
      return erro("Não conseguimos gerar o Pix agora. Tente de novo em instantes ou escolha outra forma de pagamento.", 502);
    }
  }

  await salvarPedido(pedido);
  return json({ ok: true, token: pedido.token, pedido: visaoCliente(pedido) }, 201);
};

export const config = { path: "/api/pedidos" };

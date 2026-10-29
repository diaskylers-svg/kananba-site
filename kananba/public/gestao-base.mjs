/* =========================================================
   GESTÃO — insumos, preparos e fichas técnicas (padrão inicial)
   Tudo aqui é só o PONTO DE PARTIDA: no painel (📊 Gestão) o dono
   ajusta preços e quantidades, e o que ele salvar passa a valer.
   Quantidades das fichas: kg → em gramas · L → em ml · un → unidades
   ========================================================= */
import { CARDAPIO, COMBOS } from "./loja.mjs";

const I = (id, nome, cat, un) => ({ id, nome, cat, un, preco: null });

export const INSUMOS_PADRAO = [
  // Carnes e frangos
  I("coxao-mole", "Coxão mole", "Carnes", "kg"),
  I("alcatra", "Alcatra", "Carnes", "kg"),
  I("paleta", "Paleta", "Carnes", "kg"),
  I("peito-frango", "Frango (peito/filé)", "Carnes", "kg"),
  I("coracao-frango", "Coração de frango", "Carnes", "kg"),
  I("asa-frango", "Asa de frango", "Carnes", "kg"),
  I("toscana", "Linguiça toscana", "Carnes", "kg"),
  I("calabresa", "Calabresa", "Carnes", "kg"),
  I("bacon-espeto", "Bacon (para envolver no espeto)", "Carnes", "kg"),
  I("charque", "Charque (tempero do feijão)", "Carnes", "kg"),
  I("bacon-feijao", "Bacon (tempero do feijão)", "Carnes", "kg"),
  // Grãos e farinhas
  I("arroz", "Arroz", "Mercearia", "kg"),
  I("feijao", "Feijão", "Mercearia", "kg"),
  I("farinha", "Farinha de mandioca", "Mercearia", "kg"),
  // Hortifruti
  I("cebola", "Cebola", "Hortifruti", "kg"),
  I("alho", "Alho", "Hortifruti", "kg"),
  I("tomate", "Tomate", "Hortifruti", "kg"),
  I("coentro", "Coentro", "Hortifruti", "kg"),
  I("limao", "Limão", "Hortifruti", "kg"),
  I("goiaba", "Goiaba (polpa/fruta)", "Hortifruti", "kg"),
  I("maracuja", "Maracujá (polpa/fruta)", "Hortifruti", "kg"),
  I("acerola", "Acerola (polpa/fruta)", "Hortifruti", "kg"),
  // Temperos
  I("sal", "Sal", "Temperos", "kg"),
  I("sazon", "Sazon", "Temperos", "kg"),
  I("cominho", "Cominho", "Temperos", "kg"),
  I("louro", "Louro (folhas)", "Temperos", "un"),
  I("pimenta-reino", "Pimenta-do-reino", "Temperos", "kg"),
  I("colorau", "Colorau", "Temperos", "kg"),
  I("shoyu", "Shoyu", "Temperos", "L"),
  I("vinagre", "Vinagre", "Temperos", "L"),
  I("oleo", "Óleo", "Temperos", "L"),
  I("manteiga", "Manteiga", "Temperos", "kg"),
  I("tempero-especial", "Tempero especial KANANBA (produção própria)", "Temperos", "kg"),
  // Embalagens
  I("marmita-rasa", "Marmita rasa", "Embalagens", "un"),
  I("marmita-redonda", "Marmita redonda", "Embalagens", "un"),
  I("marmita-quadrada", "Marmita quadrada", "Embalagens", "un"),
  I("garrafinha", "Garrafinha de suco", "Embalagens", "un"),
  I("canudo", "Canudo", "Embalagens", "un"),
  I("palito", "Palito de espeto", "Embalagens", "un"),
  I("sache-brinde", "Sachê do tempero especial (brinde)", "Embalagens", "un"),
  // Energia
  I("carvao", "Carvão", "Carvão e gás", "kg"),
  I("gas", "Gás (botijão — cadastre o preço por kg)", "Carvão e gás", "kg")
];

// Bebidas de revenda: cada uma vira um insumo próprio (custo = preço que você paga por unidade)
for (const b of CARDAPIO.filter((c) => c.grupo === "bebidas" && c.sub !== "sucos")) {
  INSUMOS_PADRAO.push({ id: "rev-" + b.id, nome: b.nome, cat: "Bebidas (revenda)", un: "un", preco: null });
}

/* Preparos: receitas intermediárias usadas por vários produtos (valem por 1 porção) */
export const PREPAROS_PADRAO = {
  tempero: { nome: "Tempero do churrasco (1 espeto)", itens: [["sal", 2], ["alho", 3], ["cebola", 5], ["oleo", 5], ["pimenta-reino", 0.3], ["cominho", 0.3], ["colorau", 0.5], ["sazon", 1], ["shoyu", 3], ["limao", 5], ["tempero-especial", 2]] },
  baiao:   { nome: "Baião (1 porção)", itens: [["arroz", 60], ["feijao", 50], ["charque", 20], ["bacon-feijao", 15], ["cebola", 15], ["alho", 3], ["coentro", 3], ["manteiga", 5], ["oleo", 5], ["sal", 2], ["louro", 0.2], ["cominho", 0.3], ["gas", 30]] },
  arroz:   { nome: "Arroz branco (1 porção)", itens: [["arroz", 90], ["oleo", 5], ["alho", 2], ["cebola", 5], ["sal", 2], ["gas", 25]] },
  vinagrete: { nome: "Vinagrete (1 porção)", itens: [["tomate", 50], ["cebola", 25], ["vinagre", 10], ["oleo", 5], ["coentro", 2], ["sal", 1], ["limao", 5]] },
  farofa:  { nome: "Farofa (1 porção)", itens: [["farinha", 40], ["manteiga", 8], ["bacon-feijao", 10], ["cebola", 8], ["sal", 1], ["gas", 5]] }
};

/* Fichas dos produtos vendidos. "@x" = usa o preparo x. Quantidades são ESTIMATIVAS iniciais. */
const espeto = (carnes) => [...carnes, ["@tempero", 1], ["palito", 1], ["carvao", 60], ["marmita-rasa", 1]];
export const FICHAS_PADRAO = {
  coxao: espeto([["coxao-mole", 180]]),
  alcatra: espeto([["alcatra", 180]]),
  paleta: espeto([["paleta", 180]]),
  misto: espeto([["coxao-mole", 90], ["peito-frango", 90]]),
  frango: espeto([["peito-frango", 180]]),
  frangobacon: espeto([["peito-frango", 140], ["bacon-espeto", 50]]),
  coracao: espeto([["coracao-frango", 180]]),
  asa: espeto([["asa-frango", 250]]),
  toscana: espeto([["toscana", 180]]),
  calabresa: espeto([["calabresa", 160]]),
  // o que o Completinho soma ao espeto
  completo: [["@baiao", 1], ["@vinagrete", 1], ["@farofa", 1], ["marmita-redonda", 1]],
  baiao: [["@baiao", 1], ["marmita-redonda", 1]],
  arroz: [["@arroz", 1], ["marmita-redonda", 1]],
  vinagrete: [["@vinagrete", 1]],
  farofa: [["@farofa", 1]],
  // parte fixa dos combos (os espetos escolhidos são somados à parte)
  combo4: [["@baiao", 3], ["@vinagrete", 2], ["@farofa", 2], ["marmita-quadrada", 2]],
  combo3: [["@baiao", 2], ["@vinagrete", 2], ["@farofa", 1], ["marmita-quadrada", 2]],
  combo2: [["@baiao", 1], ["marmita-quadrada", 1]],
  // vai em todo pedido
  pedido: [["sache-brinde", 1]]
};
for (const b of CARDAPIO.filter((c) => c.grupo === "bebidas")) {
  if (b.sub === "sucos") {
    const fruta = { "Goiaba": "goiaba", "Maracujá": "maracuja", "Acerola": "acerola" }[b.nomeCurto] || "goiaba";
    FICHAS_PADRAO[b.id] = [[fruta, 100], ["garrafinha", 1], ["canudo", 1]];
  } else FICHAS_PADRAO[b.id] = [["rev-" + b.id, 1]];
}

export function cadastroPadrao() {
  return { insumos: INSUMOS_PADRAO.map((i) => ({ ...i })), preparos: JSON.parse(JSON.stringify(PREPAROS_PADRAO)), fichas: JSON.parse(JSON.stringify(FICHAS_PADRAO)) };
}
// junta o que o dono salvou com o padrão (itens novos do cardápio entram sozinhos)
export function mesclarCadastro(salvo) {
  const base = cadastroPadrao();
  if (!salvo) return base;
  const ins = [...(salvo.insumos || [])];
  for (const i of base.insumos) if (!ins.some((x) => x.id === i.id)) ins.push(i);
  return { insumos: ins, preparos: { ...base.preparos, ...(salvo.preparos || {}) }, fichas: { ...base.fichas, ...(salvo.fichas || {}) } };
}

/* ---------- cálculos ---------- */
export const unidadeUso = (un) => (un === "kg" ? "g" : un === "L" ? "ml" : "un");
const fator = (un) => (un === "kg" || un === "L" ? 1000 : 1);

// soma o consumo de insumos (em unidade de uso) de uma lista [ref, qtd] multiplicada por n
export function consumo(lista, cad, n = 1, acc = {}, prof = 0) {
  if (prof > 4) return acc;
  for (const [ref, q] of lista || []) {
    const qt = Number(q) * n;
    if (!qt) continue;
    if (ref.startsWith("@")) consumo(cad.preparos[ref.slice(1)]?.itens, cad, qt, acc, prof + 1);
    else acc[ref] = (acc[ref] || 0) + qt;
  }
  return acc;
}
export function custoDeConsumo(cons, cad) {
  let total = 0, faltaPreco = [];
  for (const [id, q] of Object.entries(cons)) {
    const i = cad.insumos.find((x) => x.id === id);
    if (!i || i.preco == null) { faltaPreco.push(id); continue; }
    total += (q / fator(i.un)) * i.preco;
  }
  return { total, faltaPreco };
}
// consumo de um item vendido (como gravado no pedido)
export function consumoItem(item, cad, acc = {}) {
  const f = cad.fichas;
  if (COMBOS.some((c) => c.id === item.id)) {
    consumo(f[item.id], cad, 1, acc);
    for (const [sid, n] of Object.entries(item.sabores || {})) consumo(f[sid], cad, n, acc);
    for (const x of item.extras || []) consumo(f[x], cad, 1, acc);
  } else {
    consumo(f[item.id], cad, item.qtd, acc);
    if (item.completo) consumo(f.completo, cad, item.qtd, acc);
  }
  return acc;
}
export function consumoVenda(venda, cad, acc = {}) {
  for (const it of venda.itens) consumoItem(it, cad, acc);
  consumo(cad.fichas.pedido, cad, 1, acc);
  return acc;
}
// custo de 1 unidade de um produto do cardápio (para a tabela de margens)
export function custoProduto(id, cad, completo = false) {
  const acc = consumo(cad.fichas[id], cad, 1, {});
  if (completo) consumo(cad.fichas.completo, cad, 1, acc);
  return custoDeConsumo(acc, cad);
}

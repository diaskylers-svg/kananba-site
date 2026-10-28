/* =========================================================
   CONFIGURAÇÃO DA LOJA — KANANBA
   Este arquivo é usado pelo site E pelo servidor.
   Os preços cobrados no Pix saem DAQUI (o servidor recalcula
   tudo, o cliente não consegue mudar o valor pelo navegador).
   ========================================================= */

export const NEGOCIO = {
  nome: "KANANBA",
  whatsapp: "5548996124773",   // usado só no botão de sugestões
  taxaEntrega: 5,              // ⚠ PROVISÓRIO — taxa fixa em reais
  taxaDescricao: "Taxa fixa de entrega.",
  completinhoDesc: "+ baião, vinagrete e farofa",
  horario: "17h30 às 0h30",
  abre: 17 * 60 + 30,          // minutos do dia (17h30)
  fecha: 30,                   // 0h30
  retirada: true,
  pagamentos: ["Pix", "Cartão na entrega", "Dinheiro"],
  pixExpiraMin: 30             // tempo para o cliente pagar o Pix
};

// preco = só o espeto · precoCompleto = Completinho (espeto + baião, vinagrete e farofa)
// semCombo: true = não aparece para escolher nos combos
export const CARDAPIO = [
  { id: "coxao",     grupo: "espetos", nome: "Coxão mole", desc: "Carne macia, temperada do jeito da casa.", preco: 17, precoCompleto: 23, carne: true },
  { id: "alcatra",   grupo: "espetos", nome: "Alcatra",    desc: "Corte nobre, macio e suculento.",          preco: 23, precoCompleto: 29, carne: true, semCombo: true },
  { id: "paleta",    grupo: "espetos", nome: "Paleta",     desc: "Corte suculento, com sabor marcante.",    preco: 17, precoCompleto: 23, carne: true },
  { id: "misto",     grupo: "espetos", nome: "Misto",      desc: "Carne e frango intercalados.",            preco: 17, precoCompleto: 23, carne: true },
  { id: "frango",    grupo: "espetos", nome: "Frango",     desc: "Cubos de frango dourados na brasa.",      preco: 17, precoCompleto: 23, carne: false },
  { id: "frangobacon", grupo: "espetos", nome: "Frango com bacon", curto: "Fr. bacon", desc: "Frango envolto em bacon, crocante na brasa.", preco: 19, precoCompleto: 25, carne: false },
  { id: "coracao",   grupo: "espetos", nome: "Coração de frango", desc: "Coraçõezinhos temperados, no ponto certo.", preco: 17, precoCompleto: 23, carne: false, curto: "Coração" },
  { id: "asa",       grupo: "espetos", nome: "Asas de frango", desc: "Asinhas temperadas, douradas na brasa.",  preco: 19, precoCompleto: 25, carne: false },
  { id: "toscana",   grupo: "espetos", nome: "Linguiça toscana", curto: "Toscana", desc: "Linguiça suculenta, assada na hora.",  preco: 17, precoCompleto: 23, carne: false },
  { id: "calabresa", grupo: "espetos", nome: "Calabresa",  desc: "Calabresa defumada, tostadinha na brasa.", preco: 17, precoCompleto: 23, carne: false },
  { id: "baiao",     grupo: "acomp",   nome: "Baião",      desc: "Porção de baião de dois.",                preco: 9 },
  { id: "arroz",     grupo: "acomp",   nome: "Arroz branco", desc: "Porção de arroz branco soltinho.",      preco: 10 },
  // oculto: true = não aparece sozinho no cardápio (só como adicional do Combo 2)
  { id: "vinagrete", grupo: "acomp",   nome: "Vinagrete",  desc: "Porção de vinagrete fresquinho.",         preco: 5, oculto: true },
  { id: "farofa",    grupo: "acomp",   nome: "Farofa",     desc: "Porção de farofa da casa.",               preco: 7, oculto: true },

  // Bebidas: geradas logo abaixo (cada sabor/marca vira um item próprio, já visível no cardápio)
];

/* ===== Bebidas =====
   Para mudar preço, sabor ou marca, edite só esta lista. preco: null = aparece como "Preço em breve". */
const BEBIDAS = [
  { sub: "cervejas", secao: "Cerveja lata 350 ml", id: "cerveja", preco: 7, alcool: true, itens: ["Skol", "Brahma", "Itaipava"] },
  { sub: "refris",   secao: "Refrigerante lata 350 ml", id: "lata", preco: 7,  itens: ["Coca-Cola", "Fanta Laranja", "Guaraná", "Pureza"] },
  { sub: "refris",   secao: "Refrigerante 600 ml",      id: "600",  preco: 10, itens: ["Coca-Cola", "Fanta Laranja", "Guaraná", "Pureza"] },
  { sub: "refris",   secao: "Refrigerante 1,5 L",       id: "15",   preco: 15, itens: ["Coca-Cola", "Fanta Laranja", "Guaraná", "Pureza"] },
  { sub: "sucos",    secao: "Suco",                     id: "suco", preco: 8,  itens: ["Goiaba", "Maracujá", "Manga"] }
];
const slug = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
for (const g of BEBIDAS) for (const nome of g.itens) {
  CARDAPIO.push({ id: `${g.id}-${slug(nome)}`, grupo: "bebidas", sub: g.sub, secao: g.secao, nomeCurto: nome,
    nome: g.sub === "sucos" ? `Suco de ${nome}` : `${nome} ${g.secao.replace(/^(Refrigerante|Cerveja) ?/, "")}`, preco: g.preco, alcool: !!g.alcool });
}

// Combos: o cliente escolhe os sabores dos espetos (a soma tem que dar "espetos").
// adicionais = acompanhamentos opcionais que o cliente pode incluir no combo, pelo preço normal do cardápio
export const COMBOS = [
  { id: "combo4", nome: "Combo 4 espetos + 3 baiões, 2 vinagretes e 2 farofas", desc: "Escolha os 4 sabores. Acompanha 3 porções de baião, 2 de vinagrete e 2 de farofa.", preco: 74.5, espetos: 4 },
  { id: "combo3", nome: "Combo 3 espetos + 2 baiões, 2 vinagretes e 1 farofa", desc: "Escolha os 3 sabores. Acompanha 2 porções de baião, 2 de vinagrete e 1 de farofa.", preco: 58.7, espetos: 3 },
  { id: "combo2", nome: "Combo 2 espetos + 1 baião", desc: "Escolha os 2 sabores. Acompanha 1 porção de baião.", preco: 41.5, espetos: 2, adicionais: ["vinagrete", "farofa"] }
];

// Selos: enquanto não houver pedidos suficientes, o site mostra "Sugestão da casa" nestes itens.
// Depois de alguns pedidos, troca sozinho para "Mais pedido" com base nas vendas reais.
export const DESTAQUES_CASA = { combos: "combo3", espetos: "coxao", acomp: "baiao", bebidas: "lata-coca-cola" };

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
  { id: "frangobacon", grupo: "espetos", nome: "Frango com bacon", curto: "Fr. bacon", desc: "Frango envolto em bacon, crocante na brasa.", preco: 17, precoCompleto: 23, carne: false },
  { id: "coracao",   grupo: "espetos", nome: "Coração de frango", desc: "Coraçõezinhos temperados, no ponto certo.", preco: 17, precoCompleto: 23, carne: false, curto: "Coração" },
  { id: "asa",       grupo: "espetos", nome: "Asas de frango", desc: "Asinhas temperadas, douradas na brasa.",  preco: 17, precoCompleto: 23, carne: false },
  { id: "toscana",   grupo: "espetos", nome: "Linguiça toscana", curto: "Toscana", desc: "Linguiça suculenta, assada na hora.",  preco: 17, precoCompleto: 23, carne: false },
  { id: "calabresa", grupo: "espetos", nome: "Calabresa",  desc: "Calabresa defumada, tostadinha na brasa.", preco: 17, precoCompleto: 23, carne: false },
  { id: "baiao",     grupo: "acomp",   nome: "Baião",      desc: "Porção de baião de dois.",                preco: 9 },
  { id: "arroz",     grupo: "acomp",   nome: "Arroz branco", desc: "Porção de arroz branco soltinho.",      preco: 10 },
  { id: "vinagrete", grupo: "acomp",   nome: "Vinagrete",  desc: "Porção de vinagrete fresquinho.",         preco: 5 },
  { id: "farofa",    grupo: "acomp",   nome: "Farofa",     desc: "Porção de farofa da casa.",               preco: 7 },

  // Bebidas — "opcoes" = sabores para o cliente escolher (o 1º já vem marcado)
  { id: "refri-lata", grupo: "bebidas", nome: "Refrigerante lata",   desc: "Lata 350 ml, bem gelada.",   preco: 7,  opcoes: ["Coca-Cola", "Coca-Cola Zero", "Guaraná Antarctica", "Fanta Laranja"] },
  { id: "refri-600",  grupo: "bebidas", nome: "Refrigerante 600 ml", desc: "Garrafa 600 ml, bem gelada.", preco: 10, opcoes: ["Coca-Cola", "Coca-Cola Zero", "Guaraná Antarctica", "Fanta Laranja"] },
  { id: "refri-15",   grupo: "bebidas", nome: "Refrigerante 1,5 L",  desc: "Garrafa 1,5 L, pra dividir.", preco: 15, opcoes: ["Coca-Cola", "Coca-Cola Zero", "Guaraná Antarctica", "Fanta Laranja"] },
  { id: "suco",       grupo: "bebidas", nome: "Suco",                desc: "Suco gelado.",                preco: 8,  opcoes: ["Laranja", "Uva", "Maracujá"] }
];

// Combos: o cliente escolhe os sabores dos espetos (a soma tem que dar "espetos").
// adicionais = acompanhamentos opcionais que o cliente pode incluir no combo, pelo preço normal do cardápio
export const COMBOS = [
  { id: "combo4", nome: "Combo 4 espetos + 3 baiões, 2 vinagretes e 2 farofas", desc: "Escolha os 4 sabores. Acompanha 3 porções de baião, 2 de vinagrete e 2 de farofa.", preco: 74.5, espetos: 4 },
  { id: "combo3", nome: "Combo 3 espetos + 2 baiões, 2 vinagretes e 1 farofa", desc: "Escolha os 3 sabores. Acompanha 2 porções de baião, 2 de vinagrete e 1 de farofa.", preco: 58.7, espetos: 3 },
  { id: "combo2", nome: "Combo 2 espetos + 1 baião", desc: "Escolha os 2 sabores. Acompanha 1 porção de baião.", preco: 41.5, espetos: 2, adicionais: ["vinagrete", "farofa"] }
];

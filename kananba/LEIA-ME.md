# KANANBA — site de pedidos + bastidores

- `public/index.html` — o site que o cliente usa (kananba.com.br)
- `public/painel.html` — os bastidores (kananba.com.br/painel)
- `public/loja.mjs` — **cardápio, preços, taxa de entrega e horário** (mude aqui)
- `netlify/` — a parte de servidor (pedidos, Pix do Mercado Pago, painel)

## Variáveis na Netlify (Configuração do projeto → Variáveis de ambiente)

| Nome | O que é |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token do Mercado Pago (teste ou produção). Nunca compartilhe. |
| `PAINEL_SENHA` | Senha para entrar em kananba.com.br/painel |
| `MP_PUBLIC_KEY` | Public Key do Mercado Pago (mesma tela do Access Token). Liga o pagamento com cartão de crédito no site. Sem ela, a opção não aparece. |

Depois de mudar uma variável, faça um novo deploy (Implanta → Trigger deploy).

## Comanda da impressora (58 mm)

- `public/comanda-modelo.html` — o desenho das duas vias (sacola e caixa). Edite à mão: textos, ordem, tamanho da letra.
  As palavras entre `{{ }}` são trocadas pelos dados do pedido (a lista está no topo do arquivo).
- Para testar, abra o painel, ligue "🖨 Impressão" e use o botão Imprimir de um pedido.

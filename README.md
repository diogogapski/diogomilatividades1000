# 1000 Atividades BNCC - Landing + Checkout

Landing page com checkout Pix usando a mesma estrutura de API do projeto `paradise-checkout`.

## Rodar localmente

```bash
npm install
npm start
```

Abra:

- Landing: `http://localhost:4177/`
- Checkout: `http://localhost:4177/checkout`

## Pagamento

Por padrão o checkout roda em `AMPLO_MODE=mock`, gerando um Pix simulado para testes.

Para pagamento real, configure as variáveis de ambiente:

- `AMPLO_MODE=live`
- `AMPLO_PUBLIC_KEY`
- `AMPLO_SECRET_KEY`
- `AMPLO_API_URL` (`https://app.amplopay.com/api/v1`)
- `AMPLO_PAYMENT_PATH`
- `POSTBACK_URL`, se necessário

O produto está configurado em `data/settings.json` com preço de `R$17,90`.

## Deploy na Vercel

O projeto está pronto para Vercel com:

- `api/index.js`: função serverless que usa o `server.js`.
- `vercel.json`: rewrites de todas as rotas para a função.
- `.vercelignore`: evita subir `.env`, logs, `node_modules` e dados locais de pedidos.

No painel da Vercel, configure estas Environment Variables em Production:

- `ADMIN_PASSWORD`
- `AMPLO_MODE=live`
- `AMPLO_PUBLIC_KEY`
- `AMPLO_SECRET_KEY`
- `AMPLO_API_URL=https://app.amplopay.com/api/v1`
- `AMPLO_PAYMENT_PATH=/gateway/pix/deposit`
- `POSTBACK_URL`, se necessário

Depois de alterar variáveis de ambiente na Vercel, faça um novo deploy de produção.

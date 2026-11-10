# Pagamento on-line (Mercado Pago)

A loja usa o **Checkout Pro** do Mercado Pago: depois do pedido, a cliente vai para a página segura do
Mercado Pago, paga com Pix (com os 5% de desconto já no total) ou cartão em até 3×, e volta para a página
do pedido. Os dados do cartão nunca passam pela loja.

## Como funciona

1. O site cria o pedido no banco (`place_order`), que recalcula preços, desconto e frete.
2. O site chama a Edge Function `criar-pagamento` com o código e o e-mail do pedido. Ela lê o total do banco
   (`payment_order`) e cria a cobrança no Mercado Pago.
3. Quando o pagamento é aprovado, o Mercado Pago avisa a Edge Function `mercadopago-webhook`. Ela confere a
   assinatura do aviso, consulta o pagamento direto na API do Mercado Pago e só então marca o pedido como
   pago (`confirm_payment`), conferindo o valor.
4. Ninguém marca pedido como pago pelo site, nem a equipe: `payment_order` e `confirm_payment` só aceitam a
   chave secreta, que fica apenas nas Edge Functions.

## Configurar (uma vez)

1. **Conta:** criar a conta do Mercado Pago no nome da Lilian ou da empresa.
2. **Aplicação:** em https://www.mercadopago.com.br/developers, **Suas integrações → Criar aplicação**
   (pagamentos on-line, Checkout Pro).
3. **Webhook:** na aplicação, **Webhooks → Configurar notificações**, com a URL
   `https://iqpjrwjeoaufdfthrsvt.supabase.co/functions/v1/mercadopago-webhook` e o evento **Pagamentos**.
   Copie a **assinatura secreta**.
4. **Segredos no Supabase:** **Edge Functions → Secrets**, adicione:
   - `MP_ACCESS_TOKEN`: o Access Token (primeiro o de **teste**, `TEST-...`; depois o de produção, `APP_USR-...`)
   - `MP_WEBHOOK_SECRET`: a assinatura secreta do webhook
5. **Testar:** abra o site com `?pagamento=teste` (vale só para aquela aba) e faça uma compra com os usuários
   e cartões de teste do Mercado Pago.
6. **Ligar para todo mundo:** troque o token pelo de produção, mude `PAGAMENTO_ONLINE` para `true` em
   `js/config.js` e faça uma compra real de valor baixo.
7. **Parcelas sem juros:** no Mercado Pago, configure o parcelamento sem juros em até 3× (a taxa fica com a loja).
8. **Pedidos esquecidos:** com o pagamento ligado, agende a rotina que cancela pedidos sem pagamento após 48 h
   (ver `docs/backend.md`, passo 6).

## Testes

```bash
deno test --allow-all tests/pagamento.test.ts   # Edge Functions contra um Mercado Pago simulado
bash tools/testar-banco.sh                       # inclui payment_order e confirm_payment
bash tools/testar-loja-real.sh                   # inclui o fluxo do checkout com pagamento ligado
```

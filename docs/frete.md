# Frete real (Melhor Envio)

Na sacola, o site manda o CEP e os itens para a Edge Function `cotar-frete`. Ela monta a embalagem com o
peso, as medidas e o valor declarado guardados no banco (`shipping_package`), cota no Melhor Envio e guarda a
cotação por 2 horas (`save_shipping_quote`). O pedido (`place_order`) só aceita uma cotação guardada, do mesmo
CEP e com os mesmos produtos e quantidades: o preço do frete nunca vem do navegador.

Enquanto o Melhor Envio não estiver configurado, a função responde "indisponível" e o site usa a tabela
provisória por região (`shipping_quotes`), que o servidor confere do mesmo jeito. Nada quebra.

## Configurar (uma vez)

1. **Conta:** criar a conta do Melhor Envio no CNPJ da loja e cadastrar o endereço de envio (origem).
2. **Token:** no painel do Melhor Envio, gerar um **token de acesso** com permissão de **cotação de frete**
   (`shipping-calculate`). Para testar antes, use a conta de testes em https://sandbox.melhorenvio.com.br.
3. **Segredos no Supabase:** em **Edge Functions → Secrets**, adicione:
   - `ME_TOKEN`: o token do passo 2
   - `ORIGEM_CEP`: o CEP de onde os pacotes saem
   - `ME_CONTATO`: um e-mail de contato técnico (vai no User-Agent, como o Melhor Envio pede)
   - `ME_API_URL`: só para testar no sandbox, `https://sandbox.melhorenvio.com.br` (apague para usar o real)
4. **Peso e medidas:** no painel, **Gestão → Produtos e estoque → Embalagem para o frete**, preencha o peso
   (g) e as medidas (cm) de cada produto **já embalado**. Em branco, vale uma embalagem pequena padrão
   (300 g, 16 × 11 × 4 cm).
5. **Serviços e preços:** no painel do Melhor Envio, escolha as transportadoras que a loja usa e, se quiser,
   acréscimos ou descontos. A loja mostra o preço já ajustado (`custom_price`).

## Testes

```bash
deno test --allow-all tests/frete.test.ts   # Edge Function contra um Melhor Envio simulado
bash tools/testar-banco.sh                   # embalagem, cotação guardada e place_order com cotação
bash tools/testar-loja-real.sh               # sacola → checkout → pedido com o frete cotado
```

Os nomes de campos da API do Melhor Envio seguem o formato conhecido do endpoint
`/api/v2/me/shipment/calculate`; confira na primeira cotação no sandbox.

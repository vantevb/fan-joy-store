# Back-end da Fan Joy Store

O site funciona em dois modos, escolhidos pelo arquivo `js/config.js`:

| Modo | Quando | Dados |
|---|---|---|
| Demonstração | `js/config.js` vazio | Salvos só no navegador de quem está usando |
| Loja real | `js/config.js` com URL e chave do Supabase | Banco de dados no Supabase |

O site continua estático (HTML, CSS e JavaScript) e pode ficar no GitHub Pages, na Vercel ou na Netlify. O banco, o login do painel e as regras de segurança ficam no Supabase.

## Como está montado

**Segurança.** O site nunca lê nem grava direto nas tabelas. Todas as tabelas têm RLS ligado e nenhuma permissão para os papéis `anon` (visitante) e `authenticated` (pessoa logada). Todo acesso passa por funções do banco (RPC), e cada função confere quem está chamando.

**Funções públicas (loja):**

| Função | O que faz |
|---|---|
| `catalog()` | Categorias, coleções e produtos (sem peso e medidas) |
| `shipping_quotes(cep, itens, dias)` | Frete **provisório** por faixa de CEP |
| `place_order(...)` | Cria o pedido. Recalcula no servidor os preços, as variações, o limite da personalização, o estoque, o desconto do Pix e o frete. Trava o estoque para não vender a mesma unidade duas vezes. |
| `get_order(código, e-mail)` | Acompanhamento do pedido pela cliente. Exige código **e** e-mail e não mostra endereço nem telefone. |
| `submit_request(...)` | Encomenda personalizada ou orçamento de brindes (mínimo de 20 unidades) |

**Funções do painel** (exigem uma pessoa cadastrada na tabela `staff`): `my_staff_profile`, `admin_products`, `admin_update_product`, `admin_create_product`, `admin_orders`, `admin_set_order_status`, `admin_requests`, `admin_set_request_status`, `admin_dashboard`.

**Automático no banco:**
- Toda mudança de estoque fica registrada em `stock_movements` (venda, cancelamento ou ajuste, com quem fez).
- Toda mudança de status fica em `order_events`. A data de pagamento é preenchida sozinha.
- Cancelar um pedido devolve o estoque. Um pedido cancelado não volta a outro status.
- `cancel_expired_orders(horas)` cancela pedidos sem pagamento e devolve o estoque. **Só deve ser agendada depois que o pagamento on-line estiver ativo** (veja o passo 6).

## Configurar o Supabase (uma vez)

> A conta do Supabase deve ser criada **no nome da Lilian ou da empresa**. A VB Studio entra como membro do projeto.

1. **Criar o projeto** em https://supabase.com, região **South America (São Paulo)**. Guarde a senha do banco num gerenciador de senhas.
2. **Criar as tabelas.** No painel do Supabase, em **SQL Editor**, cole e execute, nesta ordem:
   1. `supabase/migrations/20261107000001_loja.sql`
   2. `supabase/seed.sql` (catálogo inicial)

   Pela linha de comando, com a [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase link` e depois `supabase db push`.
3. **Fechar o cadastro público.** Em **Authentication → Sign In / Providers → Email**, desligue **Allow new users to sign up**. Só a VB Studio cria contas do painel.
4. **Criar a conta da Lilian.**
   1. Em **Authentication → Users → Add user**, informe o e-mail dela e uma senha provisória, com "Auto Confirm User" marcado.
   2. Copie o `User UID` e execute no SQL Editor:
      ```sql
      insert into public.staff (user_id, name, role) values ('UID-DA-LILIAN', 'Lilian', 'dona');
      ```
   3. Para alguém da equipe, use `role = 'equipe'`.
5. **Ligar o site ao banco.** Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** para `js/config.js`. A chave `anon` é pública por natureza. **Nunca** coloque a `service_role` no site.
6. **Depois do pagamento on-line ativo:** em **Database → Extensions**, ligue `pg_cron` e execute:
   ```sql
   select cron.schedule('cancelar-pedidos-sem-pagamento', '15 * * * *', 'select public.cancel_expired_orders(48)');
   ```

## Testes

Os três conjuntos de testes rodam sem conta no Supabase, só com um PostgreSQL local (15 ou mais recente):

```bash
# Banco: segurança, pedidos, estoque, indicadores (54 testes)
bash tools/testar-banco.sh

# Site no modo demonstração (fluxos de compra e de gestão)
python3 -m http.server 8080 &
node tests/e2e.cjs http://localhost:8080

# Site no modo loja real, contra o banco local (13 testes)
bash tools/testar-loja-real.sh
```

O teste do modo real usa `tests/live/bridge.cjs`, uma ponte **só para testes** que imita a API do Supabase. Ela executa cada chamada no PostgreSQL com o papel `anon` ou `authenticated`, como o Supabase faz. Essa ponte nunca vai para produção.

Para regenerar o `seed.sql` depois de mudar `js/data.js`: `node tools/gerar-seed.mjs`.

## O que já está pronto e o que vem depois

| Parte | Situação |
|---|---|
| Banco, regras de segurança e testes | Pronto |
| Login do painel e permissões (dona e equipe) | Pronto |
| Pedidos, estoque, status, rastreio, relatórios e orçamentos no banco | Pronto |
| Pagamento on-line (Pix e cartão) | Pronto, esperando a conta do Mercado Pago. As Edge Functions `criar-pagamento` e `mercadopago-webhook` estão publicadas; falta configurar os segredos e ligar `PAGAMENTO_ONLINE`. Veja [pagamento.md](pagamento.md). |
| Frete real | Próximo. Uma Edge Function consulta o Melhor Envio com o peso e as medidas dos produtos e substitui `shipping_quotes`. As medidas do `seed.sql` são estimativas por categoria. |
| E-mails automáticos | Próximo. Confirmação do pedido, pagamento aprovado e envio com rastreio, pelo Resend ou pelo Brevo, a partir do domínio da loja. |
| Verificação em duas etapas no painel | Próximo. O Supabase oferece autenticador (TOTP). |
| Proteção contra pedidos falsos em massa | Próximo. Captcha (Cloudflare Turnstile) antes de criar pedido ou orçamento, verificado numa Edge Function. |
| Upload de fotos de produtos pelo painel | Próximo. Supabase Storage. |

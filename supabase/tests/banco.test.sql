-- Testes do banco: segurança, pedidos, estoque, painel.
-- Rodar com: bash tools/testar-banco.sh
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;
\o /dev/null

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;
create table tests.results (n serial, name text, ok boolean, detail text);
grant insert, select on tests.results to anon, authenticated, service_role;
grant usage on sequence tests.results_n_seq to anon, authenticated, service_role;

create function tests.ok(cond boolean, name text, detail text default '') returns void language sql as $$
  insert into tests.results (name, ok, detail) values (name, coalesce(cond, false), detail) $$;
create function tests.fails(stmt text, pattern text, name text) returns void language plpgsql as $$
begin
  execute stmt;
  insert into tests.results (name, ok, detail) values (name, false, 'não falhou');
exception when others then
  insert into tests.results (name, ok, detail) values (name, sqlerrm ~* pattern, sqlerrm);
end $$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Pessoas: dona (Lilian) e uma cliente logada que não é da equipe
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'lilian@fanjoy.test'), ('00000000-0000-0000-0000-00000000000b', 'cliente@fanjoy.test');
insert into public.staff values ('00000000-0000-0000-0000-00000000000a', 'Lilian', 'dona');
-- Produtos "antigos" para os indicadores (o seed cria tudo como novo)
update public.products set created_at = now() - interval '120 days' where id not in ('kit-toploader');

-- ================= Visitante (anon) =================
set role anon;
select set_config('request.jwt.claims', '', false);

select tests.fails('select * from public.orders', 'permission denied', 'anon não lê a tabela de pedidos');
select tests.fails('select * from public.products', 'permission denied', 'anon não lê a tabela de produtos direto');
select tests.fails('update public.products set price = 1', 'permission denied', 'anon não altera produtos');
select tests.fails('select public.admin_orders()', 'permission denied', 'anon não executa funções do painel');
select tests.ok(jsonb_array_length(public.catalog()->'products') = 14, 'catálogo público tem os 14 produtos');
select tests.ok(not (public.catalog()->'products'->0 ? 'weightG'), 'catálogo não expõe peso e medidas');
select tests.ok((select p->'en'->>'name' from jsonb_array_elements(public.catalog()->'products') p where p->>'id' = 'caneca-ta-bom') = '“Tá bom!” Mug', 'catálogo traz os textos em inglês');
select tests.ok((select jsonb_array_length(p->'en'->'variations'->0->'options') = jsonb_array_length(p->'variations'->0->'options') from jsonb_array_elements(public.catalog()->'products') p where p->>'id' = 'caneca-ta-bom'), 'opções em inglês casam com as em português');

-- Pedido válido: 2 canecas Mágica com nome + 1 camiseta M off-white, Pix, SEDEX para BH
select set_config('t.o1', (public.place_order(
  '{"name":"Ana Teste","email":"Ana@Exemplo.com","phone":"11999990000"}',
  '{"street":"Rua A","number":"10","city":"Belo Horizonte, MG"}',
  '[{"id":"caneca-ta-bom","qty":2,"options":{"Modelo":"Mágica (revela a arte com calor)"},"personalization":"Lilian","unit":0.01},
    {"id":"camiseta-little-joy","qty":1,"options":{"Tamanho":"M","Cor":"Off-white"}}]',
  '{"cep":"30130-000","service":"sedex"}',
  '{"method":"pix"}'))::text, false);
select tests.ok((current_setting('t.o1')::jsonb->>'total')::numeric = (70.00*2 + 79.90) - 11.00 + (round(21 * 1.3 * 1.7, 1) - 0.1),
  'total recalculado no servidor (variações, desconto Pix, frete)', current_setting('t.o1'));

select tests.fails($$select public.place_order('{"name":"A","email":"a@b.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"caneca-ta-bom","qty":1,"options":{"Modelo":"Ouro"}}]','{"cep":"30130000","service":"pac"}','{"method":"pix"}')$$, 'variacao_invalida', 'variação inexistente é recusada');
select tests.fails($$select public.place_order('{"name":"A","email":"a@b.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"caneca-ta-bom","qty":1}]','{"cep":"30130000","service":"pac"}','{"method":"pix"}')$$, 'variacao_obrigatoria', 'variação obrigatória');
select tests.fails($$select public.place_order('{"name":"A","email":"a@b.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"caneca-ta-bom","qty":1,"options":{"Modelo":"Branca"},"personalization":"Nome comprido demais"}]','{"cep":"30130000","service":"pac"}','{"method":"pix"}')$$, 'personalizacao_invalida', 'personalização acima do limite');
select tests.fails($$select public.place_order('{"name":"A","email":"a@b.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"caneca-ta-bom","qty":15,"options":{"Modelo":"Branca"}}]','{"cep":"30130000","service":"pac"}','{"method":"pix"}')$$, 'estoque_insuficiente', 'não vende além do estoque');
select tests.fails($$select public.place_order('{"name":"A","email":"a@b.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"ecobag-everyday","qty":1}]','{"cep":"30130000","service":"pac"}','{"method":"pix"}')$$, 'produto_indisponivel', 'produto inativo não é vendido');
select tests.fails($$select public.place_order('{"name":"A","email":"a@b.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"wallpaper-fan-joy","qty":1}]','{"cep":"30130000","service":"pac"}','{"method":"pix"}')$$, 'produto_indisponivel', 'freebie não entra em pedido');
select tests.fails($$select public.place_order('{"name":"A","email":"a@b.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"marcadores-dorama","qty":1}]','{"cep":"30130000","service":"retirada"}','{"method":"pix"}')$$, 'frete_invalido', 'retirada só para São Paulo capital');
select tests.fails($$select public.place_order('{"name":"A","email":"a@b.co","phone":"1"}','{}','[{"id":"marcadores-dorama","qty":1}]','{"cep":"30130000","service":"pac"}','{"method":"pix"}')$$, 'endereco_invalido', 'endereço obrigatório para envio');
select tests.fails($$select public.place_order('{"name":"A","email":"a@b.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"marcadores-dorama","qty":1}]','{"cep":"30130000","service":"pac"}','{"method":"cartao","installments":6}')$$, 'parcelas_invalidas', 'máximo de 3 parcelas');
select tests.fails($$select public.place_order('{"name":"A","email":"invalido","phone":"1"}','{"street":"R","number":"1"}','[{"id":"marcadores-dorama","qty":1}]','{"cep":"30130000","service":"pac"}','{"method":"pix"}')$$, 'dados_cliente_invalidos', 'e-mail inválido');

-- Encomenda com retirada em SP e cartão
select set_config('t.o2', (public.place_order('{"name":"Bia","email":"bia@exemplo.com","phone":"11988887777"}', '{}',
  '[{"id":"kit-toploader","qty":1,"options":{"Paleta":"Lilás"}}]', '{"cep":"01310-100","service":"retirada"}',
  '{"method":"cartao","installments":3}'))::text, false);
select tests.ok((current_setting('t.o2')::jsonb->>'total')::numeric = 29.90, 'encomenda com retirada: sem frete e sem desconto no cartão');

select tests.ok(public.get_order(current_setting('t.o1')::jsonb->>'code', 'errado@exemplo.com') is null, 'pedido não aparece com e-mail errado');
select tests.ok(public.get_order(current_setting('t.o1')::jsonb->>'code', ' ANA@exemplo.com ') ->> 'status' = 'aguardando', 'cliente acompanha com código e e-mail');
select tests.ok(public.get_order(current_setting('t.o1')::jsonb->>'code', 'ana@exemplo.com') -> 'address' = 'null'::jsonb, 'acompanhamento não expõe endereço');

select tests.fails($$select public.submit_request('{"type":"orcamento","name":"P","company":"X","email":"p@x.co","qty":10,"message":"oi"}')$$, 'orcamento_invalido', 'orçamento exige 20 unidades');
select tests.ok(public.submit_request('{"type":"orcamento","name":"P","company":"X","email":"p@x.co","qty":40,"message":"Kit fim de ano"}') ? 'code', 'orçamento de 40 unidades registrado');
reset role;

-- ================= Cliente logada (não é equipe) =================
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);
select tests.fails('select public.admin_orders()', 'acesso_negado', 'conta comum não acessa pedidos do painel');
select tests.fails($$select public.admin_update_product('caneca-ta-bom', '{"price":1}')$$, 'acesso_negado', 'conta comum não altera preço');
select tests.ok(public.my_staff_profile() is null, 'conta comum não tem perfil de equipe');
reset role;

-- ================= Lilian (dona) =================
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);
select tests.ok(public.my_staff_profile()->>'role' = 'dona', 'Lilian entra como dona');
select tests.ok(jsonb_array_length(public.admin_orders()) = 2, 'painel lista os pedidos');
select tests.ok((select (p->>'stock')::int from jsonb_array_elements(public.admin_products()) p where p->>'id' = 'caneca-ta-bom') = 12, 'venda baixou o estoque (14 → 12)');
select tests.ok((select (p->>'stock')::int from jsonb_array_elements(public.admin_products()) p where p->>'id' = 'kit-toploader') = 0, 'sob encomenda não mexe em estoque');

select tests.ok(public.admin_set_order_status(current_setting('t.o1')::jsonb->>'code', 'pago')->>'status' = 'pago', 'marca pedido como pago');
select tests.ok(public.admin_set_order_status(current_setting('t.o1')::jsonb->>'code', 'enviado', 'BR123456789BR')->>'trackingCode' = 'BR123456789BR', 'registra código de rastreio');
select tests.ok(public.admin_set_order_status(current_setting('t.o1')::jsonb->>'code', 'cancelado')->>'status' = 'cancelado', 'cancela pedido');
select tests.ok((select (p->>'stock')::int from jsonb_array_elements(public.admin_products()) p where p->>'id' = 'caneca-ta-bom') = 14, 'cancelamento devolve o estoque (12 → 14)');
select tests.fails($$select public.admin_set_order_status('$$ || (current_setting('t.o1')::jsonb->>'code') || $$', 'pago')$$, 'pedido_cancelado', 'pedido cancelado não volta');
select tests.ok(jsonb_array_length(public.admin_orders()->0->'history') >= 1, 'histórico de status registrado');

select tests.ok((public.admin_update_product('camiseta-little-joy', '{"stock":2,"price":19.9}')->>'stock')::int = 2, 'ajusta estoque e preço');
select tests.fails($$select public.admin_update_product('camiseta-little-joy', '{"stock":-1}')$$, 'check', 'estoque não fica negativo');
select tests.ok((select count(*) from jsonb_array_elements(public.admin_products()) p where p->>'id' = 'camiseta-little-joy' and (p->>'price')::numeric = 19.9) = 1, 'preço novo salvo');
select tests.ok(public.admin_update_product('camiseta-little-joy', '{"en":{"name":"Little Joy Tee"}}')->'en'->>'name' = 'Little Joy Tee', 'painel grava o nome em inglês');
select tests.ok((select p->'en'->>'name' from jsonb_array_elements(public.admin_products()) p where p->>'id' = 'camiseta-little-joy') = 'Little Joy Tee' and (select p->>'name' from jsonb_array_elements(public.admin_products()) p where p->>'id' = 'camiseta-little-joy') like 'Camiseta Little Joy%', 'tradução não mexe no nome em português');
select tests.fails($$select public.admin_update_product('camiseta-little-joy', '{"en":"texto solto"}')$$, 'traducao_invalida', 'tradução precisa ser um objeto');
select tests.ok(public.admin_create_product('{"name":"Caneca Fighting","category":"canecas","collection":"dorama-club","price":50,"stock":5}')->>'id' like 'caneca-fighting-%', 'cadastra produto novo');

select set_config('t.dash', public.admin_dashboard(30, '', '')::text, false);
select tests.ok((current_setting('t.dash')::jsonb->>'orderCount')::int = 1, 'indicadores ignoram pedido cancelado', current_setting('t.dash')::jsonb->>'orderCount');
select tests.ok((select r->>'kind' from jsonb_array_elements(current_setting('t.dash')::jsonb->'rows') r where r->>'id' = 'kit-toploader') = 'novo', 'kit de toploaders aparece como novo');
select tests.ok((select r->>'kind' from jsonb_array_elements(current_setting('t.dash')::jsonb->'rows') r where r->>'id' = 'kit-toploader') = 'indisponivel' is false, 'kit de toploaders não é indisponível');
select tests.ok((select r->>'kind' from jsonb_array_elements(current_setting('t.dash')::jsonb->'rows') r where r->>'id' = 'chaveiro-bl') = 'encomenda', 'sob encomenda identificado');
select tests.ok((select r->>'kind' from jsonb_array_elements(current_setting('t.dash')::jsonb->'rows') r where r->>'id' = 'ecobag-everyday') = 'indisponivel', 'inativo identificado');
select tests.ok((select (r->>'qty')::int from jsonb_array_elements(current_setting('t.dash')::jsonb->'rows') r where r->>'id' = 'kit-toploader') = 1, 'quantidade vendida por produto');
select tests.ok(jsonb_array_length(current_setting('t.dash')::jsonb->'weekly') = 5, 'receita por semana (5 semanas em 30 dias)');
select tests.ok(jsonb_array_length(public.admin_requests()) = 1, 'solicitações aparecem no painel');
reset role;

-- Pedido Pix esquecido há 3 dias é cancelado e devolve o estoque
set role anon;
select set_config('request.jwt.claims', '', false);
select set_config('t.o3', (public.place_order('{"name":"Cris","email":"cris@exemplo.com","phone":"1"}', '{"street":"R","number":"1"}',
  '[{"id":"marcadores-dorama","qty":3}]', '{"cep":"30130000","service":"pac"}', '{"method":"pix"}'))::text, false);
reset role;
update public.orders set created_at = now() - interval '3 days' where code = current_setting('t.o3')::jsonb->>'code';
select tests.ok((select stock from public.products where id = 'marcadores-dorama') = 27, 'pedido Pix reservou 3 kits de marcadores (30 → 27)');
select tests.ok(public.cancel_expired_orders(48) = 1, 'rotina cancela 1 pedido sem pagamento há mais de 48 h');
select tests.ok((select stock from public.products where id = 'marcadores-dorama') = 30, 'estoque do pedido expirado volta (27 → 30)');
select tests.ok((select status from public.orders where code = current_setting('t.o2')::jsonb->>'code') = 'aguardando', 'pedido recente continua aguardando');
set role anon;
select tests.fails('select public.cancel_expired_orders(0)', 'permission denied', 'visitante não executa a rotina de cancelamento');
reset role;

select tests.ok((select count(*) from public.stock_movements where reason = 'cancelamento') = 3 and (select count(*) from public.stock_movements where reason = 'venda') = 3
  and (select count(*) from public.stock_movements where reason = 'ajuste') = 1, 'histórico de estoque: vendas, cancelamento e ajuste');

-- ================= Pagamento on-line (Mercado Pago) =================
set role anon;
select tests.fails($$select public.payment_order('X', 'y@z.co')$$, 'permission denied', 'visitante não lê os dados de cobrança');
select tests.fails($$select public.confirm_payment('X', '1', 1)$$, 'permission denied', 'visitante não marca pedido como pago');
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);
select tests.fails($$select public.confirm_payment('X', '1', 1)$$, 'permission denied', 'nem a dona marca pago pela API: só o Mercado Pago confirma');
reset role;
set role service_role;
select tests.ok(public.payment_order(current_setting('t.o2')::jsonb->>'code', 'outra@exemplo.com') is null, 'cobrança exige o e-mail do pedido');
select tests.ok((public.payment_order(current_setting('t.o2')::jsonb->>'code', ' BIA@exemplo.com')->>'total')::numeric = 29.90, 'cobrança usa o total do banco');
select tests.ok(public.confirm_payment(current_setting('t.o2')::jsonb->>'code', 'mp-1', 10) = 'valor_divergente', 'pagamento menor que o total não aprova');
select tests.ok(public.confirm_payment(current_setting('t.o2')::jsonb->>'code', 'mp-2', 29.90) = 'pago', 'pagamento aprovado marca o pedido como pago');
reset role;
select tests.ok((select status = 'pago' and paid_at is not null and payment_ref = 'mp-2' from public.orders where code = current_setting('t.o2')::jsonb->>'code'), 'pedido pago guarda a data e o pagamento');
set role service_role;
select tests.ok(public.confirm_payment(current_setting('t.o2')::jsonb->>'code', 'mp-2', 29.90) = 'ja_confirmado', 'aviso repetido do mesmo pagamento é ignorado');
select tests.ok(public.confirm_payment(current_setting('t.o3')::jsonb->>'code', 'mp-3', 999) = 'pago_apos_cancelamento', 'pagamento de pedido cancelado não reabre o pedido');
reset role;
select tests.ok((select status = 'cancelado' and notes like '%mp-3%devolver%' from public.orders where code = current_setting('t.o3')::jsonb->>'code'), 'pagamento após cancelamento fica anotado para devolução');

-- ================= Frete real (Melhor Envio) =================
set role anon;
select tests.fails($$select public.shipping_package('[{"id":"marcadores-dorama","qty":1}]')$$, 'permission denied', 'visitante não monta a embalagem');
select tests.fails($$select public.save_shipping_quote('30130000', 'x', '[{"id":"a","name":"A","price":1,"days":1}]')$$, 'permission denied', 'visitante não grava cotação de frete');
reset role;
set role service_role;
select set_config('t.pkg', public.shipping_package('[{"id":"caneca-ta-bom","qty":1,"options":{"Modelo":"Mágica (revela a arte com calor)"}},{"id":"caneca-ta-bom","qty":1,"options":{"Modelo":"Branca"}},{"id":"marcadores-dorama","qty":2}]')::text, false);
select tests.ok(current_setting('t.pkg')::jsonb->>'fingerprint' = 'caneca-ta-bom:2,marcadores-dorama:2', 'embalagem soma o mesmo produto em uma linha', current_setting('t.pkg'));
select tests.ok((select (x->>'insurance_value')::numeric = 60 and (x->>'weight')::numeric = 0.4 and (x->>'quantity')::int = 2
  from jsonb_array_elements(current_setting('t.pkg')::jsonb->'products') x where x->>'id' = 'caneca-ta-bom'), 'valor declarado pela média das opções e peso em kg');
select tests.fails($$select public.shipping_package('[{"id":"ecobag-everyday","qty":1}]')$$, 'produto_indisponivel', 'embalagem recusa produto inativo');
select set_config('t.q', public.save_shipping_quote('30130-000', 'marcadores-dorama:1',
  '[{"id":"me-1","name":"Correios PAC","price":18.5,"days":8},{"id":"me-2","name":"Correios SEDEX","price":31.2,"days":4}]')::text, false);
reset role;

set role anon;
select set_config('t.o4', (public.place_order('{"name":"Gabi","email":"gabi@exemplo.com","phone":"1"}', '{"street":"R","number":"1"}',
  '[{"id":"marcadores-dorama","qty":1}]', jsonb_build_object('cep', '30130-000', 'service', 'me-2', 'quote', current_setting('t.q')), '{"method":"cartao","installments":1}'))::text, false);
select tests.ok((current_setting('t.o4')::jsonb->>'total')::numeric = 12.90 + 31.20, 'pedido usa o preço da cotação guardada', current_setting('t.o4'));
select tests.fails(format($$select public.place_order('{"name":"G","email":"g@x.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"marcadores-dorama","qty":2}]','{"cep":"30130000","service":"me-1","quote":"%s"}','{"method":"pix"}')$$, current_setting('t.q')), 'frete_expirado', 'cotação não vale para outra quantidade');
select tests.fails(format($$select public.place_order('{"name":"G","email":"g@x.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"marcadores-dorama","qty":1}]','{"cep":"01310100","service":"me-1","quote":"%s"}','{"method":"pix"}')$$, current_setting('t.q')), 'frete_expirado', 'cotação não vale para outro CEP');
select tests.fails(format($$select public.place_order('{"name":"G","email":"g@x.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"marcadores-dorama","qty":1}]','{"cep":"30130000","service":"me-9","quote":"%s"}','{"method":"pix"}')$$, current_setting('t.q')), 'frete_invalido', 'serviço fora da cotação é recusado');
select tests.fails($$select public.place_order('{"name":"G","email":"g@x.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"marcadores-dorama","qty":1}]','{"cep":"30130000","service":"me-1","quote":"nao-e-um-id"}','{"method":"pix"}')$$, 'frete_expirado', 'código de cotação inválido é recusado');
reset role;
update public.shipping_quote_cache set expires_at = now() - interval '1 minute' where id = current_setting('t.q')::uuid;
set role anon;
select tests.fails(format($$select public.place_order('{"name":"G","email":"g@x.co","phone":"1"}','{"street":"R","number":"1"}','[{"id":"marcadores-dorama","qty":1}]','{"cep":"30130000","service":"me-1","quote":"%s"}','{"method":"pix"}')$$, current_setting('t.q')), 'frete_expirado', 'cotação vencida é recusada');
select tests.fails('select * from public.shipping_quote_cache', 'permission denied', 'visitante não lê as cotações guardadas');
reset role;

\o
\pset format unaligned
\pset tuples_only on
select case when ok then '  ✓ ' else '  ✗ ' end || name || case when ok then '' else E'\n      ' || coalesce(detail, '') end from tests.results order by n;
select E'\n' || count(*) filter (where ok) || ' de ' || count(*) || ' testes passaram.' from tests.results;

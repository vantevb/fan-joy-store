-- Fan Joy Store — frete real pelo Melhor Envio.
-- A Edge Function "cotar-frete" monta a embalagem (shipping_package), cota no Melhor Envio e guarda a
-- cotação no banco (save_shipping_quote). O pedido usa só uma cotação guardada, do mesmo CEP e dos mesmos
-- produtos, dentro do prazo: o preço do frete nunca vem do navegador.

-- Embalagem para cotar: produtos somados por id, peso (kg), medidas (cm) e valor declarado de cada um.
-- Produto sem peso ou medidas cadastrados usa uma embalagem pequena padrão (300 g, 16 × 11 × 4 cm).
create or replace function public.shipping_package(p_items jsonb) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare it jsonb; p public.products; per jsonb := '{}'; extra int := 0; q int; unit numeric; v jsonb; opt jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'sacola_invalida';
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into p from public.products where id = it->>'id';
    if not found or not p.active or p.mode not in ('pronta', 'encomenda') then
      raise exception 'produto_indisponivel:%', it->>'id';
    end if;
    q := coalesce((it->>'qty')::int, 0);
    if q not between 1 and 20 then raise exception 'quantidade_invalida:%', p.id; end if;
    unit := p.price;
    for v in select * from jsonb_array_elements(p.variations) loop
      opt := null;
      select o into opt from jsonb_array_elements(v->'options') o where o->>'label' = it->'options'->>(v->>'name');
      unit := unit + coalesce((opt->>'add')::numeric, 0);
    end loop;
    per := jsonb_set(per, array[p.id], jsonb_build_object(
      'qty', coalesce((per->p.id->>'qty')::int, 0) + q,
      'value', coalesce((per->p.id->>'value')::numeric, 0) + unit * q));
    extra := greatest(extra, p.production_days);
  end loop;
  return jsonb_build_object(
    'fingerprint', (select string_agg(k || ':' || (per->k->>'qty'), ',' order by k) from jsonb_object_keys(per) k),
    'extraDays', extra,
    'items', (select sum((per->k->>'qty')::int) from jsonb_object_keys(per) k),
    'products', (select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'quantity', (per->pr.id->>'qty')::int,
        'weight', round(coalesce(pr.weight_g, 300) / 1000.0, 3),
        'length', coalesce(pr.length_cm, 16), 'width', coalesce(pr.width_cm, 11), 'height', coalesce(pr.height_cm, 4),
        'insurance_value', round((per->pr.id->>'value')::numeric / (per->pr.id->>'qty')::int, 2)) order by pr.id)
      from public.products pr where per ? pr.id));
end $$;

-- Cotações guardadas por 2 horas. Ninguém de fora lê nem grava: só as funções abaixo.
create table if not exists public.shipping_quote_cache (
  id uuid primary key default gen_random_uuid(),
  cep text not null,
  fingerprint text not null,
  quotes jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours'
);
create index if not exists shipping_quote_cache_expires_idx on public.shipping_quote_cache (expires_at);
alter table public.shipping_quote_cache enable row level security;
revoke all on public.shipping_quote_cache from anon, authenticated;

-- quotes: [{ "id", "name", "price", "days" }], com os dias de produção já somados.
create or replace function public.save_shipping_quote(p_cep text, p_fingerprint text, p_quotes jsonb) returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare new_id uuid;
begin
  if jsonb_typeof(p_quotes) <> 'array' or jsonb_array_length(p_quotes) = 0 then raise exception 'frete_invalido'; end if;
  delete from public.shipping_quote_cache where expires_at < now() - interval '1 day';
  insert into public.shipping_quote_cache (cep, fingerprint, quotes)
  values (regexp_replace(p_cep, '\D', '', 'g'), p_fingerprint, p_quotes)
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.place_order(
  p_customer jsonb, p_address jsonb, p_items jsonb, p_shipping jsonb, p_payment jsonb
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  it jsonb; p public.products; v jsonb; opt jsonb; chosen text;
  unit numeric; subtotal numeric := 0; discount numeric := 0; n_items int := 0; extra_days int := 0;
  quotes jsonb; quote jsonb; method text; inst int; order_id uuid; new_code text; total numeric;
  pz text; lines jsonb := '[]';
begin
  -- Cliente
  if coalesce(trim(p_customer->>'name'), '') = '' or coalesce(trim(p_customer->>'phone'), '') = ''
     or coalesce(p_customer->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'dados_cliente_invalidos';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'sacola_invalida';
  end if;
  method := p_payment->>'method';
  if method not in ('pix', 'cartao') then raise exception 'pagamento_invalido'; end if;
  inst := case when method = 'cartao' then coalesce((p_payment->>'installments')::int, 1) else 1 end;
  if inst not between 1 and 3 then raise exception 'parcelas_invalidas'; end if;

  -- Itens: trava as linhas dos produtos para o estoque não ser vendido duas vezes
  for it in select * from jsonb_array_elements(p_items) loop
    select * into p from public.products where id = it->>'id' for update;
    if not found or not p.active or p.mode not in ('pronta', 'encomenda') then
      raise exception 'produto_indisponivel:%', it->>'id';
    end if;
    if coalesce((it->>'qty')::int, 0) not between 1 and 20 then raise exception 'quantidade_invalida:%', p.id; end if;

    unit := p.price;
    for v in select * from jsonb_array_elements(p.variations) loop
      chosen := it->'options'->>(v->>'name');
      if chosen is null then raise exception 'variacao_obrigatoria:%:%', p.id, v->>'name'; end if;
      select o into opt from jsonb_array_elements(v->'options') o where o->>'label' = chosen;
      if opt is null then raise exception 'variacao_invalida:%:%', p.id, v->>'name'; end if;
      unit := unit + coalesce((opt->>'add')::numeric, 0);
    end loop;

    pz := trim(coalesce(it->>'personalization', ''));
    if pz <> '' and (p.personalization is null or length(pz) > (p.personalization->>'max')::int) then
      raise exception 'personalizacao_invalida:%', p.id;
    end if;

    if p.mode = 'pronta' and p.stock < (it->>'qty')::int then
      raise exception 'estoque_insuficiente:%:%', p.id, p.stock;
    end if;

    subtotal := subtotal + unit * (it->>'qty')::int;
    n_items := n_items + (it->>'qty')::int;
    extra_days := greatest(extra_days, p.production_days);
    lines := lines || jsonb_build_object('id', p.id, 'name', p.name, 'mode', p.mode, 'qty', (it->>'qty')::int,
      'unit', unit, 'options', coalesce(it->'options', '{}'), 'personalization', pz);
  end loop;

  -- Frete. Com cotação real (Melhor Envio), usa a cotação guardada pelo servidor, que precisa ser
  -- do mesmo CEP e dos mesmos produtos e quantidades, e ainda valer. Sem ela, usa a tabela provisória.
  if coalesce(p_shipping->>'quote', '') <> '' then
    if p_shipping->>'quote' !~ '^[0-9a-f-]{36}$' then raise exception 'frete_expirado'; end if;
    select c.quotes into quotes from public.shipping_quote_cache c
     where c.id = (p_shipping->>'quote')::uuid
       and c.cep = regexp_replace(coalesce(p_shipping->>'cep', ''), '\D', '', 'g')
       and c.fingerprint = public.shipping_package(p_items)->>'fingerprint'
       and c.expires_at > now();
    if quotes is null then raise exception 'frete_expirado'; end if;
    select q into quote from jsonb_array_elements(quotes) q where q->>'id' = p_shipping->>'service';
  else
    quotes := public.shipping_quotes(p_shipping->>'cep', n_items, extra_days);
    if quotes is null then raise exception 'cep_invalido'; end if;
    select q into quote from jsonb_array_elements(quotes->'quotes') q where q->>'id' = p_shipping->>'service';
  end if;
  if quote is null then raise exception 'frete_invalido'; end if;
  if quote->>'id' <> 'retirada' and (coalesce(trim(p_address->>'street'), '') = '' or coalesce(trim(p_address->>'number'), '') = '') then
    raise exception 'endereco_invalido';
  end if;

  if method = 'pix' then discount := round(subtotal * 0.05, 2); end if;
  total := subtotal - discount + (quote->>'price')::numeric;

  loop
    new_code := 'FJ' || lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.orders where code = new_code);
  end loop;

  insert into public.orders (code, customer_name, customer_email, customer_phone, address,
    shipping_service, shipping_cep, shipping_days, shipping_price, payment_method, installments,
    subtotal, discount, total)
  values (new_code, trim(p_customer->>'name'), lower(trim(p_customer->>'email')), trim(p_customer->>'phone'),
    coalesce(p_address, '{}'), quote->>'name', regexp_replace(p_shipping->>'cep', '\D', '', 'g'),
    (quote->>'days')::int, (quote->>'price')::numeric, method, inst, subtotal, discount, total)
  returning id into order_id;

  insert into public.order_events (order_id, status) values (order_id, 'aguardando');

  perform set_config('app.stock_reason', 'venda', true);
  perform set_config('app.stock_order', order_id::text, true);
  for it in select * from jsonb_array_elements(lines) loop
    insert into public.order_items (order_id, product_id, name, mode, qty, unit_price, options, personalization)
    values (order_id, it->>'id', it->>'name', (it->>'mode')::public.product_mode, (it->>'qty')::int,
            (it->>'unit')::numeric, it->'options', it->>'personalization');
    if it->>'mode' = 'pronta' then
      update public.products set stock = stock - (it->>'qty')::int where id = it->>'id';
    end if;
  end loop;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order', '', true);

  return jsonb_build_object('code', new_code, 'total', total, 'status', 'aguardando');
end $$;

revoke execute on function public.shipping_package(jsonb) from public, anon, authenticated;
revoke execute on function public.save_shipping_quote(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.shipping_package(jsonb) to service_role;
grant execute on function public.save_shipping_quote(text, text, jsonb) to service_role;
grant execute on function public.place_order(jsonb, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;

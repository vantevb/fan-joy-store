-- Fan Joy Store — banco de dados da loja (Supabase / PostgreSQL 15+)
--
-- Regra geral de segurança: o site NUNCA acessa as tabelas diretamente.
-- Todo acesso passa por funções (RPC) que validam permissões e recalculam valores.
-- As tabelas ficam com RLS ligado e sem permissões para anon/authenticated.

-- ============================================================
-- Tipos
-- ============================================================
create type public.product_mode as enum ('pronta', 'encomenda', 'gratis', 'orcamento');
create type public.order_status as enum ('aguardando', 'pago', 'producao', 'enviado', 'entregue', 'cancelado');
create type public.request_type as enum ('encomenda', 'orcamento');
create type public.request_status as enum ('novo', 'respondido', 'aprovado', 'recusado');
create type public.staff_role as enum ('dona', 'equipe');

-- ============================================================
-- Tabelas
-- ============================================================
create table public.categories (
  id text primary key,
  name text not null,
  position int not null default 0
);

create table public.collections (
  id text primary key,
  name text not null,
  tagline text not null default '',
  summary text not null default '',
  concept boolean not null default false,
  image text,
  tone text not null default 'cream',
  position int not null default 0
);

create table public.products (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (length(name) between 2 and 120),
  category_id text not null references public.categories(id),
  collection_id text not null references public.collections(id),
  price numeric(10,2) check (price >= 0),
  mode public.product_mode not null default 'pronta',
  stock int not null default 0 check (stock >= 0),
  low_stock int not null default 0 check (low_stock >= 0),
  production_days int not null default 1 check (production_days >= 0),
  featured boolean not null default false,
  active boolean not null default true,
  short text not null default '',
  description text not null default '',
  details jsonb not null default '[]',
  images jsonb not null default '[]',
  art jsonb,
  -- [{ "name": "Tamanho", "options": [{ "label": "P", "add": 0 }] }]
  variations jsonb not null default '[]',
  -- { "label": "Nome", "max": 12, "placeholder": "..." }
  personalization jsonb,
  -- Embalagem pronta para envio (frete real)
  weight_g int check (weight_g > 0),
  length_cm numeric(5,1) check (length_cm > 0),
  width_cm numeric(5,1) check (width_cm > 0),
  height_cm numeric(5,1) check (height_cm > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_required check (mode in ('gratis', 'orcamento') or price is not null)
);
create index products_category_idx on public.products (category_id);
create index products_collection_idx on public.products (collection_id);

create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role public.staff_role not null default 'equipe',
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default now(),
  status public.order_status not null default 'aguardando',
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  address jsonb not null default '{}',
  shipping_service text not null,
  shipping_cep text not null,
  shipping_days int not null,
  shipping_price numeric(10,2) not null,
  payment_method text not null check (payment_method in ('pix', 'cartao')),
  installments int not null default 1 check (installments between 1 and 3),
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_ref text,
  paid_at timestamptz,
  tracking_code text,
  notes text
);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  name text not null,
  mode public.product_mode not null,
  qty int not null check (qty between 1 and 20),
  unit_price numeric(10,2) not null,
  options jsonb not null default '{}',
  personalization text not null default ''
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  created_at timestamptz not null default now(),
  by_user uuid
);
create index order_events_order_idx on public.order_events (order_id);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id text not null references public.products(id),
  delta int not null,
  reason text not null check (reason in ('venda', 'cancelamento', 'ajuste')),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  by_user uuid
);
create index stock_movements_product_idx on public.stock_movements (product_id);
create index stock_movements_order_idx on public.stock_movements (order_id);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.request_type not null,
  status public.request_status not null default 'novo',
  name text not null,
  company text,
  email text not null,
  phone text,
  cnpj text,
  product text not null,
  qty int not null check (qty >= 1),
  wanted_date date,
  message text not null,
  files jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ============================================================
-- Segurança: RLS ligado e nenhuma permissão direta para o site
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['categories','collections','products','staff','orders','order_items','order_events','stock_movements','requests'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ============================================================
-- Auxiliares
-- ============================================================
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'dona');
$$;

create or replace function public.require_staff() returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_staff() then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
end $$;

create or replace function public.product_json(p public.products) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'category', p.category_id, 'collection', p.collection_id,
    'price', p.price, 'mode', p.mode, 'stock', p.stock, 'lowStock', p.low_stock,
    'productionDays', p.production_days, 'featured', p.featured, 'active', p.active,
    'short', p.short, 'description', p.description, 'details', p.details, 'images', p.images,
    'art', p.art, 'variations', p.variations, 'personalization', p.personalization,
    'weightG', p.weight_g, 'lengthCm', p.length_cm, 'widthCm', p.width_cm, 'heightCm', p.height_cm,
    'createdAt', (extract(epoch from p.created_at) * 1000)::bigint
  );
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end $$;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Registra no histórico toda mudança de estoque.
-- A venda e o cancelamento informam o motivo pela variável de sessão app.stock_reason.
create or replace function public.log_stock_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.stock is distinct from old.stock then
    insert into public.stock_movements (product_id, delta, reason, order_id, by_user)
    values (new.id, new.stock - old.stock,
            coalesce(nullif(current_setting('app.stock_reason', true), ''), 'ajuste'),
            nullif(current_setting('app.stock_order', true), '')::uuid,
            auth.uid());
  end if;
  return new;
end $$;
create trigger products_stock_log after update of stock on public.products
  for each row execute function public.log_stock_change();

-- Histórico de status, data de pagamento e devolução de estoque no cancelamento.
create or replace function public.on_order_status() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare it record;
begin
  if new.status is distinct from old.status then
    -- Pedido cancelado não volta: o estoque já foi devolvido. Um novo pedido deve ser feito.
    if old.status = 'cancelado' then raise exception 'pedido_cancelado'; end if;
    insert into public.order_events (order_id, status, by_user) values (new.id, new.status, auth.uid());
    if new.status = 'pago' and new.paid_at is null then new.paid_at = now(); end if;
    if new.status = 'cancelado' then
      perform set_config('app.stock_reason', 'cancelamento', true);
      perform set_config('app.stock_order', new.id::text, true);
      for it in
        select product_id, -sum(delta)::int as back from public.stock_movements
        where order_id = new.id group by product_id having sum(delta) < 0
      loop
        update public.products set stock = stock + it.back where id = it.product_id;
      end loop;
      perform set_config('app.stock_reason', '', true);
      perform set_config('app.stock_order', '', true);
    end if;
  end if;
  return new;
end $$;
create trigger orders_status before update of status on public.orders
  for each row execute function public.on_order_status();

-- ============================================================
-- Funções públicas (loja)
-- ============================================================

-- Catálogo visível na loja (produtos ativos e inativos, para mostrar "indisponível").
create or replace function public.catalog() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by position) from public.categories), '[]'),
    'collections', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'tagline', tagline, 'summary', summary, 'concept', concept, 'image', image, 'tone', tone) order by position) from public.collections), '[]'),
    'products', coalesce((select jsonb_agg(public.product_json(p) - 'weightG' - 'lengthCm' - 'widthCm' - 'heightCm' order by p.created_at) from public.products p), '[]')
  );
$$;

-- Frete PROVISÓRIO por faixa de CEP. Será substituído pela cotação do Melhor Envio.
create or replace function public.shipping_quotes(p_cep text, p_items int, p_extra_days int)
returns jsonb language plpgsql immutable set search_path = public, pg_temp as $$
declare
  d text := regexp_replace(coalesce(p_cep, ''), '\D', '', 'g');
  n int; base numeric; days int; region text; w numeric; q jsonb;
begin
  if length(d) <> 8 then return null; end if;
  n := substring(d, 1, 5)::int;
  if n between 1000 and 5999 then region := 'São Paulo capital'; base := 12; days := 2;
  elsif n < 20000 then region := 'Estado de São Paulo'; base := 16; days := 3;
  elsif n < 40000 then region := 'Sudeste'; base := 21; days := 5;
  elsif n < 80000 then region := 'Nordeste e Centro-Oeste'; base := 29; days := 8;
  else region := 'Sul e Norte'; base := 27; days := 7;
  end if;
  w := 1 + greatest(0, p_items - 1) * 0.15;
  q := jsonb_build_array(
    jsonb_build_object('id', 'pac', 'name', 'PAC', 'price', round(base * w, 1) - 0.1, 'days', days + 3 + p_extra_days),
    jsonb_build_object('id', 'sedex', 'name', 'SEDEX', 'price', round(base * w * 1.7, 1) - 0.1, 'days', greatest(1, days - 1) + p_extra_days)
  );
  if region = 'São Paulo capital' then
    q := jsonb_build_array(jsonb_build_object('id', 'retirada', 'name', 'Retirada combinada em São Paulo', 'price', 0, 'days', p_extra_days)) || q;
  end if;
  return jsonb_build_object('region', region, 'quotes', q);
end $$;

-- Cria o pedido. Recalcula preços, variações, personalização, estoque, desconto e frete no servidor.
-- p_items: [{ "id": "caneca-ta-bom", "qty": 2, "options": { "Modelo": "Mágica" }, "personalization": "Lilian" }]
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

  -- Frete recalculado no servidor
  quotes := public.shipping_quotes(p_shipping->>'cep', n_items, extra_days);
  if quotes is null then raise exception 'cep_invalido'; end if;
  select q into quote from jsonb_array_elements(quotes->'quotes') q where q->>'id' = p_shipping->>'service';
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

-- Dados do pedido para a cliente. Exige o código e o e-mail usado na compra.
create or replace function public.order_json(o public.orders, with_customer_contact boolean) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'code', o.code, 'createdAt', (extract(epoch from o.created_at) * 1000)::bigint, 'status', o.status,
    'customer', jsonb_build_object('name', o.customer_name, 'email', o.customer_email)
      || case when with_customer_contact then jsonb_build_object('phone', o.customer_phone, 'city', o.address->>'city') else '{}' end,
    'address', case when with_customer_contact then o.address else null end,
    'shipping', jsonb_build_object('name', o.shipping_service, 'days', o.shipping_days, 'price', o.shipping_price, 'cep', o.shipping_cep),
    'payment', jsonb_build_object('method', o.payment_method, 'installments', o.installments),
    'subtotal', o.subtotal, 'discount', o.discount, 'shippingPrice', o.shipping_price, 'total', o.total,
    'trackingCode', o.tracking_code, 'notes', case when with_customer_contact then o.notes else null end,
    'origin', 'loja',
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.product_id, 'name', i.name, 'qty', i.qty, 'unit', i.unit_price,
        'options', i.options, 'personalization', i.personalization) order by i.id) from public.order_items i where i.order_id = o.id), '[]'),
    'history', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'at', (extract(epoch from e.created_at) * 1000)::bigint) order by e.id)
        from public.order_events e where e.order_id = o.id), '[]')
  );
$$;

create or replace function public.get_order(p_code text, p_email text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select public.order_json(o, false) from public.orders o
  where o.code = upper(trim(p_code)) and o.customer_email = lower(trim(p_email));
$$;

-- Encomendas personalizadas e orçamentos de brindes
create or replace function public.submit_request(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare t public.request_type; q int; new_code text;
begin
  t := (p->>'type')::public.request_type;
  q := coalesce((p->>'qty')::int, 0);
  if coalesce(trim(p->>'name'), '') = '' or coalesce(trim(p->>'message'), '') = ''
     or coalesce(p->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'dados_invalidos';
  end if;
  if length(p->>'message') > 1000 then raise exception 'mensagem_longa'; end if;
  if t = 'orcamento' and (q < 20 or coalesce(trim(p->>'company'), '') = '') then raise exception 'orcamento_invalido'; end if;
  if q < 1 then raise exception 'quantidade_invalida'; end if;
  loop
    new_code := 'R-' || lpad((floor(random() * 100000))::int::text, 5, '0');
    exit when not exists (select 1 from public.requests where code = new_code);
  end loop;
  insert into public.requests (code, type, name, company, email, phone, cnpj, product, qty, wanted_date, message, files)
  values (new_code, t, trim(p->>'name'), nullif(trim(p->>'company'), ''), lower(trim(p->>'email')), nullif(trim(p->>'phone'), ''),
          nullif(trim(p->>'cnpj'), ''), coalesce(nullif(trim(p->>'product'), ''), 'Não informado'), q,
          nullif(p->>'date', '')::date, trim(p->>'message'), coalesce(p->'files', '[]'));
  return jsonb_build_object('code', new_code);
end $$;

-- ============================================================
-- Funções do painel (exigem pessoa da equipe logada)
-- ============================================================
create or replace function public.my_staff_profile() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('name', name, 'role', role) from public.staff where user_id = auth.uid();
$$;

create or replace function public.admin_products() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.require_staff();
  return coalesce((select jsonb_agg(public.product_json(p) order by p.created_at) from public.products p), '[]');
end $$;

-- Atualiza campos permitidos de um produto.
create or replace function public.admin_update_product(p_id text, p_patch jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare p public.products;
begin
  perform public.require_staff();
  update public.products set
    price = case when p_patch ? 'price' then (p_patch->>'price')::numeric else price end,
    stock = case when p_patch ? 'stock' then (p_patch->>'stock')::int else stock end,
    low_stock = case when p_patch ? 'lowStock' then (p_patch->>'lowStock')::int else low_stock end,
    mode = case when p_patch ? 'mode' and p_patch->>'mode' in ('pronta', 'encomenda') and mode in ('pronta', 'encomenda')
                then (p_patch->>'mode')::public.product_mode else mode end,
    active = case when p_patch ? 'active' then (p_patch->>'active')::boolean else active end,
    featured = case when p_patch ? 'featured' then (p_patch->>'featured')::boolean else featured end,
    production_days = case when p_patch ? 'productionDays' then (p_patch->>'productionDays')::int else production_days end,
    weight_g = case when p_patch ? 'weightG' then nullif(p_patch->>'weightG', '')::int else weight_g end,
    length_cm = case when p_patch ? 'lengthCm' then nullif(p_patch->>'lengthCm', '')::numeric else length_cm end,
    width_cm = case when p_patch ? 'widthCm' then nullif(p_patch->>'widthCm', '')::numeric else width_cm end,
    height_cm = case when p_patch ? 'heightCm' then nullif(p_patch->>'heightCm', '')::numeric else height_cm end
  where id = p_id
  returning * into p;
  if not found then raise exception 'produto_nao_encontrado'; end if;
  return public.product_json(p);
end $$;

create or replace function public.admin_create_product(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare new_id text; r public.products;
begin
  perform public.require_staff();
  new_id := coalesce(nullif(p->>'id', ''),
    left(trim(both '-' from regexp_replace(lower(translate(p->>'name', 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')), '[^a-z0-9]+', '-', 'g')), 50)
    || '-' || substr(md5(random()::text), 1, 4));
  insert into public.products (id, name, category_id, collection_id, price, mode, stock, low_stock, production_days,
    short, description, details, art, personalization)
  values (new_id, trim(p->>'name'), p->>'category', p->>'collection', (p->>'price')::numeric,
    coalesce(p->>'mode', 'pronta')::public.product_mode, coalesce((p->>'stock')::int, 0), coalesce((p->>'lowStock')::int, 3),
    coalesce((p->>'productionDays')::int, 3), coalesce(p->>'short', ''), coalesce(p->>'description', ''),
    coalesce(p->'details', '[]'), coalesce(p->'art', '{"kind":"default","bg":"cream"}'), p->'personalization')
  returning * into r;
  return public.product_json(r);
end $$;

create or replace function public.admin_orders(p_status text default null, p_query text default null, p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.require_staff();
  return coalesce((
    select jsonb_agg(public.order_json(o, true) order by o.created_at desc)
    from (select * from public.orders o
          where (p_status is null or p_status = '' or o.status::text = p_status)
            and (p_query is null or p_query = '' or o.code ilike '%' || p_query || '%' or o.customer_name ilike '%' || p_query || '%')
          order by o.created_at desc limit least(greatest(p_limit, 1), 500)) o
  ), '[]');
end $$;

create or replace function public.admin_set_order_status(p_code text, p_status text, p_tracking text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare o public.orders;
begin
  perform public.require_staff();
  update public.orders set status = p_status::public.order_status,
    tracking_code = coalesce(nullif(trim(p_tracking), ''), tracking_code)
  where code = p_code returning * into o;
  if not found then raise exception 'pedido_nao_encontrado'; end if;
  return public.order_json(o, true);
end $$;

create or replace function public.admin_requests() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.require_staff();
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.code, 'type', r.type, 'status', r.status, 'name', r.name,
      'company', r.company, 'email', r.email, 'phone', r.phone, 'cnpj', r.cnpj, 'product', r.product, 'qty', r.qty,
      'date', r.wanted_date, 'message', r.message, 'files', r.files,
      'createdAt', (extract(epoch from r.created_at) * 1000)::bigint) order by r.created_at desc)
    from public.requests r), '[]');
end $$;

create or replace function public.admin_set_request_status(p_code text, p_status text) returns void
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  perform public.require_staff();
  update public.requests set status = p_status::public.request_status where code = p_code;
  if not found then raise exception 'solicitacao_nao_encontrada'; end if;
end $$;

-- Indicadores do painel. Mesma regra da demonstração:
--   novo = menos de 30 dias no catálogo; encomenda = sob encomenda; indisponivel = inativo ou pronta entrega sem estoque.
--   "por semana" usa só os dias em que o produto existia no período.
create or replace function public.admin_dashboard(p_days int default 30, p_category text default null, p_collection text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare since timestamptz := now() - make_interval(days => greatest(p_days, 1)); weeks int := greatest(1, ceil(p_days / 7.0)::int);
begin
  perform public.require_staff();
  return (
    with scope as (
      select * from public.products p
      where p.mode in ('pronta', 'encomenda')
        and (p_category is null or p_category = '' or p.category_id = p_category)
        and (p_collection is null or p_collection = '' or p.collection_id = p_collection)
    ),
    sold as (
      select i.product_id, i.qty, i.unit_price, o.id as order_id, o.created_at
      from public.order_items i join public.orders o on o.id = i.order_id
      where o.created_at >= since and o.status <> 'cancelado' and i.product_id in (select id from scope)
    ),
    per_product as (
      select s.id, coalesce(sum(x.qty), 0)::int as qty, coalesce(sum(x.qty * x.unit_price), 0)::numeric(12,2) as revenue,
        floor(extract(epoch from now() - s.created_at) / 86400)::int as age_days,
        case
          when not s.active or (s.mode = 'pronta' and s.stock <= 0) then 'indisponivel'
          when now() - s.created_at < interval '30 days' then 'novo'
          when s.mode = 'encomenda' then 'encomenda'
          else 'regular'
        end as kind
      from scope s left join sold x on x.product_id = s.id
      group by s.id, s.created_at, s.active, s.mode, s.stock
    )
    select jsonb_build_object(
      'rows', coalesce((select jsonb_agg(jsonb_build_object(
          'id', pp.id, 'qty', pp.qty, 'revenue', pp.revenue, 'kind', pp.kind, 'ageDays', pp.age_days,
          'daysListed', greatest(1, least(p_days, pp.age_days)),
          'perWeek', round(pp.qty::numeric / greatest(1, least(p_days, pp.age_days)) * 7, 2))) from per_product pp), '[]'),
      'revenue', (select coalesce(sum(qty * unit_price), 0) from sold),
      'items', (select coalesce(sum(qty), 0) from sold),
      'orderCount', (select count(distinct order_id) from sold),
      'weekly', (select jsonb_agg(jsonb_build_object(
          'start', (extract(epoch from since + make_interval(days => w * 7)) * 1000)::bigint,
          'revenue', coalesce((select sum(qty * unit_price) from sold
                               where least(weeks - 1, floor(extract(epoch from created_at - since) / 604800)::int) = w), 0)) order by w)
          from generate_series(0, weeks - 1) w)
    )
  );
end $$;

-- ============================================================
-- Rotina: cancela pedidos sem pagamento e devolve o estoque
-- Agendar SÓ depois que o pagamento on-line estiver ativo (ver docs/backend.md):
--   select cron.schedule('cancelar-pedidos-sem-pagamento', '15 * * * *', 'select public.cancel_expired_orders(48)');
-- ============================================================
create or replace function public.cancel_expired_orders(p_hours int default 48) returns int
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare n int;
begin
  update public.orders
     set status = 'cancelado',
         notes = concat_ws(E'\n', notes, format('Cancelado automaticamente: pagamento não confirmado em %s horas.', p_hours))
   where status = 'aguardando' and created_at < now() - make_interval(hours => p_hours);
  get diagnostics n = row_count;
  return n;
end $$;

-- ============================================================
-- Permissões de execução
-- ============================================================
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.catalog() to anon, authenticated;
grant execute on function public.shipping_quotes(text, int, int) to anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.get_order(text, text) to anon, authenticated;
grant execute on function public.submit_request(jsonb) to anon, authenticated;

grant execute on function public.my_staff_profile() to authenticated;
grant execute on function public.admin_products() to authenticated;
grant execute on function public.admin_update_product(text, jsonb) to authenticated;
grant execute on function public.admin_create_product(jsonb) to authenticated;
grant execute on function public.admin_orders(text, text, int) to authenticated;
grant execute on function public.admin_set_order_status(text, text, text) to authenticated;
grant execute on function public.admin_requests() to authenticated;
grant execute on function public.admin_set_request_status(text, text) to authenticated;
grant execute on function public.admin_dashboard(int, text, text) to authenticated;

-- Funções novas também nascem fechadas
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

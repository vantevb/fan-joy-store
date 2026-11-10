-- Fan Joy Store — versão em inglês da loja.
-- Cada produto guarda os textos em inglês em i18n->'en':
--   { "name", "short", "description", "details": [...], "variations": [{ "name", "options": [...] }],
--     "personalization": { "label", "placeholder" }, "alts": [...], "artText" }
-- As variações em inglês são só para exibição, casadas por posição: o pedido continua enviando
-- os rótulos em português, que são os validados por place_order.

alter table public.products add column if not exists i18n jsonb not null default '{}';

create or replace function public.product_json(p public.products) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'category', p.category_id, 'collection', p.collection_id,
    'price', p.price, 'mode', p.mode, 'stock', p.stock, 'lowStock', p.low_stock,
    'productionDays', p.production_days, 'featured', p.featured, 'active', p.active,
    'short', p.short, 'description', p.description, 'details', p.details, 'images', p.images,
    'art', p.art, 'variations', p.variations, 'personalization', p.personalization,
    'weightG', p.weight_g, 'lengthCm', p.length_cm, 'widthCm', p.width_cm, 'heightCm', p.height_cm,
    'createdAt', (extract(epoch from p.created_at) * 1000)::bigint,
    'en', p.i18n->'en'
  );
$$;

-- O painel pode gravar os textos em inglês de um produto (chave "en" no patch).
create or replace function public.admin_update_product(p_id text, p_patch jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare p public.products;
begin
  perform public.require_staff();
  if p_patch ? 'en' and jsonb_typeof(p_patch->'en') not in ('object', 'null') then raise exception 'traducao_invalida'; end if;
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
    height_cm = case when p_patch ? 'heightCm' then nullif(p_patch->>'heightCm', '')::numeric else height_cm end,
    i18n = case when p_patch ? 'en' then jsonb_strip_nulls(i18n || jsonb_build_object('en', p_patch->'en')) else i18n end
  where id = p_id
  returning * into p;
  if not found then raise exception 'produto_nao_encontrado'; end if;
  return public.product_json(p);
end $$;

-- Cadastro de produto pelo painel, agora com os textos em inglês opcionais (chave "en").
create or replace function public.admin_create_product(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare new_id text; r public.products;
begin
  perform public.require_staff();
  if p ? 'en' and jsonb_typeof(p->'en') not in ('object', 'null') then raise exception 'traducao_invalida'; end if;
  new_id := coalesce(nullif(p->>'id', ''),
    left(trim(both '-' from regexp_replace(lower(translate(p->>'name', 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')), '[^a-z0-9]+', '-', 'g')), 50)
    || '-' || substr(md5(random()::text), 1, 4));
  insert into public.products (id, name, category_id, collection_id, price, mode, stock, low_stock, production_days,
    short, description, details, art, personalization, i18n)
  values (new_id, trim(p->>'name'), p->>'category', p->>'collection', (p->>'price')::numeric,
    coalesce(p->>'mode', 'pronta')::public.product_mode, coalesce((p->>'stock')::int, 0), coalesce((p->>'lowStock')::int, 3),
    coalesce((p->>'productionDays')::int, 3), coalesce(p->>'short', ''), coalesce(p->>'description', ''),
    coalesce(p->'details', '[]'), coalesce(p->'art', '{"kind":"default","bg":"cream"}'), p->'personalization',
    case when jsonb_typeof(p->'en') = 'object' then jsonb_build_object('en', p->'en') else '{}'::jsonb end)
  returning * into r;
  return public.product_json(r);
end $$;

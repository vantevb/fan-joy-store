// Cota o frete de verdade no Melhor Envio e guarda a cotação no banco.
// Chamada pelo site na sacola, com o CEP e os itens. Peso, medidas e valor declarado vêm do banco
// (shipping_package); o pedido depois só aceita uma cotação guardada aqui (place_order).
// Segredos (Edge Functions > Secrets): ME_TOKEN e ORIGEM_CEP (obrigatórios), ME_API_URL (opcional:
// https://sandbox.melhorenvio.com.br para testar) e ME_CONTATO (e-mail técnico, vai no User-Agent).
// Sem ME_TOKEN ou ORIGEM_CEP, responde 503 e o site usa a tabela provisória de frete.
// Publicada com verify_jwt = false: o site usa a chave publishable, que não é um JWT.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys.default) return keys.default;
  } catch { /* projeto só com as chaves antigas */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

class DbError extends Error { constructor(public code: string) { super(code); } }
async function rpc(name: string, args: Record<string, unknown>) {
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: secretKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new DbError(String(body?.message ?? `banco_${r.status}`));
  return body;
}

const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'metodo_invalido' }, 405);

  const token = Deno.env.get('ME_TOKEN');
  const origin = digits(Deno.env.get('ORIGEM_CEP'));
  if (!token || origin.length !== 8) return json({ error: 'frete_indisponivel' }, 503);

  const { cep, items } = await req.json().catch(() => ({}));
  const to = digits(cep);
  if (to.length !== 8) return json({ error: 'cep_invalido' }, 400);
  if (!Array.isArray(items) || !items.length || items.length > 30) return json({ error: 'sacola_invalida' }, 400);

  // Embalagem montada pelo banco: ninguém informa peso ou valor pelo navegador.
  let pkg;
  try { pkg = await rpc('shipping_package', { p_items: items }); } catch (e) {
    if (e instanceof DbError && /^(produto_indisponivel|quantidade_invalida|sacola_invalida)/.test(e.code)) return json({ error: e.code }, 400);
    console.error(e);
    return json({ error: 'erro_interno' }, 500);
  }

  const api = (Deno.env.get('ME_API_URL') ?? 'https://melhorenvio.com.br').replace(/\/$/, '');
  const r = await fetch(`${api}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': `Fan Joy Store (${Deno.env.get('ME_CONTATO') ?? 'fanjoystore.com.br'})`,
    },
    body: JSON.stringify({
      from: { postal_code: origin },
      to: { postal_code: to },
      products: pkg.products,
      options: { receipt: false, own_hand: false },
    }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(data)) {
    console.error('Melhor Envio recusou a cotação', r.status, JSON.stringify(data));
    return json({ error: 'frete_erro' }, 502);
  }

  // Serviços disponíveis, com os dias de produção e separação somados ao prazo da transportadora.
  const extra = Number(pkg.extraDays) || 0;
  const quotes = data
    .filter((s: any) => !s.error && Number(s.custom_price ?? s.price) > 0)
    .map((s: any) => ({
      id: `me-${s.id}`,
      name: [s.company?.name, s.name].filter(Boolean).join(' '),
      price: Math.round(Number(s.custom_price ?? s.price) * 100) / 100,
      days: Number(s.custom_delivery_time ?? s.delivery_time ?? s.delivery_range?.max ?? 0) + extra,
    }))
    .sort((a: any, b: any) => a.price - b.price);

  // Em São Paulo capital, a retirada combinada continua valendo.
  const n = Number(to.slice(0, 5));
  if (n >= 1000 && n <= 5999) quotes.unshift({ id: 'retirada', name: 'Retirada combinada em São Paulo', price: 0, days: extra });
  if (!quotes.length) return json({ error: 'sem_frete_para_cep' }, 422);

  let quoteId;
  try { quoteId = await rpc('save_shipping_quote', { p_cep: to, p_fingerprint: pkg.fingerprint, p_quotes: quotes }); } catch (e) {
    console.error(e);
    return json({ error: 'erro_interno' }, 500);
  }
  return json({ quoteId, quotes });
});

// Cria a cobrança de um pedido no Mercado Pago (Checkout Pro) e devolve o link da página de pagamento.
// Chamada pelo site depois do pedido, com o código e o e-mail do pedido. O valor vem sempre do banco.
// Segredos (Edge Functions > Secrets): MP_ACCESS_TOKEN (obrigatório) e SITE_URL (opcional).
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

// Chama uma função do banco com a chave secreta (papel service_role).
async function rpc(name: string, args: Record<string, unknown>) {
  const key = secretKey();
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`banco ${r.status}: ${await r.text()}`);
  return r.json();
}

// Data no formato do Mercado Pago, no horário de Brasília.
const brt = (ms: number) => new Date(ms - 3 * 3600_000).toISOString().replace('Z', '-03:00');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'metodo_invalido' }, 405);

  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return json({ error: 'pagamento_indisponivel' }, 503);

  const { code, email } = await req.json().catch(() => ({}));
  if (typeof code !== 'string' || typeof email !== 'string' || !code || !email) return json({ error: 'dados_invalidos' }, 400);

  let order;
  try { order = await rpc('payment_order', { p_code: code, p_email: email }); } catch (e) {
    console.error(e);
    return json({ error: 'erro_interno' }, 500);
  }
  if (!order) return json({ error: 'pedido_nao_encontrado' }, 404);
  if (order.status !== 'aguardando') return json({ error: 'pedido_nao_aguarda_pagamento', status: order.status }, 409);

  const site = (Deno.env.get('SITE_URL') ?? 'https://fanjoystore.com.br').replace(/\/$/, '');
  const back = `${site}/?pedido=${encodeURIComponent(order.code)}`;
  const pix = order.method === 'pix';
  const preference = {
    items: [{ id: order.code, title: `Pedido ${order.code} · Fan Joy Store`, quantity: 1, unit_price: Number(order.total), currency_id: 'BRL' }],
    payer: { name: order.name, email: order.email },
    external_reference: order.code,
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
    back_urls: { success: back, pending: back, failure: back },
    auto_return: 'approved',
    statement_descriptor: 'FANJOYSTORE',
    // Pix já tem 5% de desconto no total, então a página mostra só o Pix; no cartão, até 3 parcelas.
    payment_methods: pix
      ? { excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'prepaid_card' }, { id: 'atm' }], installments: 1 }
      : { excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }, { id: 'atm' }], installments: 3 },
    expires: true,
    expiration_date_to: brt(Date.now() + 48 * 3600_000), // a loja cancela pedidos sem pagamento depois de 48 h
  };

  const r = await fetch(`${Deno.env.get('MP_API_URL') ?? 'https://api.mercadopago.com'}/checkout/preferences`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(preference),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.init_point) {
    console.error('Mercado Pago recusou a cobrança', r.status, JSON.stringify(data));
    return json({ error: 'mercadopago_erro' }, 502);
  }
  return json({ url: data.init_point });
});

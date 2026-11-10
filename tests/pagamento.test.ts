// Testes das Edge Functions de pagamento, rodando as funções de verdade contra um Mercado Pago
// e um banco simulados. Uso: deno test --allow-all tests/pagamento.test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1';

const MOCK = 8787;
const FN = 8000; // Deno.serve usa a porta 8000
const SECRET = 'segredo-de-teste';
const calls: { path: string; body: any; headers: Headers }[] = [];
let paymentStatus = 'approved';

const mock = Deno.serve({ port: MOCK, onListen() {} }, async (req) => {
  const path = new URL(req.url).pathname;
  const body = req.method === 'POST' ? await req.json().catch(() => null) : null;
  calls.push({ path, body, headers: req.headers });
  if (path === '/rest/v1/rpc/payment_order') {
    if (body.p_email !== 'bia@exemplo.com') return Response.json(null);
    return Response.json({ code: 'FJ000123', status: 'aguardando', total: 57.0, method: body.p_code === 'FJCARTAO' ? 'cartao' : 'pix', installments: 1, name: 'Bia', email: 'bia@exemplo.com' });
  }
  if (path === '/rest/v1/rpc/confirm_payment') return Response.json('pago');
  if (path === '/checkout/preferences') return Response.json({ id: 'pref-1', init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1' }, { status: 201 });
  if (path === '/v1/payments/123') return Response.json({ id: 123, status: paymentStatus, external_reference: 'FJ000123', transaction_amount: 57 });
  return new Response('nao encontrado', { status: 404 });
});

async function startFunction(name: string, env: Record<string, string>) {
  const proc = new Deno.Command(Deno.execPath(), {
    args: ['run', '--allow-net', '--allow-env', `supabase/functions/${name}/index.ts`],
    env: { SUPABASE_URL: `http://localhost:${MOCK}`, SUPABASE_SECRET_KEYS: '{"default":"sb_secret_teste"}', MP_API_URL: `http://localhost:${MOCK}`, ...env },
    stdout: 'null', stderr: 'null',
  }).spawn();
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://localhost:${FN}/`, { method: 'OPTIONS' }).then((r) => r.body?.cancel()); return proc; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('a função não subiu');
}
const stop = async (p: Deno.ChildProcess) => { p.kill(); await p.status; };
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`http://localhost:${FN}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

async function sign(dataId: string, requestId: string, ts: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`id:${dataId};request-id:${requestId};ts:${ts};`)));
  return `ts=${ts},v1=${[...mac].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

// O servidor simulado é compartilhado pelos dois testes; por isso os sanitizadores de recursos ficam desligados.
const opts = { sanitizeResources: false, sanitizeOps: false };

Deno.test('criar-pagamento', opts, async (t) => {
  const fn = await startFunction('criar-pagamento', { MP_ACCESS_TOKEN: 'TEST-token', SITE_URL: 'https://fanjoystore.com.br' });
  try {
    await t.step('pedido Pix: cobra o total do banco, só com Pix, e volta para a página do pedido', async () => {
      calls.length = 0;
      const r = await post('/', { code: 'FJ000123', email: 'bia@exemplo.com' });
      assertEquals(r.status, 200);
      assert((await r.json()).url.includes('pref_id=pref-1'));
      const rpc = calls.find((c) => c.path === '/rest/v1/rpc/payment_order')!;
      assertEquals(rpc.headers.get('apikey'), 'sb_secret_teste');
      assertEquals(rpc.headers.get('authorization'), null);
      const pref = calls.find((c) => c.path === '/checkout/preferences')!;
      assertEquals(pref.headers.get('authorization'), 'Bearer TEST-token');
      assertEquals(pref.body.items[0].unit_price, 57);
      assertEquals(pref.body.external_reference, 'FJ000123');
      assertEquals(pref.body.back_urls.success, 'https://fanjoystore.com.br/?pedido=FJ000123');
      assertEquals(pref.body.notification_url, `http://localhost:${MOCK}/functions/v1/mercadopago-webhook`);
      assert(pref.body.payment_methods.excluded_payment_types.some((x: any) => x.id === 'credit_card'), 'Pix exclui cartão');
      assert(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}-03:00$/.test(pref.body.expiration_date_to), pref.body.expiration_date_to);
    });
    await t.step('pedido no cartão: até 3 parcelas, sem Pix', async () => {
      calls.length = 0;
      const r = await post('/', { code: 'FJCARTAO', email: 'bia@exemplo.com' });
      assertEquals(r.status, 200); await r.body?.cancel();
      const pref = calls.find((c) => c.path === '/checkout/preferences')!;
      assertEquals(pref.body.payment_methods.installments, 3);
      assert(pref.body.payment_methods.excluded_payment_types.some((x: any) => x.id === 'bank_transfer'), 'cartão exclui Pix');
    });
    await t.step('e-mail errado não gera cobrança', async () => {
      calls.length = 0;
      const r = await post('/', { code: 'FJ000123', email: 'outra@exemplo.com' });
      assertEquals(r.status, 404); await r.body?.cancel();
      assert(!calls.some((c) => c.path === '/checkout/preferences'));
    });
    await t.step('responde ao CORS do navegador', async () => {
      const r = await fetch(`http://localhost:${FN}/`, { method: 'OPTIONS' });
      await r.body?.cancel();
      assertEquals(r.headers.get('access-control-allow-origin'), '*');
    });
  } finally { await stop(fn); }

  const off = await startFunction('criar-pagamento', {});
  try {
    await t.step('sem a chave do Mercado Pago, avisa que o pagamento está indisponível', async () => {
      const r = await post('/', { code: 'FJ000123', email: 'bia@exemplo.com' });
      assertEquals(r.status, 503); assertEquals((await r.json()).error, 'pagamento_indisponivel');
    });
  } finally { await stop(off); }
});

Deno.test('mercadopago-webhook', opts, async (t) => {
  const fn = await startFunction('mercadopago-webhook', { MP_ACCESS_TOKEN: 'TEST-token', MP_WEBHOOK_SECRET: SECRET });
  try {
    await t.step('aviso assinado de pagamento aprovado confirma o pedido com os dados da API', async () => {
      calls.length = 0; paymentStatus = 'approved';
      const r = await post('/?data.id=123&type=payment', { type: 'payment', data: { id: '123' } }, { 'x-request-id': 'req-1', 'x-signature': await sign('123', 'req-1', '1700000000') });
      assertEquals(r.status, 200); assertEquals(await r.text(), 'pago');
      const c = calls.find((x) => x.path === '/rest/v1/rpc/confirm_payment')!;
      assertEquals(c.body, { p_code: 'FJ000123', p_payment_ref: '123', p_amount: 57 });
    });
    await t.step('assinatura inválida é recusada sem consultar nada', async () => {
      calls.length = 0;
      const r = await post('/?data.id=123&type=payment', { type: 'payment', data: { id: '123' } }, { 'x-request-id': 'req-1', 'x-signature': 'ts=1700000000,v1=00ff' });
      assertEquals(r.status, 401); await r.body?.cancel();
      assertEquals(calls.length, 0);
    });
    await t.step('pagamento pendente não confirma o pedido', async () => {
      calls.length = 0; paymentStatus = 'pending';
      const r = await post('/?data.id=123&type=payment', { type: 'payment', data: { id: '123' } }, { 'x-request-id': 'req-2', 'x-signature': await sign('123', 'req-2', '1700000001') });
      assertEquals(await r.text(), 'status_pending');
      assert(!calls.some((c) => c.path === '/rest/v1/rpc/confirm_payment'));
    });
    await t.step('outros tipos de aviso são ignorados', async () => {
      const r = await post('/?type=merchant_order&data.id=9', { type: 'merchant_order' });
      assertEquals(await r.text(), 'ignorado');
    });
  } finally { await stop(fn); }
  await mock.shutdown();
});

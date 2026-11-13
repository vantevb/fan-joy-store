// Teste da Edge Function cotar-frete contra um Melhor Envio e um banco simulados.
// Uso: deno test --allow-all tests/frete.test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1';

const MOCK = 8788;
const FN = 8000;
const calls: { path: string; body: any; headers: Headers }[] = [];
const opts = { sanitizeResources: false, sanitizeOps: false };

const mock = Deno.serve({ port: MOCK, onListen() {} }, async (req) => {
  const path = new URL(req.url).pathname;
  const body = req.method === 'POST' ? await req.json().catch(() => null) : null;
  calls.push({ path, body, headers: req.headers });
  if (path === '/rest/v1/rpc/shipping_package') {
    if (body.p_items[0].id === 'inativo') return Response.json({ message: 'produto_indisponivel:inativo' }, { status: 400 });
    return Response.json({ fingerprint: 'caneca-ta-bom:2', extraDays: 2, items: 2,
      products: [{ id: 'caneca-ta-bom', quantity: 2, weight: 0.4, length: 12, width: 12, height: 10, insurance_value: 60 }] });
  }
  if (path === '/rest/v1/rpc/save_shipping_quote') return Response.json('11111111-2222-3333-4444-555555555555');
  if (path === '/api/v2/me/shipment/calculate') {
    return Response.json([
      { id: 2, name: 'SEDEX', price: '31.20', custom_price: '31.20', delivery_time: 2, custom_delivery_time: 2, company: { name: 'Correios' } },
      { id: 1, name: 'PAC', price: '18.47', custom_price: '18.47', delivery_time: 6, custom_delivery_time: 6, company: { name: 'Correios' } },
      { id: 3, name: '.Package', error: 'Serviço indisponível para o trecho.', company: { name: 'Jadlog' } },
    ]);
  }
  return new Response('nao encontrado', { status: 404 });
});

async function start(env: Record<string, string>) {
  const proc = new Deno.Command(Deno.execPath(), {
    args: ['run', '--allow-net', '--allow-env', 'supabase/functions/cotar-frete/index.ts'],
    env: { SUPABASE_URL: `http://localhost:${MOCK}`, SUPABASE_SECRET_KEYS: '{"default":"sb_secret_teste"}', ME_API_URL: `http://localhost:${MOCK}`, ...env },
    stdout: 'null', stderr: 'null',
  }).spawn();
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://localhost:${FN}/`, { method: 'OPTIONS' }).then((r) => r.body?.cancel()); return proc; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('a função não subiu');
}
const stop = async (p: Deno.ChildProcess) => { p.kill(); await p.status; };
const post = (body: unknown) => fetch(`http://localhost:${FN}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const ITEMS = [{ id: 'caneca-ta-bom', qty: 2, options: { Modelo: 'Branca' } }];

Deno.test('cotar-frete', opts, async (t) => {
  const fn = await start({ ME_TOKEN: 'token-teste', ORIGEM_CEP: '03000-000', ME_CONTATO: 'loja@exemplo.com' });
  try {
    await t.step('cota no Melhor Envio com a embalagem do banco e guarda a cotação', async () => {
      calls.length = 0;
      const r = await post({ cep: '30130-000', items: ITEMS });
      assertEquals(r.status, 200);
      const d = await r.json();
      assertEquals(d.quoteId, '11111111-2222-3333-4444-555555555555');
      assertEquals(d.quotes, [
        { id: 'me-1', name: 'Correios PAC', price: 18.47, days: 8 },
        { id: 'me-2', name: 'Correios SEDEX', price: 31.2, days: 4 },
      ]);
      const me = calls.find((c) => c.path === '/api/v2/me/shipment/calculate')!;
      assertEquals(me.headers.get('authorization'), 'Bearer token-teste');
      assertEquals(me.headers.get('user-agent'), 'Fan Joy Store (loja@exemplo.com)');
      assertEquals(me.body.from.postal_code, '03000000');
      assertEquals(me.body.to.postal_code, '30130000');
      assertEquals(me.body.products[0].insurance_value, 60);
      const saved = calls.find((c) => c.path === '/rest/v1/rpc/save_shipping_quote')!;
      assertEquals(saved.body.p_fingerprint, 'caneca-ta-bom:2');
      assertEquals(saved.headers.get('apikey'), 'sb_secret_teste');
    });
    await t.step('São Paulo capital ganha a retirada combinada', async () => {
      const d = await (await post({ cep: '01310-100', items: ITEMS })).json();
      assertEquals(d.quotes[0], { id: 'retirada', name: 'Retirada combinada em São Paulo', price: 0, days: 2 });
    });
    await t.step('CEP incompleto é recusado sem cotar', async () => {
      calls.length = 0;
      const r = await post({ cep: '3013', items: ITEMS });
      assertEquals(r.status, 400); await r.body?.cancel();
      assert(!calls.some((c) => c.path.startsWith('/api/')));
    });
    await t.step('produto indisponível volta como erro claro', async () => {
      const r = await post({ cep: '30130-000', items: [{ id: 'inativo', qty: 1 }] });
      assertEquals(r.status, 400);
      assertEquals((await r.json()).error, 'produto_indisponivel:inativo');
    });
  } finally { await stop(fn); }

  const off = await start({});
  try {
    await t.step('sem a chave do Melhor Envio, avisa que o frete real está indisponível', async () => {
      const r = await post({ cep: '30130-000', items: ITEMS });
      assertEquals(r.status, 503); assertEquals((await r.json()).error, 'frete_indisponivel');
    });
  } finally { await stop(off); }
  await mock.shutdown();
});

// Recebe os avisos de pagamento do Mercado Pago e marca o pedido como pago.
// Nunca confia no conteúdo do aviso: consulta o pagamento direto na API do Mercado Pago
// e só confirma se ele estiver aprovado e o valor cobrir o total do pedido.
// Segredos (Edge Functions > Secrets): MP_ACCESS_TOKEN (obrigatório) e MP_WEBHOOK_SECRET
// (a "assinatura secreta" dos webhooks; com ela, avisos sem assinatura válida são recusados).
// Publicada com verify_jwt = false: quem chama é o Mercado Pago, sem JWT do Supabase.

function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys.default) return keys.default;
  } catch { /* projeto só com as chaves antigas */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

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

// Assinatura do Mercado Pago: x-signature "ts=...,v1=..." = HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".
async function validSignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const header = req.headers.get('x-signature') ?? '';
  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=').map((s) => s.trim())));
  const ts = parts.ts; const v1 = parts.v1;
  if (!ts || !v1) return false;
  const requestId = req.headers.get('x-request-id');
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifest = '';
  if (id) manifest += `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

const ok = (text: string) => new Response(text, { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('metodo_invalido', { status: 405 });
  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return new Response('pagamento_indisponivel', { status: 503 });

  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const type = body?.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
  const dataId = String(url.searchParams.get('data.id') ?? body?.data?.id ?? '');
  if (type !== 'payment' || !dataId) return ok('ignorado');

  const secret = Deno.env.get('MP_WEBHOOK_SECRET');
  if (secret && !(await validSignature(req, dataId, secret))) return new Response('assinatura_invalida', { status: 401 });

  const r = await fetch(`${Deno.env.get('MP_API_URL') ?? 'https://api.mercadopago.com'}/v1/payments/${encodeURIComponent(dataId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 404) return ok('pagamento_desconhecido');
  if (!r.ok) {
    console.error('consulta ao Mercado Pago falhou', r.status);
    return new Response('tente_de_novo', { status: 502 }); // o Mercado Pago reenvia o aviso
  }
  const payment = await r.json();
  if (payment.status !== 'approved') return ok(`status_${payment.status}`);
  if (!payment.external_reference) return ok('sem_pedido');

  try {
    const result = await rpc('confirm_payment', {
      p_code: payment.external_reference,
      p_payment_ref: String(payment.id),
      p_amount: Number(payment.transaction_amount),
    });
    console.log('pagamento', payment.id, 'pedido', payment.external_reference, '→', result);
    return ok(String(result));
  } catch (e) {
    console.error(e);
    return new Response('erro_interno', { status: 500 });
  }
});

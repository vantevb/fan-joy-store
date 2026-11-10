// Camada de dados da loja. Escolhe entre:
//  - demonstração: dados no navegador (js/state.js), quando js/config.js está vazio;
//  - loja real: banco Supabase, quando js/config.js tem URL e chave.
// As páginas usam só estas funções, então funcionam igual nos dois modos.
import * as S from './state.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, PAGAMENTO_ONLINE } from './config.js';
import { tr } from './i18n.js';

export const live = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
// Loja real com pagamento pelo Mercado Pago (Pix e cartão).
// Para testar antes de ligar para todo mundo: abra o site com ?pagamento=teste. Vale só para aquela aba
// (?pagamento=off desliga). Use com as credenciais de TESTE do Mercado Pago, nunca com clientes.
function paymentTestMode() {
  try {
    const q = new URLSearchParams(location.search).get('pagamento');
    if (q === 'teste') sessionStorage.setItem('fjs:pagamento-teste', '1');
    if (q === 'off') sessionStorage.removeItem('fjs:pagamento-teste');
    return sessionStorage.getItem('fjs:pagamento-teste') === '1';
  } catch { return false; }
}
export const onlinePayment = live && (PAGAMENTO_ONLINE === true || paymentTestMode());
const DEMO_AUTH = 'fjs:v1:admin';
const MY_ORDERS = 'fjs:v1:myOrders';

let clientPromise = null;
function client() {
  if (!clientPromise) {
    clientPromise = (async () => {
      if (!window.supabase?.createClient) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'js/vendor/supabase.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error(tr('Não foi possível carregar a conexão com a loja. Verifique sua internet.', 'Couldn’t connect to the shop. Check your internet connection.')));
          document.head.appendChild(s);
        });
      }
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, storageKey: 'fjs-auth' } });
    })();
  }
  return clientPromise;
}

// Mensagens de erro do banco em português claro para quem está comprando ou gerindo.
function friendly(error) {
  const raw = String(error?.message || error || '');
  const [code, a, b] = raw.split(':');
  const name = (id) => S.product(id)?.name || tr('um dos produtos', 'one of the products');
  const vname = (id, v) => S.optionText(S.product(id), v, '').name;
  const msgs = {
    estoque_insuficiente: () => (Number(b) > 0
      ? tr(`Só temos ${b} ${Number(b) === 1 ? 'unidade' : 'unidades'} de ${name(a)}. Ajuste a quantidade na sacola.`, `We only have ${b} of ${name(a)} left. Please adjust the quantity in your bag.`)
      : tr(`${name(a)} acabou de esgotar. Remova o item da sacola para continuar.`, `${name(a)} just sold out. Remove it from your bag to continue.`)),
    produto_indisponivel: () => tr(`${name(a)} não está mais disponível. Remova o item da sacola para continuar.`, `${name(a)} is no longer available. Remove it from your bag to continue.`),
    variacao_invalida: () => tr(`Escolha de novo a opção “${vname(a, b)}” de ${name(a)}.`, `Please choose the “${vname(a, b)}” option for ${name(a)} again.`),
    variacao_obrigatoria: () => tr(`Escolha a opção “${vname(a, b)}” de ${name(a)}.`, `Please choose the “${vname(a, b)}” option for ${name(a)}.`),
    personalizacao_invalida: () => tr(`A personalização de ${name(a)} passou do limite de caracteres.`, `The personalization for ${name(a)} is over the character limit.`),
    quantidade_invalida: () => tr('A quantidade de cada item precisa ficar entre 1 e 20.', 'Each item’s quantity must be between 1 and 20.'),
    cep_invalido: () => tr('Confira o CEP: ele precisa ter 8 números.', 'Check your CEP: it must have 8 digits.'),
    frete_invalido: () => tr('Essa forma de entrega não está disponível para o seu CEP. Calcule o frete de novo na sacola.', 'That shipping option isn’t available for your CEP. Calculate shipping again in your bag.'),
    endereco_invalido: () => tr('Informe o endereço e o número para a entrega.', 'Enter the street address and number for delivery.'),
    dados_cliente_invalidos: () => tr('Confira nome, e-mail e WhatsApp.', 'Check your name, e-mail and WhatsApp number.'),
    parcelas_invalidas: () => tr('O parcelamento vai até 3 vezes.', 'You can split the payment into up to 3 installments.'),
    orcamento_invalido: () => tr('Para brindes corporativos, informe a empresa e no mínimo 20 unidades.', 'For corporate gifts, enter your company and at least 20 units.'),
    dados_invalidos: () => tr('Preencha nome, e-mail e a descrição do pedido.', 'Fill in your name, e-mail and a description of your request.'),
    acesso_negado: () => 'Sua conta não tem acesso a esta área. Entre de novo com a conta da loja.',
    pedido_cancelado: () => 'Este pedido foi cancelado e não pode mudar de status. Se a cliente ainda quiser, faça um pedido novo.',
  };
  if (msgs[code]) return new Error(msgs[code]());
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return new Error(tr('Sem conexão com a loja agora. Verifique sua internet e tente de novo.', 'Can’t reach the shop right now. Check your connection and try again.'));
  if (/Invalid login credentials/i.test(raw)) return new Error('E-mail ou senha incorretos.');
  return new Error(tr('Algo deu errado do nosso lado. Tente de novo em instantes.', 'Something went wrong on our side. Please try again in a moment.'));
}

async function rpc(name, args) {
  const c = await client();
  const { data, error } = await c.rpc(name, args);
  if (error) { console.error(name, error); throw friendly(error); }
  return data;
}

function rememberOrder(code, email) {
  try {
    const list = JSON.parse(localStorage.getItem(MY_ORDERS) || '[]').filter((o) => o.code !== code);
    list.unshift({ code, email, at: Date.now() });
    localStorage.setItem(MY_ORDERS, JSON.stringify(list.slice(0, 20)));
  } catch { /* sem armazenamento: a cliente usa o código e o e-mail */ }
}
function rememberedEmail(code) {
  try { return JSON.parse(localStorage.getItem(MY_ORDERS) || '[]').find((o) => o.code === code)?.email || ''; } catch { return ''; }
}

// ---------- Loja ----------
export async function init() {
  if (!live) return;
  const cat = await rpc('catalog');
  S.setLiveCatalog(cat.products);
}

export async function placeOrder({ customer, address, shipping, payment, lines }) {
  if (!live) {
    const o = S.createOrder({ customer, shipping, payment, lines });
    return { code: o.code };
  }
  const res = await rpc('place_order', {
    p_customer: customer,
    p_address: address,
    p_items: lines.map((l) => ({ id: l.id, qty: l.qty, options: l.options, personalization: l.personalization })),
    p_shipping: { cep: shipping.cep, service: shipping.id },
    p_payment: { method: payment.method, installments: payment.installments },
  });
  rememberOrder(res.code, customer.email.toLowerCase());
  S.clearCart();
  init().catch(() => {}); // atualiza o estoque mostrado na loja
  return res;
}

// email vazio: usa o e-mail guardado quando o pedido foi feito neste navegador.
export async function getOrder(code, email = '') {
  if (!live) {
    const o = S.getOrder(code);
    if (!o || (email && o.customer.email.toLowerCase() !== email.trim().toLowerCase())) return null;
    return o;
  }
  const e = email || rememberedEmail(code.toUpperCase());
  if (!e) return null;
  const o = await rpc('get_order', { p_code: code, p_email: e });
  if (o) rememberOrder(o.code, e.trim().toLowerCase());
  return o;
}

export function myOrders() {
  if (!live) return S.getOrders().filter((o) => o.origin === 'loja').map((o) => ({ code: o.code, at: o.createdAt, status: o.status, total: o.total }));
  try { return JSON.parse(localStorage.getItem(MY_ORDERS) || '[]'); } catch { return []; }
}

export async function submitRequest(r) {
  if (!live) return { code: S.addRequest(r).id };
  return rpc('submit_request', { p: r });
}

// Na demonstração, o Pix pode ser "pago" com um botão. Na loja real, quem confirma é o meio de pagamento.
export const canSimulatePayment = !live;

// Gera a cobrança do pedido no Mercado Pago e devolve o link da página de pagamento.
// O valor vem do banco; o site só informa o código e o e-mail do pedido.
export async function startPayment(code, email = '') {
  const e = email || rememberedEmail(String(code).toUpperCase());
  let r;
  try {
    r = await fetch(`${SUPABASE_URL}/functions/v1/criar-pagamento`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email: e }),
    });
  } catch { throw new Error(tr('Sem conexão com a loja agora. Verifique sua internet e tente de novo.', 'Can’t reach the shop right now. Check your connection and try again.')); }
  const data = await r.json().catch(() => ({}));
  if (r.ok && data.url) return data.url;
  if (data.error === 'pedido_nao_aguarda_pagamento') throw new Error(tr('Este pedido não está aguardando pagamento.', 'This order isn’t awaiting payment.'));
  throw new Error(tr('Não foi possível abrir o pagamento agora. Seu pedido está registrado: tente de novo em instantes pela página do pedido.', 'We couldn’t open the payment page right now. Your order is saved: try again in a moment from the order page.'));
}
export function simulatePix(code) { if (!live) S.payPix(code); }

// ---------- Painel ----------
// Perfil da pessoa logada, guardado enquanto a sessão for a mesma: assim trocar de aba no painel
// não espera uma consulta extra ao banco. As funções do banco continuam conferindo o acesso a cada chamada.
let profileCache = null; // { userId, prof }
export const admin = {
  async session() {
    if (!live) { try { return sessionStorage.getItem(DEMO_AUTH) === '1' ? { name: 'Lilian', role: 'dona' } : null; } catch { return window.__fjsAdmin ? { name: 'Lilian', role: 'dona' } : null; } }
    const c = await client();
    const { data } = await c.auth.getSession();
    if (!data.session) { profileCache = null; return null; }
    const userId = data.session.user.id;
    if (profileCache?.userId === userId) return profileCache.prof;
    const prof = await rpc('my_staff_profile');
    profileCache = prof ? { userId, prof } : null;
    return prof;
  },
  async signIn(email, password) {
    if (!live) { try { sessionStorage.setItem(DEMO_AUTH, '1'); } catch { window.__fjsAdmin = true; } return { name: 'Lilian', role: 'dona' }; }
    const c = await client();
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw friendly(error);
    profileCache = null;
    const prof = await rpc('my_staff_profile');
    if (!prof) { await c.auth.signOut(); throw new Error('Esta conta não tem acesso ao painel da loja.'); }
    return prof;
  },
  async signOut() {
    if (!live) { try { sessionStorage.removeItem(DEMO_AUTH); } catch { window.__fjsAdmin = false; } return; }
    profileCache = null;
    await (await client()).auth.signOut();
  },
  async orders({ status = '', q = '' } = {}) {
    if (!live) {
      const query = q.toLowerCase();
      return S.getOrders().filter((o) => (!status || o.status === status) && (!query || (o.code + o.customer.name).toLowerCase().includes(query)));
    }
    return rpc('admin_orders', { p_status: status || null, p_query: q || null, p_limit: 200 });
  },
  async setOrderStatus(code, status, tracking = '') {
    if (!live) { S.setOrderStatus(code, status); return; }
    await rpc('admin_set_order_status', { p_code: code, p_status: status, p_tracking: tracking || null });
  },
  async products() {
    if (!live) return S.products();
    const list = await rpc('admin_products');
    S.setLiveCatalog(list);
    return S.products();
  },
  async updateProduct(id, patch) {
    if (!live) { S.updateProduct(id, patch); return; }
    await rpc('admin_update_product', { p_id: id, p_patch: patch });
  },
  async createProduct(p) {
    if (!live) { S.addProduct(p); return; }
    await rpc('admin_create_product', { p });
  },
  async requests() {
    if (!live) return S.getRequests();
    return rpc('admin_requests');
  },
  async setRequestStatus(id, status) {
    if (!live) { S.setRequestStatus(id, status); return; }
    await rpc('admin_set_request_status', { p_code: id, p_status: status });
  },
  async dashboard(period) {
    if (!live) return S.analytics(period);
    const [all, d] = await Promise.all([admin.products(), rpc('admin_dashboard', { p_days: period.days, p_category: period.category || null, p_collection: period.collection || null })]);
    const byId = new Map(all.map((p) => [p.id, p]));
    const rows = d.rows.filter((r) => byId.has(r.id)).map((r) => ({ ...r, p: byId.get(r.id), revenue: Number(r.revenue), perWeek: Number(r.perWeek) }));
    return S.summarize({
      rows, all: all.filter((p) => p.mode !== 'gratis' && p.mode !== 'orcamento'),
      revenue: Number(d.revenue), orderCount: d.orderCount, items: d.items,
      weekly: d.weekly.map((w) => ({ start: w.start, revenue: Number(w.revenue) })),
    });
  },
  canReset: !live,
};

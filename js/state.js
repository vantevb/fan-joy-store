// Estado da demonstração. Tudo fica salvo apenas neste navegador (localStorage).
// Na operação definitiva, estes dados vêm do back-end com autenticação.
import { PRODUCTS, CATEGORIES, COLLECTIONS, STATUS } from './data.js';
import { isEn, tr, loc } from './i18n.js';

const KEY = 'fjs:v1:';
const DAY = 86400000;

function load(name, fallback) {
  try {
    const raw = localStorage.getItem(KEY + name);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function save(name, value) {
  try { localStorage.setItem(KEY + name, JSON.stringify(value)); } catch { /* armazenamento indisponível: a demo segue em memória */ }
}

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn()); }

// ---------- Catálogo (com ajustes feitos no painel) ----------
const overrides = load('overrides', {}); // { [id]: { price, stock, active, mode, lowStock } }
const custom = load('customProducts', []);
const now0 = Date.now();

// No modo loja real, o catálogo vem do banco (ver js/api.js).
let liveCatalog = null;
export function setLiveCatalog(list) { liveCatalog = list.map((p) => ({ active: true, variations: [], details: [], ...p })); emit(); }
export const isLive = () => liveCatalog !== null;

export function products() {
  if (liveCatalog) return isEn() ? liveCatalog.map(localize) : liveCatalog;
  return [...PRODUCTS, ...custom].map((p) => {
    const o = overrides[p.id] || {};
    const merged = { active: true, variations: [], details: [], ...p, ...o };
    merged.createdAt = p.createdAt ?? now0 - (p.createdDaysAgo ?? 0) * DAY;
    return localize(merged);
  });
}

// Versão em inglês de um produto para exibição. As variações continuam com os rótulos em português,
// que são os valores enviados ao servidor; a tradução delas é mostrada por optionText().
function localize(p) {
  const e = p.en;
  if (!isEn() || !e) return p;
  return {
    ...p,
    name: e.name || p.name,
    short: e.short || p.short,
    description: e.description || p.description,
    details: e.details?.length ? e.details : p.details,
    images: (p.images || []).map((im, i) => ({ ...im, alt: e.alts?.[i] || im.alt })),
    art: p.art && e.artText ? { ...p.art, text: e.artText } : p.art,
    personalization: p.personalization && e.personalization ? { ...p.personalization, ...e.personalization, max: p.personalization.max } : p.personalization,
  };
}

// Nome da variação e da opção no idioma da loja (casadas por posição com a versão em inglês).
export function optionText(p, vName, oLabel) {
  const vi = (p?.variations || []).findIndex((v) => v.name === vName);
  const ev = vi >= 0 && isEn() ? p.en?.variations?.[vi] : null;
  if (!ev) return { name: vName, label: oLabel };
  const oi = p.variations[vi].options.findIndex((o) => o.label === oLabel);
  return { name: ev.name || vName, label: (oi >= 0 && ev.options?.[oi]) || oLabel };
}
export function product(id) { return products().find((p) => p.id === id); }
export function updateProduct(id, patch) {
  overrides[id] = { ...(overrides[id] || {}), ...patch };
  save('overrides', overrides);
  emit();
}
export function addProduct(p) {
  custom.push({ ...p, createdAt: Date.now() });
  save('customProducts', custom);
  emit();
}
export const categoryName = (id) => { const c = CATEGORIES.find((x) => x.id === id); return c ? loc(c, 'name') : id; };
export const collectionName = (id) => { const c = COLLECTIONS.find((x) => x.id === id); return c ? loc(c, 'name') : id; };
export const statusLabel = (id) => { const st = STATUS.find((x) => x.id === id); return st ? loc(st, 'label') : id; };
// Coleção com nome, chamada e resumo no idioma da loja.
export const collectionView = (c) => ({ ...c, name: loc(c, 'name'), tagline: loc(c, 'tagline'), summary: loc(c, 'summary') });

// Frete: as regiões e a retirada vêm em português (também do servidor); aqui viram texto de exibição.
const REGION_EN = { 'São Paulo capital': 'São Paulo (city)', 'Estado de São Paulo': 'São Paulo (state)', Sudeste: 'Southeast Brazil', 'Nordeste e Centro-Oeste': 'Northeast and Center-West Brazil', 'Sul e Norte': 'South and North Brazil' };
const SHIP_EN = { 'Retirada combinada em São Paulo': 'Pickup in São Paulo (by arrangement)' };
export const regionName = (r) => (isEn() ? REGION_EN[r] || r : r);
export const shipName = (n) => (isEn() ? SHIP_EN[n] || n : n);

export function availability(p) {
  if (!p.active) return { id: 'indisponivel', label: tr('Indisponível', 'Unavailable'), buyable: false };
  if (p.mode === 'gratis') return { id: 'gratis', label: tr('Grátis para baixar', 'Free download'), buyable: false };
  if (p.mode === 'orcamento') return { id: 'orcamento', label: tr('Sob orçamento', 'Quote on request'), buyable: false };
  if (p.mode === 'encomenda') return { id: 'encomenda', label: tr(`Sob encomenda · produção em ${p.productionDays} dias úteis`, `Made to order · ${p.productionDays} business days to make`), buyable: true };
  if (p.stock <= 0) return { id: 'esgotado', label: tr('Esgotado', 'Sold out'), buyable: false };
  if (p.stock <= p.lowStock) return { id: 'ultimas', label: tr(`Últimas ${p.stock} unidades`, `Only ${p.stock} left`), buyable: true };
  return { id: 'pronta', label: tr('Pronta entrega', 'In stock'), buyable: true };
}

// ---------- Sacola ----------
let cart = load('cart', []); // [{ key, id, qty, options: {Nome: label}, personalization }]
export function getCart() { return cart; }
function persistCart() { save('cart', cart); emit(); }

export function unitPrice(p, options = {}) {
  let price = p.price || 0;
  for (const v of p.variations || []) {
    const opt = v.options.find((o) => o.label === options[v.name]);
    if (opt) price += opt.add;
  }
  return Math.round(price * 100) / 100;
}
export function addToCart(id, qty, options, personalization) {
  const key = [id, JSON.stringify(options || {}), personalization || ''].join('|');
  const line = cart.find((l) => l.key === key);
  if (line) line.qty = Math.min(line.qty + qty, 20);
  else cart.push({ key, id, qty, options: options || {}, personalization: personalization || '' });
  persistCart();
  return key;
}
export function setQty(key, qty) {
  const line = cart.find((l) => l.key === key);
  if (!line) return;
  line.qty = Math.max(1, Math.min(20, qty));
  persistCart();
}
export function removeLine(key) { cart = cart.filter((l) => l.key !== key); persistCart(); }
export function clearCart() { cart = []; persistCart(); }
export function cartLines() {
  return cart.map((l) => {
    const p = product(l.id);
    if (!p) return null;
    const unit = unitPrice(p, l.options);
    return { ...l, product: p, unit, total: unit * l.qty };
  }).filter(Boolean);
}
export function cartCount() { return cart.reduce((s, l) => s + l.qty, 0); }
export function cartSubtotal() { return cartLines().reduce((s, l) => s + l.total, 0); }

// ---------- Frete (simulado por faixa de CEP) ----------
export function shippingQuotes(cep, lines) {
  const digits = String(cep).replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const n = Number(digits.slice(0, 5));
  const items = lines.reduce((s, l) => s + l.qty, 0);
  const extraDays = Math.max(0, ...lines.map((l) => (l.product.mode === 'encomenda' ? l.product.productionDays : l.product.productionDays || 1)));
  let region; let base; let days;
  if (n >= 1000 && n <= 5999) { region = 'São Paulo capital'; base = 12; days = 2; }
  else if (n < 20000) { region = 'Estado de São Paulo'; base = 16; days = 3; }
  else if (n < 40000) { region = 'Sudeste'; base = 21; days = 5; }
  else if (n < 80000) { region = 'Nordeste e Centro-Oeste'; base = 29; days = 8; }
  else { region = 'Sul e Norte'; base = 27; days = 7; }
  const weight = 1 + Math.max(0, items - 1) * 0.15;
  const quotes = [
    { id: 'pac', name: 'PAC', price: round(base * weight), days: days + 3 + extraDays },
    { id: 'sedex', name: 'SEDEX', price: round(base * weight * 1.7), days: Math.max(1, days - 1) + extraDays },
  ];
  if (region === 'São Paulo capital') quotes.unshift({ id: 'retirada', name: 'Retirada combinada em São Paulo', price: 0, days: extraDays });
  return { region, quotes };
}
function round(v) { return Math.round((Math.round(v * 10) / 10 - 0.1) * 100) / 100; }

// ---------- Pedidos ----------
let orders = load('orders', null);
if (!orders) { orders = seedOrders(); save('orders', orders); }
export function getOrders() { return orders; }
export function getOrder(code) { return orders.find((o) => o.code.toUpperCase() === String(code).toUpperCase()); }

export function createOrder({ customer, shipping, payment, lines }) {
  const code = 'FJ' + String(Math.floor(1000 + Math.random() * 9000));
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discount = payment.method === 'pix' ? round2(subtotal * 0.05) : 0;
  const order = {
    code,
    createdAt: Date.now(),
    demo: true,
    customer,
    shipping,
    payment: { method: payment.method, installments: payment.installments || 1, last4: payment.last4 || null },
    items: lines.map((l) => ({ id: l.id, name: l.product.name, qty: l.qty, unit: l.unit, options: l.options, personalization: l.personalization })),
    subtotal,
    discount,
    shippingPrice: shipping.price,
    total: round2(subtotal - discount + shipping.price),
    status: payment.method === 'pix' ? 'aguardando' : 'pago',
    history: [{ status: payment.method === 'pix' ? 'aguardando' : 'pago', at: Date.now() }],
    origin: 'loja',
  };
  // Baixa de estoque para itens de pronta entrega
  for (const l of lines) {
    if (l.product.mode === 'pronta') updateProduct(l.id, { stock: Math.max(0, l.product.stock - l.qty) });
  }
  orders = [order, ...orders];
  save('orders', orders);
  try { sessionStorage.setItem(KEY + 'lastOrder', code); } catch { /* ignora */ }
  emit();
  return order;
}
export function setOrderStatus(code, status) {
  const o = getOrder(code);
  if (!o || o.status === status) return;
  o.status = status;
  o.history.push({ status, at: Date.now() });
  save('orders', orders);
  emit();
}
export function payPix(code) { setOrderStatus(code, 'pago'); }
function round2(v) { return Math.round(v * 100) / 100; }

// Pedidos fictícios dos últimos 120 dias, para o painel ter histórico.
function seedOrders() {
  let s = 20260611;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const weights = {
    'caneca-ta-bom': 12, 'banner-boat': 3, 'caneca-mais-um-episodio': 4, 'caderno-diario-dorama': 3, 'marcadores-dorama': 0, 'porta-photocard': 5,
    'kit-toploader': 1, 'chaveiro-bl': 2, 'planner-bl': 0, 'camiseta-little-joy': 3, 'fan-joy-box': 1, 'ecobag-everyday': 2,
  };
  const pool = PRODUCTS.filter((p) => weights[p.id]);
  const total = pool.reduce((a, p) => a + weights[p.id], 0);
  const pick = () => { let r = rnd() * total; for (const p of pool) { r -= weights[p.id]; if (r <= 0) return p; } return pool[0]; };
  const names = ['Ana', 'Bia', 'Carol', 'Duda', 'Gabi', 'Jéssica', 'Ju', 'Lari', 'Mari', 'Nati', 'Paty', 'Rafa', 'Sofia', 'Taís', 'Vivi', 'Yasmin'];
  const cities = ['São Paulo, SP', 'Campinas, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 'Curitiba, PR', 'Recife, PE', 'Salvador, BA', 'Porto Alegre, RS'];
  const list = [];
  const now = Date.now();
  for (let i = 0; i < 96; i++) {
    const age = Math.floor(rnd() * rnd() * 118) + 1; // mais pedidos recentes
    const created = now - age * DAY - Math.floor(rnd() * DAY);
    const nItems = 1 + Math.floor(rnd() * 3);
    const items = [];
    for (let k = 0; k < nItems; k++) {
      const p = pick();
      const ageOfProduct = p.createdDaysAgo ?? 0;
      if (age > ageOfProduct) continue; // produto ainda não existia
      if (p.id === 'ecobag-everyday' && age < 45) continue; // esgotou há 45 dias
      const existing = items.find((it) => it.id === p.id);
      if (existing) { existing.qty += 1; continue; }
      items.push({ id: p.id, name: p.name, qty: 1 + (rnd() < 0.2 ? 1 : 0), unit: p.price, options: {}, personalization: '' });
    }
    if (!items.length) continue;
    const subtotal = round2(items.reduce((a, it) => a + it.unit * it.qty, 0));
    const ship = round2(12 + rnd() * 20);
    let status = 'entregue';
    if (age <= 2) status = rnd() < 0.5 ? 'aguardando' : 'pago';
    else if (age <= 6) status = rnd() < 0.5 ? 'producao' : 'enviado';
    else if (age <= 10) status = 'enviado';
    if (rnd() < 0.04) status = 'cancelado';
    const pix = rnd() < 0.6;
    const discount = pix ? round2(subtotal * 0.05) : 0;
    list.push({
      code: 'FJ' + String(1000 + i * 37 + Math.floor(rnd() * 30)).slice(-4),
      createdAt: created,
      demo: true,
      customer: { name: names[Math.floor(rnd() * names.length)] + ' (exemplo)', email: 'cliente@exemplo.com', city: cities[Math.floor(rnd() * cities.length)] },
      shipping: { name: rnd() < 0.7 ? 'PAC' : 'SEDEX', price: ship },
      payment: { method: pix ? 'pix' : 'cartao', installments: 1 },
      items, subtotal, discount, shippingPrice: ship,
      total: round2(subtotal - discount + ship),
      status,
      history: [{ status, at: created }],
      origin: 'exemplo',
    });
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

// ---------- Solicitações (encomendas e orçamentos) ----------
let requests = load('requests', [
  { id: 'R-102', type: 'orcamento', createdAt: Date.now() - 3 * DAY, name: 'Paula (exemplo)', company: 'Estúdio Aurora (exemplo)', qty: 60, product: 'Canecas e ecobags', message: 'Kit para o onboarding de novos colaboradores em março.', status: 'novo' },
  { id: 'R-101', type: 'encomenda', createdAt: Date.now() - 9 * DAY, name: 'Camila (exemplo)', qty: 1, product: 'Caneca', message: 'Quero uma caneca com o meu casal de BL favorito para dar de presente.', status: 'respondido' },
]);
export function getRequests() { return requests; }
export function addRequest(r) {
  const req = { id: 'R-' + (100 + requests.length + 1), createdAt: Date.now(), status: 'novo', ...r };
  requests = [req, ...requests];
  save('requests', requests);
  emit();
  return req;
}
export function setRequestStatus(id, status) {
  const r = requests.find((x) => x.id === id);
  if (r) { r.status = status; save('requests', requests); emit(); }
}

// ---------- Indicadores do painel ----------
export function analytics({ days = 30, category = '', collection = '' } = {}) {
  const since = Date.now() - days * DAY;
  const all = products().filter((p) => p.mode !== 'gratis' && p.mode !== 'orcamento');
  const scope = all.filter((p) => (!category || p.category === category) && (!collection || p.collection === collection));
  const ids = new Set(scope.map((p) => p.id));
  const inPeriod = orders.filter((o) => o.createdAt >= since && o.status !== 'cancelado');
  const rows = scope.map((p) => {
    let qty = 0; let revenue = 0;
    for (const o of inPeriod) for (const it of o.items) if (it.id === p.id) { qty += it.qty; revenue += it.unit * it.qty; }
    const ageDays = Math.floor((Date.now() - p.createdAt) / DAY);
    let kind = 'regular';
    if (!p.active || (p.mode === 'pronta' && p.stock <= 0)) kind = 'indisponivel';
    else if (ageDays < 30) kind = 'novo';
    else if (p.mode === 'encomenda') kind = 'encomenda';
    // Dias em que o produto existiu dentro do período: evita comparar produto novo com produto antigo.
    const daysListed = Math.max(1, Math.min(days, ageDays));
    return { p, qty, revenue: round2(revenue), kind, ageDays, daysListed, perWeek: round2((qty / daysListed) * 7) };
  });
  let orderCount = 0; let revenue = 0; let items = 0;
  for (const o of inPeriod) {
    const its = o.items.filter((it) => ids.has(it.id));
    if (!its.length) continue;
    orderCount += 1;
    for (const it of its) { revenue += it.unit * it.qty; items += it.qty; }
  }
  // Receita por semana para o gráfico
  const weeks = Math.max(1, Math.ceil(days / 7));
  const weekly = Array.from({ length: weeks }, (_, i) => ({ start: since + i * 7 * DAY, revenue: 0 }));
  for (const o of inPeriod) {
    const w = Math.min(weeks - 1, Math.floor((o.createdAt - since) / (7 * DAY)));
    for (const it of o.items) if (ids.has(it.id)) weekly[w].revenue += it.unit * it.qty;
  }
  return summarize({ rows, all, revenue, orderCount, items, weekly });
}

// Monta as listas do painel a partir das linhas por produto (usado na demonstração e no banco real).
export function summarize({ rows, all, revenue, orderCount, items, weekly }) {
  const comparable = rows.filter((r) => r.kind === 'regular');
  return {
    rows,
    revenue: round2(revenue), orderCount, items, ticket: orderCount ? round2(revenue / orderCount) : 0,
    top: [...rows].filter((r) => r.qty > 0).sort((a, b) => b.qty - a.qty).slice(0, 5),
    bottom: [...comparable].sort((a, b) => a.perWeek - b.perWeek).slice(0, 5),
    stalled: rows.filter((r) => r.kind === 'regular' && r.p.mode === 'pronta' && r.p.stock > 0 && r.qty === 0),
    lowStock: all.filter((p) => p.active && p.mode === 'pronta' && p.stock <= p.lowStock),
    weekly,
  };
}

export function resetDemo() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignora */ }
  location.hash = '#inicio';
  location.reload();
}

export { COLLECTIONS, CATEGORIES, STATUS };

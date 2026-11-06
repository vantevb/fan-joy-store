// Roteamento por hash (#inicio, #loja, #p-caneca-ta-bom...) e estrutura comum (cabeçalho, sacola, rodapé).
import * as S from './state.js';
import * as api from './api.js';
import { storeRoute, notFound, openDrawer, closeDrawer, renderDrawer } from './store.js';
import { adminRoute } from './admin.js';
import { icon } from './ui.js';

const TITLES = {
  inicio: 'Fan Joy Store', loja: 'Loja', colecoes: 'Coleções', sacola: 'Sacola', checkout: 'Finalizar compra', pedidos: 'Meus pedidos',
  personalizados: 'Encomendas personalizadas', brindes: 'Brindes corporativos', historia: 'Nossa história', atendimento: 'Atendimento',
  politicas: 'Políticas', painel: 'Painel', 'sistema-opcional': 'Sistema opcional',
};

function header() {
  return `
  <div class="demo-bar" role="note">${api.live ? 'Loja em fase de testes · pagamento on-line ainda não ativado' : 'Apresentação demonstrativa · produtos e preços ilustrativos · nenhum pagamento real'}</div>
  <header class="site-header">
    <div class="wrap header-row">
      <a class="brand" href="#inicio" aria-label="Fan Joy Store, página inicial">
        <img src="img/logo.webp" alt="" width="48" height="48">
        <span class="brand-name">fan joy<small>store</small></span>
      </a>
      <nav class="main-nav" id="main-nav" aria-label="Principal">
        <a href="#loja" data-nav="loja">Loja</a>
        <a href="#colecoes" data-nav="colecoes">Coleções</a>
        <a href="#personalizados" data-nav="personalizados">Personalizados</a>
        <a href="#brindes" data-nav="brindes">Brindes</a>
        <a href="#historia" data-nav="historia">Nossa história</a>
        <a href="#atendimento" data-nav="atendimento">Atendimento</a>
      </nav>
      <div class="header-actions">
        <a class="icon-btn" href="#pedidos" aria-label="Meus pedidos"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
        <button class="icon-btn bag-btn" id="bag-btn" type="button" aria-label="Abrir sacola">${icon.bag}<span class="bag-count" id="bag-count" data-testid="bag-count">0</span></button>
        <button class="icon-btn menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Abrir menu">${icon.menu}</button>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="wrap footer-grid">
      <div class="footer-brand"><img src="img/logo.webp" alt="" width="72" height="72" loading="lazy"><p>Pequenas alegrias para quem sente tudo um pouco mais.</p><p class="fine">Fan Joy Store · São Paulo, SP</p></div>
      <div><h2 class="footer-h">Loja</h2><a href="#loja">Todos os produtos</a><a href="#colecoes">Coleções</a><a href="#categoria-freebies">Freebies</a><a href="#colecao-boatoat">BoatOat FM Brasil 2026</a></div>
      <div><h2 class="footer-h">Atendimento</h2><a href="#pedidos">Meus pedidos</a><a href="#atendimento">Dúvidas frequentes</a><a href="#politicas">Entregas, trocas e privacidade</a><a href="#personalizados">Encomendas</a><a href="#brindes">Brindes corporativos</a></div>
      <div><h2 class="footer-h">Pagamento</h2><p class="pay-chips"><span>Pix</span><span>Visa</span><span>Mastercard</span><span>Elo</span></p><h2 class="footer-h">Gestão</h2><a href="#painel">Painel da Lilian</a><a href="#sistema-opcional">Sistema opcional</a></div>
    </div>
    <div class="wrap footer-base">
      <p>Apresentação demonstrativa. A coleção BoatOat FM Brasil 2026 é conceitual e não tem vínculo oficial com os artistas, a produtora ou o evento.</p>
      <p>Criação e desenvolvimento: <strong>VB Studio — Victoria Bellisario</strong></p>
    </div>
  </footer>`;
}

const app = document.getElementById('app');
app.innerHTML = `${header()}<main id="view" tabindex="-1"></main>${footer()}
  <div class="drawer" id="drawer" hidden>
    <div class="drawer-scrim" data-close></div>
    <aside class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer-head"><h2 id="drawer-title" class="h3">Sua sacola</h2><button class="icon-btn drawer-close" type="button" data-close aria-label="Fechar sacola">${icon.close}</button></div>
      <div id="drawer-body"></div>
    </aside>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`;

const view = document.getElementById('view');
const nav = document.getElementById('main-nav');
const menuBtn = document.getElementById('menu-btn');

function updateCount() {
  const n = S.cartCount();
  const el = document.getElementById('bag-count');
  el.textContent = n;
  el.classList.toggle('is-empty', n === 0);
  document.getElementById('bag-btn').setAttribute('aria-label', `Abrir sacola, ${n} ${n === 1 ? 'item' : 'itens'}`);
}

// Imagem do cartão clicado: vira a imagem principal da página do produto (transição de "morph").
let morphFrom = null;
let clickNav = false;
document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a[href^="#"]');
  clickNav = !!anchor;
  const link = e.target.closest('a.card-link, a.line-media, a.line-name');
  morphFrom = link?.getAttribute('href')?.startsWith('#p-') ? (link.querySelector('.card-media, .line-media') || link) : null;
});
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function navigate() {
  if (!render.started) { render(); return; }
  if (reduceMotion()) { render(); return; }
  // Transição animada só quando a pessoa clica num link; demais trocas renderizam na hora, com um fade leve.
  if (document.startViewTransition && clickNav) {
    const from = morphFrom;
    const toProduct = location.hash.startsWith('#p-');
    if (from && toProduct && from.isConnected) from.style.viewTransitionName = 'product-media';
    const t = document.startViewTransition(() => {
      if (from) from.style.viewTransitionName = '';
      render();
      if (from && toProduct) view.querySelector('.pdp-main')?.style.setProperty('view-transition-name', 'product-media');
    });
    t.ready.catch(() => {});
    t.finished.catch(() => {}).finally(() => { view.querySelector('.pdp-main')?.style.removeProperty('view-transition-name'); });
  } else {
    render();
    view.classList.remove('view-enter'); void view.offsetWidth; view.classList.add('view-enter');
  }
  morphFrom = null;
  clickNav = false;
}

function render() {
  const route = decodeURIComponent(location.hash.slice(1)) || 'inicio';
  closeDrawer(true);
  nav.classList.remove('is-open');
  menuBtn.setAttribute('aria-expanded', 'false');
  let r = adminRoute(route) ?? storeRoute(route) ?? notFound();
  if (typeof r === 'string') r = { html: r };
  view.innerHTML = r.html;
  r.mount?.(view);
  document.body.classList.toggle('is-admin', route.startsWith('painel') || route === 'sistema-opcional');
  const base = route.split('-')[0];
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('is-on', a.dataset.nav === route || (base === 'colecao' && a.dataset.nav === 'colecoes') || (base === 'categoria' && a.dataset.nav === 'loja')));
  const h1 = view.querySelector('h1');
  document.title = route === 'inicio' ? 'Fan Joy Store' : `${TITLES[route] || h1?.textContent?.trim() || 'Fan Joy Store'} · Fan Joy Store`;
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  if (render.started) view.focus({ preventScroll: true });
  render.started = true;
}

document.getElementById('bag-btn').onclick = () => openDrawer();
document.getElementById('drawer').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDrawer(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
menuBtn.onclick = () => {
  const open = !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
};
S.subscribe(() => { updateCount(); if (!document.getElementById('drawer').hidden) renderDrawer(); });
window.addEventListener('hashchange', navigate);
updateCount();
// Na loja real, o catálogo vem do banco antes da primeira página.
if (api.live) view.innerHTML = '<section class="section page-top"><div class="wrap"><p class="muted" role="status">Carregando a loja…</p></div></section>';
api.init().catch((e) => {
  console.error(e);
  S.setLiveCatalog([]);
  render();
  view.insertAdjacentHTML('afterbegin', '<div class="wrap"><p class="error" role="alert">Não foi possível carregar os produtos agora. Verifique sua internet e recarregue a página.</p></div>');
}).then(() => { if (!render.started) render(); });

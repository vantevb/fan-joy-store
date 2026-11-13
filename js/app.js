// Roteamento por hash (#inicio, #loja, #p-caneca-ta-bom...) e estrutura comum (cabeçalho, sacola, rodapé).
import * as S from './state.js';
import * as api from './api.js';
import { storeRoute, notFound, openDrawer, closeDrawer, renderDrawer } from './store.js';
import { adminRoute } from './admin.js';
import { icon } from './ui.js';
import { tr, isEn, setLang, chosenLang, forceLang } from './i18n.js';

const TITLES = {
  inicio: ['Fan Joy Store', 'Fan Joy Store'], loja: ['Loja', 'Shop'], colecoes: ['Coleções', 'Collections'], sacola: ['Sacola', 'Bag'], checkout: ['Finalizar compra', 'Checkout'], pedidos: ['Meus pedidos', 'My orders'],
  personalizados: ['Encomendas personalizadas', 'Custom orders'], brindes: ['Brindes corporativos', 'Corporate gifts'], historia: ['Nossa história', 'Our story'], atendimento: ['Atendimento', 'Contact'],
  politicas: ['Políticas', 'Policies'], gestao: ['Gestão', 'Gestão'], 'gestao-sistema': ['Sistema opcional', 'Sistema opcional'],
};
const isAdminRoute = (route) => route.startsWith('gestao');

// Volta do Mercado Pago: ele devolve a cliente para /?pedido=FJ123456 (com parâmetros dele).
// Leva para a página do pedido e marca a volta, para a página conferir a confirmação do pagamento.
(() => {
  const params = new URLSearchParams(location.search);
  const code = params.get('pedido');
  if (!code || !/^[A-Za-z0-9-]{3,20}$/.test(code)) return;
  try { sessionStorage.setItem('fjs:paid-return', code.toUpperCase()); } catch { /* segue sem a conferência automática */ }
  history.replaceState(null, '', `${location.pathname}#pedido-${code.toUpperCase()}`);
})();

function header() {
  return `
  <div class="demo-bar" role="note">${api.paymentTest ? 'MODO DE TESTE DO PAGAMENTO LIGADO NESTA ABA · use só os cartões de teste do Mercado Pago' : api.onlinePayment ? tr('Pix com 5% de desconto · até 3× sem juros no cartão · envio para todo o Brasil', '5% off with Pix · up to 3 interest-free card installments · shipping within Brazil only') : api.live ? tr('Loja em fase de testes · pagamento on-line ainda não ativado', 'Shop in testing phase · online payment not active yet · shipping within Brazil only') : tr('Apresentação demonstrativa · produtos e preços ilustrativos · nenhum pagamento real', 'Demo shop · illustrative products and prices · no real payments')}</div>
  <header class="site-header">
    <div class="wrap header-row">
      <a class="brand" href="#inicio" aria-label="${tr('Fan Joy Store, página inicial', 'Fan Joy Store, home page')}">
        <img src="img/logo.webp" alt="" width="48" height="48">
        <span class="brand-name">fan joy<small>store</small></span>
      </a>
      <nav class="main-nav" id="main-nav" aria-label="${tr('Principal', 'Main')}">
        <a href="#loja" data-nav="loja">${tr('Loja', 'Shop')}</a>
        <a href="#colecoes" data-nav="colecoes">${tr('Coleções', 'Collections')}</a>
        <a href="#personalizados" data-nav="personalizados">${tr('Personalizados', 'Custom')}</a>
        <a href="#brindes" data-nav="brindes">${tr('Brindes', 'Corporate')}</a>
        <a href="#historia" data-nav="historia">${tr('Nossa história', 'Our story')}</a>
        <a href="#atendimento" data-nav="atendimento">${tr('Atendimento', 'Contact')}</a>
      </nav>
      <div class="header-actions">
        <div class="lang-switch" role="group" aria-label="${tr('Idioma', 'Language')}">
          <button type="button" data-lang="pt" lang="pt-BR" aria-pressed="${chosenLang() === 'pt'}" aria-label="Português">PT</button>
          <button type="button" data-lang="en" lang="en" aria-pressed="${chosenLang() === 'en'}" aria-label="English">EN</button>
        </div>
        <a class="icon-btn" href="#pedidos" aria-label="${tr('Meus pedidos', 'My orders')}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
        <button class="icon-btn bag-btn" id="bag-btn" type="button" aria-label="${tr('Abrir sacola', 'Open bag')}">${icon.bag}<span class="bag-count" id="bag-count" data-testid="bag-count">0</span></button>
        <button class="icon-btn menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="${tr('Abrir menu', 'Open menu')}">${icon.menu}</button>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="wrap footer-grid">
      <div class="footer-brand"><img src="img/logo.webp" alt="" width="72" height="72" loading="lazy"><p>${tr('Pequenas alegrias para quem sente tudo um pouco mais.', 'Small joys for people who feel everything a little more.')}</p><p class="fine">Fan Joy Store · São Paulo, SP</p></div>
      <div><h2 class="footer-h">${tr('Loja', 'Shop')}</h2><a href="#loja">${tr('Todos os produtos', 'All products')}</a><a href="#colecoes">${tr('Coleções', 'Collections')}</a><a href="#categoria-freebies">Freebies</a><a href="#colecao-boatoat">BoatOat FM Brasil 2026</a></div>
      <div><h2 class="footer-h">${tr('Atendimento', 'Help')}</h2><a href="#pedidos">${tr('Meus pedidos', 'My orders')}</a><a href="#atendimento">${tr('Dúvidas frequentes', 'FAQ')}</a><a href="#politicas">${tr('Entregas, trocas e privacidade', 'Shipping, returns and privacy')}</a><a href="#personalizados">${tr('Encomendas', 'Custom orders')}</a><a href="#brindes">${tr('Brindes corporativos', 'Corporate gifts')}</a></div>
      <div><h2 class="footer-h">${tr('Pagamento', 'Payment')}</h2><p class="pay-chips"><span>Pix</span><span>Visa</span><span>Mastercard</span><span>Elo</span></p></div>
    </div>
    <div class="wrap footer-base">
      <p>${api.live ? '' : tr('Apresentação demonstrativa. ', 'Demo shop. ')}${tr('A coleção BoatOat FM Brasil 2026 é conceitual e não tem vínculo oficial com os artistas, a produtora ou o evento.', 'The BoatOat FM Brasil 2026 collection is a concept collection with no official connection to the artists, the producer or the event.')}</p>
      <p>${tr('Criação e desenvolvimento', 'Design and development')}: <strong>VB Studio — Victoria Bellisario</strong></p>
    </div>
    <div class="wrap footer-ip">
      <p>© ${new Date().getFullYear()} Fan Joy Store. ${tr('Todas as artes, ilustrações, fotos e textos deste site são de autoria da Fan Joy Store e protegidos pela Lei de Direitos Autorais (Lei nº 9.610/1998). É proibido copiar, reproduzir, imprimir, vender ou usar as nossas artes, no todo ou em parte, sem autorização por escrito.', 'All artwork, illustrations, photos and text on this site are created by Fan Joy Store and protected by Brazilian copyright law (Law 9,610/1998). Copying, reproducing, printing, selling or using our art, in whole or in part, without written permission is prohibited.')} <a href="#politicas">${tr('Saiba mais', 'Learn more')}</a></p>
    </div>
  </footer>`;
}

const app = document.getElementById('app');
// Cabeçalho e rodapé ficam em contêineres próprios para serem refeitos quando o idioma muda.
app.innerHTML = `<div id="chrome-top" class="chrome"></div><main id="view" tabindex="-1"></main><div id="chrome-bottom" class="chrome"></div>
  <div class="drawer" id="drawer" hidden>
    <div class="drawer-scrim" data-close></div>
    <aside class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer-head"><h2 id="drawer-title" class="h3"></h2><button class="icon-btn drawer-close" type="button" data-close>${icon.close}</button></div>
      <div id="drawer-body"></div>
    </aside>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`;

const view = document.getElementById('view');
const nav = () => document.getElementById('main-nav');
const menuBtn = () => document.getElementById('menu-btn');

function chrome() {
  document.getElementById('chrome-top').innerHTML = header();
  document.getElementById('chrome-bottom').innerHTML = footer();
  document.getElementById('drawer-title').textContent = tr('Sua sacola', 'Your bag');
  document.querySelector('.drawer-close').setAttribute('aria-label', tr('Fechar sacola', 'Close bag'));
  document.getElementById('bag-btn').onclick = () => openDrawer();
  menuBtn().onclick = () => {
    const open = !nav().classList.contains('is-open');
    nav().classList.toggle('is-open', open);
    menuBtn().setAttribute('aria-expanded', String(open));
  };
  document.querySelectorAll('.lang-switch [data-lang]').forEach((b) => { b.onclick = () => setLang(b.dataset.lang); });
  updateCount();
}

function updateCount() {
  const n = S.cartCount();
  const el = document.getElementById('bag-count');
  el.textContent = n;
  el.classList.toggle('is-empty', n === 0);
  document.getElementById('bag-btn').setAttribute('aria-label', tr(`Abrir sacola, ${n} ${n === 1 ? 'item' : 'itens'}`, `Open bag, ${n} ${n === 1 ? 'item' : 'items'}`));
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

// Espera a página nova ficar pronta antes de mostrá-la: os dados do banco (painel, pedido)
// e as imagens visíveis na tela. Sem isso a página entra vazia e o conteúdo "pula" depois.
// Tem limite de tempo para a navegação nunca travar se a internet estiver lenta.
const READY_LIMIT_MS = 900;
function whenReady(mounted) {
  const images = () => Promise.all([...view.querySelectorAll('img')]
    .filter((img) => !img.complete && img.getBoundingClientRect().top < window.innerHeight)
    .map((img) => img.decode().catch(() => {})));
  const ready = Promise.resolve(mounted).catch(() => {}).then(images);
  return Promise.race([ready, new Promise((r) => setTimeout(r, READY_LIMIT_MS))]);
}

let navSeq = 0;
function navigate() {
  const seq = ++navSeq;
  view.style.opacity = '';
  if (!render.started) { render(); return; }
  if (reduceMotion()) { render(); return; }
  // Transição animada só quando a pessoa clica num link; demais trocas renderizam na hora, com um fade leve.
  if (document.startViewTransition && clickNav) {
    const from = morphFrom;
    const toProduct = location.hash.startsWith('#p-');
    if (from && toProduct && from.isConnected) from.style.viewTransitionName = 'product-media';
    const t = document.startViewTransition(async () => {
      if (from) from.style.viewTransitionName = '';
      const mounted = render();
      if (from && toProduct) view.querySelector('.pdp-main')?.style.setProperty('view-transition-name', 'product-media');
      await whenReady(mounted);
    });
    t.ready.catch(() => {});
    t.finished.catch(() => {}).finally(() => { view.querySelector('.pdp-main')?.style.removeProperty('view-transition-name'); });
  } else {
    const mounted = render();
    view.classList.remove('view-enter');
    view.style.opacity = '0';
    whenReady(mounted).then(() => {
      if (seq !== navSeq) return; // a pessoa já foi para outra página
      view.style.opacity = '';
      void view.offsetWidth;
      view.classList.add('view-enter');
    });
  }
  morphFrom = null;
  clickNav = false;
}

let adminView = null;
// Endereços antigos da gestão (#painel…, #sistema-opcional) levam aos novos.
const OLD_ADMIN = { painel: 'gestao', 'painel-pedidos': 'gestao-pedidos', 'painel-produtos': 'gestao-produtos', 'painel-solicitacoes': 'gestao-solicitacoes', 'painel-relatorios': 'gestao-relatorios', 'sistema-opcional': 'gestao-sistema' };
function render() {
  const asked = decodeURIComponent(location.hash.slice(1));
  if (OLD_ADMIN[asked]) history.replaceState(null, '', `#${OLD_ADMIN[asked]}`);
  const route = OLD_ADMIN[asked] || asked || 'inicio';
  // A gestão fica sempre em português, qualquer que seja o idioma escolhido na loja.
  const admin = isAdminRoute(route);
  if (admin !== adminView) { adminView = admin; forceLang(admin ? 'pt' : null); chrome(); }
  closeDrawer(true);
  nav().classList.remove('is-open');
  menuBtn().setAttribute('aria-expanded', 'false');
  let r = adminRoute(route) ?? storeRoute(route) ?? notFound();
  if (typeof r === 'string') r = { html: r };
  view.innerHTML = r.html;
  const mounted = r.mount?.(view);
  document.body.classList.toggle('is-admin', admin);
  const base = route.split('-')[0];
  nav().querySelectorAll('a').forEach((a) => a.classList.toggle('is-on', a.dataset.nav === route || (base === 'colecao' && a.dataset.nav === 'colecoes') || (base === 'categoria' && a.dataset.nav === 'loja')));
  const h1 = view.querySelector('h1');
  document.title = route === 'inicio' ? 'Fan Joy Store' : `${TITLES[route]?.[isEn() ? 1 : 0] || h1?.textContent?.trim() || 'Fan Joy Store'} · Fan Joy Store`;
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  if (render.started) view.focus({ preventScroll: true });
  render.started = true;
  return mounted;
}

document.getElementById('drawer').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDrawer(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
S.subscribe(() => { updateCount(); if (!document.getElementById('drawer').hidden) renderDrawer(); });
window.addEventListener('hashchange', navigate);
// As artes são da loja: bloqueia o menu do botão direito e o arrastar das imagens.
document.addEventListener('contextmenu', (e) => { if (e.target.closest('img, svg.art, .card-media, .pdp-main, .hero-art, .boat-arts')) e.preventDefault(); });
document.addEventListener('dragstart', (e) => { if (e.target.closest('img')) e.preventDefault(); });
// Troca de idioma: refaz cabeçalho, rodapé e a página atual, sem sair dela.
window.addEventListener('langchange', () => {
  const y = window.scrollY;
  chrome();
  if (render.started) { render(); window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
});
chrome();
// Na loja real, o catálogo vem do banco antes da primeira página.
if (api.live) view.innerHTML = `<section class="section page-top"><div class="wrap"><p class="muted" role="status">${tr('Carregando a loja…', 'Loading the shop…')}</p></div></section>`;
api.init().catch((e) => {
  console.error(e);
  S.setLiveCatalog([]);
  render();
  view.insertAdjacentHTML('afterbegin', `<div class="wrap"><p class="error" role="alert">${tr('Não foi possível carregar os produtos agora. Verifique sua internet e recarregue a página.', 'We couldn’t load the products right now. Check your connection and reload the page.')}</p></div>`);
}).then(() => { if (!render.started) render(); });

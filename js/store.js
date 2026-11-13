// Páginas da loja: início, catálogo, produto, sacola, checkout, pedidos e páginas institucionais.
// Todos os textos aparecem em português ou inglês (tr), conforme o idioma escolhido (js/i18n.js).
import { FAQ, BRAND } from './data.js';
import * as S from './state.js';
import * as api from './api.js';
import { tr, isEn } from './i18n.js';
import { brl, esc, priceLabel, productMedia, toast, icon, fmtDateTime } from './ui.js';

const go = (hash) => { location.hash = hash; };
const days = (n) => tr(n === 1 ? 'dia útil' : 'dias úteis', n === 1 ? 'business day' : 'business days');

// ---------- Blocos reutilizáveis ----------
function availabilityPill(p) {
  const a = S.availability(p);
  return `<span class="pill pill-${a.id}">${esc(a.label)}</span>`;
}

export function productCard(p) {
  const a = S.availability(p);
  const isNew = Date.now() - p.createdAt < 30 * 86400000;
  return `<article class="card" data-testid="product-card">
    <a class="card-link" href="#p-${p.id}" aria-label="${esc(p.name)}">
      <div class="card-media tone-${esc(p.art?.bg || 'cream')}">${productMedia(p)}
        <div class="card-tags">${isNew && p.active ? `<span class="tag tag-new">${tr('Novo', 'New')}</span>` : ''}${a.id === 'encomenda' ? `<span class="tag">${tr('Sob encomenda', 'Made to order')}</span>` : ''}${a.id === 'esgotado' || a.id === 'indisponivel' ? `<span class="tag tag-off">${tr('Indisponível', 'Unavailable')}</span>` : ''}${a.id === 'ultimas' ? `<span class="tag tag-warn">${tr('Últimas unidades', 'Almost gone')}</span>` : ''}</div>
      </div>
      <div class="card-body">
        <p class="card-coll">${esc(S.collectionName(p.collection))}</p>
        <h3 class="card-title">${esc(p.name)}</h3>
        <p class="card-price">${priceLabel(p)}</p>
      </div>
    </a>
  </article>`;
}

const grid = (list) => list.length
  ? `<div class="grid-products">${list.map(productCard).join('')}</div>`
  : `<p class="empty">${tr('Nenhum produto encontrado com esses filtros. Tente limpar a busca ou escolher outra categoria.', 'No products match these filters. Try clearing the search or picking another category.')}</p>`;

const conceptNote = () => `<p class="concept-note"><strong>${tr('Coleção conceitual.', 'Concept collection.')}</strong> ${tr('Criada a partir das artes da Lilian, sem vínculo oficial com os artistas, a produtora ou o evento.', 'Created from Lilian’s art, with no official connection to the artists, the producer or the event.')}${api.live ? '' : ` ${tr('Produtos, materiais e preços são ilustrativos.', 'Products, materials and prices are illustrative.')}`}</p>`;

// Cada pergunta pode valer só para a demonstração (demo), para a loja sem pagamento on-line (live) ou com ele (online).
const faqItems = () => FAQ.filter((f) => (api.onlinePayment ? !f.demo && !f.live : api.live ? !f.demo && !f.online : !f.live && !f.online));
const faqList = (items) => `<div class="faq">${items.map((f) => `<details><summary>${esc(isEn() && f.en ? f.en.q : f.q)}</summary><p>${esc(isEn() && f.en ? f.en.a : f.a)}</p></details>`).join('')}</div>`;

// ---------- Início ----------
function home() {
  const all = S.products().filter((p) => p.active);
  const featured = all.filter((p) => p.featured);
  return `
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow"><span class="dot"></span> ${tr('Artes da Lilian · feito em São Paulo', 'Art by Lilian · made in São Paulo, Brazil')}</p>
        <h1 class="display">${tr('Seu fandom,<br><em>desenhado</em> com carinho.', 'Your fandom,<br><em>drawn</em> with love.')}</h1>
        <p class="lead">${tr('Canecas, papelaria, photocards e presentes para fãs de K-pop, BTS, doramas e BL. Cada peça começa num desenho feito à mão.', 'Mugs, stationery, photocards and gifts for K-pop, BTS, K-drama and BL fans. Every piece starts as a hand-drawn sketch.')}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#loja">${tr('Ver a loja', 'Shop now')} ${icon.arrow}</a>
          <a class="btn btn-ghost" href="#colecao-boatoat">${tr('Coleção BoatOat', 'BoatOat collection')}</a>
        </div>
        <ul class="hero-facts">
          <li>${tr('<strong>Pix</strong> com 5% de desconto', '<strong>5% off</strong> with Pix')}</li>
          <li>${tr('<strong>3×</strong> sem juros no cartão', '<strong>3</strong> interest-free card installments')}</li>
          <li>${tr('<strong>Envio</strong> para todo o Brasil', '<strong>Shipping</strong> anywhere in Brazil')}</li>
        </ul>
      </div>
      <figure class="hero-art">
        <div class="hero-frame frame-a"><img src="img/arte-ta-bom.webp" alt="${tr('Arte “Tá bom!” da Lilian aplicada em canecas', 'Lilian’s “Tá bom!” art printed on mugs')}" width="1200" height="800" fetchpriority="high"></div>
        <div class="hero-frame frame-b"><img src="img/banner-boat.webp" alt="${tr('Banner “A frase favorita do Boat: Tá bom”, arte da Lilian', 'Banner “Boat’s favorite phrase: Tá bom”, art by Lilian')}" width="1400" height="630"></div>
        <figcaption>${tr('Artes da Lilian · coleção conceitual BoatOat FM Brasil 2026', 'Art by Lilian · BoatOat FM Brasil 2026 concept collection')}</figcaption>
      </figure>
    </div>
  </section>

  <div class="band" aria-label="${tr('Diferenciais', 'Highlights')}">
    <div class="wrap band-row">
      <span>${tr('Arte autoral', 'Original art')}</span><span class="spark">${icon.star}</span>
      <span>${tr('Personalize com nome ou frase', 'Add a name or phrase')}</span><span class="spark">${icon.star}</span>
      <span>${tr('Brindes para empresas', 'Corporate gifts')}</span><span class="spark">${icon.star}</span>
      <span>${tr('Freebies para a comunidade', 'Freebies for the community')}</span>
    </div>
  </div>

  <section class="section">
    <div class="wrap story">
      <div class="story-copy">
        <p class="eyebrow">${tr('Coleção conceitual · BoatOat FM Brasil 2026', 'Concept collection · BoatOat FM Brasil 2026')}</p>
        <h2 class="h2">${tr('Virou coisa nossa.', 'It became our thing.')}</h2>
        <p>${tr('No fanmeeting no Brasil, o Boat respondia “Tá bom!” para quase tudo. Virou a resposta oficial do fandom.', 'At the fan meeting in Brazil, Boat answered “Tá bom!” (“Okay!”) to almost everything. It became the fandom’s official answer.')}</p>
        <p>${tr('A Lilian transformou essa lembrança em arte. Dela nasceram a caneca e o banner “Tá bom!”.', 'Lilian turned that memory into art, and the art became the “Tá bom!” mug and banner.')}</p>
        <a class="btn btn-primary" href="#colecao-boatoat">${tr('Conhecer a coleção', 'See the collection')} ${icon.arrow}</a>
        ${conceptNote()}
      </div>
      <div class="story-quotes" aria-hidden="true">
        <span class="bubble bubble-a">Tá bom!</span>
      </div>
    </div>
  </section>

  <section class="section section-tint">
    <div class="wrap">
      <div class="section-head">
        <div><p class="eyebrow">${tr('Coleções', 'Collections')}</p><h2 class="h2">${tr('Cada paixão tem um universo.', 'Every passion has its own world.')}</h2></div>
        <a class="link" href="#colecoes">${tr('Todas as coleções', 'All collections')} ${icon.arrow}</a>
      </div>
      <div class="grid-collections">${S.COLLECTIONS.map(collectionTile).join('')}</div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div><p class="eyebrow">${tr('Destaques', 'Featured')}</p><h2 class="h2">${tr('Os queridinhos da Lilian.', 'Lilian’s favorites.')}</h2></div>
        <a class="link" href="#loja">${tr('Ver todos os produtos', 'See all products')} ${icon.arrow}</a>
      </div>
      ${grid(featured)}
      <div class="chips chips-cats">${S.CATEGORIES.map((c) => `<a class="chip" href="#categoria-${c.id}">${esc(S.categoryName(c.id))}</a>`).join('')}</div>
    </div>
  </section>

  <section class="section section-navy">
    <div class="wrap split">
      <a class="cta-card" href="#personalizados">
        <p class="eyebrow">${tr('Encomendas personalizadas', 'Custom orders')}</p>
        <h3 class="h3">${tr('Tem uma ideia? A Lilian desenha.', 'Got an idea? Lilian will draw it.')}</h3>
        <p>${tr('Presente para alguém especial, kit para o seu fã-clube ou uma arte do seu casal favorito.', 'A gift for someone special, a kit for your fan club or art of your favorite couple.')}</p>
        <span class="link">${tr('Contar minha ideia', 'Share my idea')} ${icon.arrow}</span>
      </a>
      <a class="cta-card cta-yellow" href="#brindes">
        <p class="eyebrow">${tr('Para empresas', 'For companies')}</p>
        <h3 class="h3">${tr('Brindes com personalidade.', 'Gifts with personality.')}</h3>
        <p>${tr('Canecas, cadernos e ecobags com arte criada para a sua marca, a partir de 20 unidades.', 'Mugs, notebooks and tote bags with art made for your brand, from 20 units.')}</p>
        <span class="link">${tr('Pedir orçamento', 'Request a quote')} ${icon.arrow}</span>
      </a>
    </div>
  </section>

  <section class="section">
    <div class="wrap about">
      <img src="img/logo.webp" alt="${tr('Logo da Fan Joy Store: flor vermelha sorridente dentro de um selo azul-marinho', 'Fan Joy Store logo: a smiling red flower inside a navy badge')}" width="360" height="360" loading="lazy">
      <div>
        <p class="eyebrow">${tr('De fã para fã', 'From fan to fan')}</p>
        <h2 class="h2">${tr('Uma loja feita por quem também sente tudo um pouco mais.', 'A shop made by someone who also feels everything a little more.')}</h2>
        <p>${tr('A Fan Joy Store nasce da criatividade da Lilian, em São Paulo, e da vontade de transformar paixões em arte para o dia a dia.', 'Fan Joy Store was born from Lilian’s creativity in São Paulo, and from wanting to turn fandom love into art for everyday life.')}</p>
        <a class="link" href="#historia">${tr('Nossa história', 'Our story')} ${icon.arrow}</a>
      </div>
    </div>
  </section>

  <section class="section section-tint">
    <div class="wrap faq-wrap">
      <div><p class="eyebrow">${tr('Dúvidas frequentes', 'FAQ')}</p><h2 class="h2">${tr('Antes de escolher.', 'Before you choose.')}</h2><a class="link" href="#atendimento">${tr('Falar com a gente', 'Talk to us')} ${icon.arrow}</a></div>
      ${faqList(faqItems().slice(0, 4))}
    </div>
  </section>`;
}

function collectionTile(raw) {
  const c = S.collectionView(raw);
  const count = S.products().filter((p) => p.collection === c.id && p.active).length;
  return `<a class="coll tone-${c.tone}" href="#colecao-${c.id}">
    ${c.image ? `<img src="${c.image}" alt="" loading="lazy">` : ''}
    <span class="coll-meta">${count} ${tr(count === 1 ? 'produto' : 'produtos', count === 1 ? 'product' : 'products')}${c.concept ? tr(' · conceitual', ' · concept') : ''}</span>
    <strong class="coll-name">${esc(c.name)}</strong>
    <span class="coll-tag">${esc(c.tagline)}</span>
  </a>`;
}

// ---------- Catálogo ----------
const filters = { q: '', cat: '', coll: '', avail: '', custom: false, sort: 'destaques', max: 200 };

function catalog(preset = {}) {
  Object.assign(filters, preset);
  return {
    html: `<section class="section page-top">
      <div class="wrap">
        <p class="eyebrow">${tr('Loja', 'Shop')}</p>
        <h1 class="h1">${tr('Encontre o seu favorito.', 'Find your favorite.')}</h1>
        <div class="catalog">
          <aside class="filters" aria-label="${tr('Filtros', 'Filters')}">
            <details class="filters-box" open>
              <summary>${tr('Filtros', 'Filters')}</summary>
              <label class="field"><span>${tr('Categoria', 'Category')}</span>
                <select id="f-cat"><option value="">${tr('Todas', 'All')}</option>${S.CATEGORIES.map((c) => `<option value="${c.id}">${esc(S.categoryName(c.id))}</option>`).join('')}</select></label>
              <label class="field"><span>${tr('Coleção', 'Collection')}</span>
                <select id="f-coll"><option value="">${tr('Todas', 'All')}</option>${S.COLLECTIONS.map((c) => `<option value="${c.id}">${esc(S.collectionName(c.id))}</option>`).join('')}</select></label>
              <fieldset class="field"><legend>${tr('Disponibilidade', 'Availability')}</legend>
                <label class="check"><input type="radio" name="f-avail" value="" id="f-av-all"> ${tr('Todas', 'All')}</label>
                <label class="check"><input type="radio" name="f-avail" value="pronta" id="f-av-pronta"> ${tr('Pronta entrega', 'In stock')}</label>
                <label class="check"><input type="radio" name="f-avail" value="encomenda" id="f-av-enc"> ${tr('Sob encomenda', 'Made to order')}</label>
              </fieldset>
              <label class="check"><input type="checkbox" id="f-custom"> ${tr('Personalizável', 'Customizable')}</label>
              <label class="field"><span>${tr('Preço até', 'Price up to')} <output id="f-max-out"></output></span>
                <input type="range" id="f-max" min="10" max="200" step="5"></label>
              <button class="btn btn-small btn-ghost" id="f-clear" type="button">${tr('Limpar filtros', 'Clear filters')}</button>
            </details>
          </aside>
          <div class="catalog-main">
            <div class="catalog-bar">
              <label class="search">${icon.search}<span class="sr">${tr('Buscar produtos', 'Search products')}</span><input id="f-q" type="search" placeholder="${tr('Buscar por produto, coleção ou frase', 'Search by product, collection or phrase')}"></label>
              <label class="sort"><span>${tr('Ordenar', 'Sort by')}</span>
                <select id="f-sort">
                  <option value="destaques">${tr('Destaques', 'Featured')}</option><option value="novidades">${tr('Novidades', 'Newest')}</option>
                  <option value="menor">${tr('Menor preço', 'Price: low to high')}</option><option value="maior">${tr('Maior preço', 'Price: high to low')}</option><option value="nome">${tr('Nome (A–Z)', 'Name (A–Z)')}</option>
                </select></label>
            </div>
            <p class="result-count" id="f-count" aria-live="polite"></p>
            <div id="f-results"></div>
          </div>
        </div>
      </div>
    </section>`,
    mount(root) {
      const $ = (s) => root.querySelector(s);
      $('#f-cat').value = filters.cat; $('#f-coll').value = filters.coll; $('#f-q').value = filters.q;
      $('#f-sort').value = filters.sort; $('#f-custom').checked = filters.custom; $('#f-max').value = filters.max;
      root.querySelector(`input[name="f-avail"][value="${filters.avail}"]`).checked = true;
      const render = () => {
        $('#f-max-out').textContent = brl(Number(filters.max));
        const q = filters.q.trim().toLowerCase();
        let list = S.products().filter((p) => p.active || filters.avail === '')
          .filter((p) => !filters.cat || p.category === filters.cat)
          .filter((p) => !filters.coll || p.collection === filters.coll)
          .filter((p) => !filters.avail || (filters.avail === 'pronta' ? p.mode === 'pronta' && p.stock > 0 : p.mode === 'encomenda'))
          .filter((p) => !filters.custom || p.personalization)
          .filter((p) => p.price == null || p.price <= Number(filters.max))
          .filter((p) => !q || [p.name, p.short, S.collectionName(p.collection), S.categoryName(p.category)].join(' ').toLowerCase().includes(q));
        const by = {
          destaques: (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.active - a.active),
          novidades: (a, b) => b.createdAt - a.createdAt,
          menor: (a, b) => (a.price ?? 9999) - (b.price ?? 9999),
          maior: (a, b) => (b.price ?? -1) - (a.price ?? -1),
          nome: (a, b) => a.name.localeCompare(b.name, isEn() ? 'en' : 'pt-BR'),
        };
        list = list.sort(by[filters.sort]);
        // Itens indisponíveis sempre por último
        list.sort((a, b) => (S.availability(a).buyable || a.mode === 'gratis' || a.mode === 'orcamento' ? 0 : 1) - (S.availability(b).buyable || b.mode === 'gratis' || b.mode === 'orcamento' ? 0 : 1));
        $('#f-count').textContent = `${list.length} ${tr(list.length === 1 ? 'produto' : 'produtos', list.length === 1 ? 'product' : 'products')}`;
        $('#f-results').innerHTML = grid(list);
      };
      $('#f-cat').onchange = (e) => { filters.cat = e.target.value; render(); };
      $('#f-coll').onchange = (e) => { filters.coll = e.target.value; render(); };
      $('#f-sort').onchange = (e) => { filters.sort = e.target.value; render(); };
      $('#f-q').oninput = (e) => { filters.q = e.target.value; render(); };
      $('#f-custom').onchange = (e) => { filters.custom = e.target.checked; render(); };
      $('#f-max').oninput = (e) => { filters.max = e.target.value; render(); };
      root.querySelectorAll('input[name="f-avail"]').forEach((r) => { r.onchange = () => { filters.avail = r.value; render(); }; });
      $('#f-clear').onclick = () => { Object.assign(filters, { q: '', cat: '', coll: '', avail: '', custom: false, sort: 'destaques', max: 200 }); go('#loja'); window.dispatchEvent(new HashChangeEvent('hashchange')); };
      if (window.matchMedia('(max-width: 860px)').matches) root.querySelector('.filters-box').open = false;
      render();
    },
  };
}

// ---------- Coleções ----------
function collections() {
  return `<section class="section page-top"><div class="wrap">
    <p class="eyebrow">${tr('Coleções', 'Collections')}</p><h1 class="h1">${tr('Universos que se encontram.', 'Worlds that meet.')}</h1>
    <p class="lead narrow">${tr('Cada coleção reúne produtos com a mesma história. As artes das coleções Dorama Club, Sweet Memories e BL Diaries são modelos demonstrativos até a Lilian enviar as definitivas.', 'Each collection brings together products that share a story. The Dorama Club, Sweet Memories and BL Diaries designs are placeholders until Lilian sends the final art.')}</p>
    <div class="grid-collections">${S.COLLECTIONS.map(collectionTile).join('')}</div>
  </div></section>`;
}

function collectionPage(id) {
  const raw = S.COLLECTIONS.find((x) => x.id === id);
  if (!raw) return notFound();
  const c = S.collectionView(raw);
  const list = S.products().filter((p) => p.collection === id && p.active);
  if (id === 'boatoat') {
    return `<section class="boat-hero">
      <div class="wrap boat-grid">
        <div>
          <p class="eyebrow">${tr(`Coleção conceitual · ${list.length} ${list.length === 1 ? 'produto' : 'produtos'}`, `Concept collection · ${list.length} ${list.length === 1 ? 'product' : 'products'}`)}</p>
          <h1 class="display">BoatOat FM<br>Brasil 2026</h1>
          <p class="lead">${tr('A arte da Lilian, um bordão e uma piada interna que o fandom inteiro entendeu.', 'Lilian’s art, one catchphrase and an inside joke the whole fandom got.')}</p>
          ${conceptNote()}
        </div>
        <div class="boat-arts">
          <figure><img src="img/arte-ta-bom.webp" alt="${tr('Arte “Tá bom!” da Lilian aplicada em canecas, com as vistas lado esquerdo, meio e lado direito', 'Lilian’s “Tá bom!” art on mugs, shown from the left, middle and right')}" width="1200" height="800"><figcaption>${tr('Arte · “Tá bom!”', 'Art · “Tá bom!”')}</figcaption></figure>
          <figure><img src="img/banner-boat.webp" alt="${tr('Banner “A frase favorita do Boat: Tá bom”, arte da Lilian', 'Banner “Boat’s favorite phrase: Tá bom”, art by Lilian')}" width="1400" height="630"><figcaption>${tr('Banner do Boat · “Tá bom”', 'Boat banner · “Tá bom”')}</figcaption></figure>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="wrap joke">
        <div class="joke-step"><span class="bubble bubble-a">Tá bom!</span><p>${tr('Durante o fanmeeting no Brasil, o Boat repetia “Tá bom!” a cada pergunta, pedido ou grito da plateia. Virou trilha sonora da noite.', 'During the fan meeting in Brazil, Boat kept saying “Tá bom!” (“Okay!”) to every question, request and scream from the crowd. It became the soundtrack of the night.')}</p></div>
        <div class="joke-step joke-end"><h2 class="h2">${tr('Virou coisa nossa.', 'It became our thing.')}</h2><p>${tr('A Lilian transformou a lembrança em arte para guardar o que o fandom viveu junto.', 'Lilian turned the memory into art to keep what the fandom lived together.')}</p></div>
      </div>
    </section>
    <section class="section section-tint"><div class="wrap">
      <div class="section-head"><div><p class="eyebrow">${tr('A coleção', 'The collection')}</p><h2 class="h2">${tr('Para levar a piada com você.', 'Carry the joke with you.')}</h2></div></div>
      ${grid(list)}
      ${api.live ? '' : `<p class="fine">${tr('Mockups ilustrativos para apresentação. Materiais, medidas e preços serão confirmados pela Fan Joy Store antes das vendas.', 'Illustrative mockups. Materials, sizes and prices will be confirmed by Fan Joy Store before sales open.')}</p>`}
    </div></section>`;
  }
  return `<section class="section page-top"><div class="wrap">
    <p class="eyebrow">${tr('Coleção', 'Collection')}</p><h1 class="h1">${esc(c.name)}</h1>
    <p class="lead narrow">${esc(c.summary)}</p>
    ${grid(list)}
    <p class="fine">${tr('As artes desta coleção são modelos demonstrativos criados pela VB Studio.', 'The designs in this collection are placeholders created by VB Studio.')}</p>
  </div></section>`;
}

// ---------- Produto ----------
function productPage(id) {
  const p = S.product(id);
  if (!p) return notFound();
  const a = S.availability(p);
  const gallery = [...(p.images || [])];
  if (p.collection === 'boatoat') {
    for (const art of [{ src: 'img/arte-ta-bom.webp', alt: tr('Arte original “Tá bom!” da Lilian', 'Lilian’s original “Tá bom!” art'), fit: 'contain' }]) {
      if (!gallery.some((g) => g.src === art.src)) gallery.push(art);
    }
  }
  const related = S.products().filter((x) => x.id !== p.id && x.active && (x.collection === p.collection || x.category === p.category)).slice(0, 4);
  const selected = {};
  for (const v of p.variations) selected[v.name] = v.options[0].label;
  const qtyMax = p.mode === 'pronta' ? Math.max(1, Math.min(20, p.stock)) : 20;

  let buy = '';
  if (a.buyable) {
    buy = `
      ${p.variations.map((v) => `<fieldset class="variation"><legend>${esc(S.optionText(p, v.name, '').name)}</legend><div class="opts">
        ${v.options.map((o, i) => `<label class="opt"><input type="radio" name="v-${esc(v.name)}" value="${esc(o.label)}" ${i === 0 ? 'checked' : ''}><span>${esc(S.optionText(p, v.name, o.label).label)}${o.add ? ` <small>+ ${brl(o.add)}</small>` : ''}</span></label>`).join('')}
      </div></fieldset>`).join('')}
      ${p.personalization ? `<label class="field" for="pz"><span>${esc(p.personalization.label)} <small>(${tr(`opcional, até ${p.personalization.max} caracteres`, `optional, up to ${p.personalization.max} characters`)})</small></span>
        <input id="pz" maxlength="${p.personalization.max}" placeholder="${esc(p.personalization.placeholder)}">
        <small class="counter" id="pz-count">0/${p.personalization.max}</small></label>` : ''}
      <div class="buy-row">
        <div class="stepper" role="group" aria-label="${tr('Quantidade', 'Quantity')}">
          <button type="button" id="q-minus" aria-label="${tr('Diminuir quantidade', 'Decrease quantity')}">−</button>
          <input id="qty" type="number" min="1" max="${qtyMax}" value="1" aria-label="${tr('Quantidade', 'Quantity')}">
          <button type="button" id="q-plus" aria-label="${tr('Aumentar quantidade', 'Increase quantity')}">+</button>
        </div>
        <button class="btn btn-primary btn-wide" id="add" type="button">${tr('Adicionar à sacola', 'Add to bag')}</button>
      </div>`;
  } else if (p.mode === 'gratis') {
    buy = `<button class="btn btn-primary btn-wide" id="free" type="button">${tr('Baixar grátis', 'Free download')}</button>`;
  } else if (p.mode === 'orcamento') {
    buy = `<a class="btn btn-primary btn-wide" href="#brindes">${tr('Pedir orçamento', 'Request a quote')} ${icon.arrow}</a>`;
  } else {
    buy = `<p class="notice">${tr('Este produto está indisponível no momento. Ele volta para a loja quando houver nova tiragem.', 'This product is unavailable right now. It will be back when there’s a new batch.')}</p>`;
  }

  return {
    html: `<section class="section page-top"><div class="wrap">
      <nav class="crumbs" aria-label="${tr('Você está em', 'You are here')}"><a href="#inicio">${tr('Início', 'Home')}</a> / <a href="#categoria-${p.category}">${esc(S.categoryName(p.category))}</a> / <span>${esc(p.name)}</span></nav>
      <div class="pdp">
        <div class="pdp-gallery">
          <div class="pdp-main tone-${esc(p.art?.bg || 'cream')}" id="pdp-main">${productMedia(p, { large: true })}</div>
          ${gallery.length > 1 ? `<div class="thumbs">${gallery.map((g, i) => `<button type="button" class="thumb ${i === 0 ? 'is-on' : ''}" data-i="${i}" aria-label="${tr(`Ver imagem ${i + 1}`, `View image ${i + 1}`)}"><img src="${g.src}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>
        <div class="pdp-info">
          <a class="eyebrow" href="#colecao-${p.collection}">${esc(S.collectionName(p.collection))}</a>
          <h1 class="h1 pdp-title">${esc(p.name)}</h1>
          <p class="pdp-short">${esc(p.short)}</p>
          <p class="pdp-price" id="price">${p.mode === 'gratis' ? tr('Grátis', 'Free') : p.price == null ? tr('Sob orçamento', 'Quote on request') : brl(p.price)}</p>
          ${p.price ? `<p class="pdp-pix">${tr(`${brl(p.price * 0.95)} no Pix · ou 3× de ${brl(p.price / 3)} sem juros`, `${brl(p.price * 0.95)} with Pix · or 3 interest-free payments of ${brl(p.price / 3)}`)}</p>` : ''}
          <div class="pdp-status">${availabilityPill(p)}${p.productionDays && a.buyable ? `<span class="muted">${p.mode === 'encomenda' ? tr('Produção', 'Production') : tr('Separação', 'Handling')}: ${p.productionDays} ${days(p.productionDays)} ${tr('+ frete', '+ shipping')}</span>` : ''}</div>
          ${buy}
          <div class="pdp-acc">
            <details open><summary>${tr('Sobre o produto', 'About this product')}</summary><p>${esc(p.description)}</p></details>
            <details><summary>${tr('Detalhes', 'Details')}</summary><ul>${p.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></details>
            <details><summary>${tr('Entrega e prazo', 'Shipping and timing')}</summary><p>${tr(`O prazo total soma o tempo de ${p.mode === 'encomenda' ? 'produção' : 'separação'} e o prazo do frete escolhido. Calcule o frete pelo CEP na sacola.`, `Total delivery time is the ${p.mode === 'encomenda' ? 'production' : 'handling'} time plus the shipping time you choose. We ship within Brazil only; enter your CEP (Brazilian ZIP code) in the bag to see options.`)}</p></details>
            <details><summary>${tr('Trocas', 'Returns')}</summary><p>${tr('Você pode desistir da compra em até 7 dias após o recebimento. Produtos personalizados com nome ou frase têm regras próprias.', 'You can cancel your purchase within 7 days of delivery. Products personalized with a name or phrase have their own rules.')} <a href="#politicas">${tr('Ver políticas', 'See policies')}</a>.</p></details>
          </div>
          ${p.collection === 'boatoat' ? conceptNote() : api.live ? '' : `<p class="fine">${tr('Valores e materiais ilustrativos para a apresentação.', 'Illustrative prices and materials.')}</p>`}
        </div>
      </div>
      ${related.length ? `<div class="section-head related"><h2 class="h3">${tr('Combina com', 'Goes well with')}</h2></div>${grid(related)}` : ''}
    </div></section>`,
    mount(root) {
      const thumbs = root.querySelectorAll('.thumb');
      thumbs.forEach((t) => {
        t.onclick = () => {
          const g = gallery[Number(t.dataset.i)];
          root.querySelector('#pdp-main').innerHTML = `<img src="${g.src}" alt="${esc(g.alt)}" class="media-img ${g.fit === 'contain' ? 'is-contain' : ''}">`;
          thumbs.forEach((x) => x.classList.toggle('is-on', x === t));
        };
      });
      const free = root.querySelector('#free');
      if (free) free.onclick = () => toast(api.live ? tr('O download estará disponível em breve.', 'The download will be available soon.') : tr('Na loja definitiva o download começa aqui. Nesta apresentação, nenhum arquivo é baixado.', 'In the live shop the download starts here. In this demo, nothing is downloaded.'));
      const add = root.querySelector('#add');
      if (!add) return;
      const qty = root.querySelector('#qty');
      const clampQty = (v) => Math.max(1, Math.min(qtyMax, Number(v) || 1));
      root.querySelector('#q-minus').onclick = () => { qty.value = clampQty(qty.value - 1); };
      root.querySelector('#q-plus').onclick = () => { qty.value = clampQty(Number(qty.value) + 1); };
      qty.onchange = () => { qty.value = clampQty(qty.value); };
      const priceEl = root.querySelector('#price');
      root.querySelectorAll('.variation input').forEach((r) => {
        r.onchange = () => {
          selected[r.name.slice(2)] = r.value;
          priceEl.textContent = brl(S.unitPrice(p, selected));
        };
      });
      const pz = root.querySelector('#pz');
      if (pz) pz.oninput = () => { root.querySelector('#pz-count').textContent = `${pz.value.length}/${p.personalization.max}`; };
      const addLabel = add.innerHTML;
      add.onclick = () => {
        if (add.classList.contains('is-added')) return;
        const key = S.addToCart(p.id, clampQty(qty.value), { ...selected }, pz ? pz.value.trim() : '');
        const count = document.getElementById('bag-count');
        count.classList.remove('is-bump'); void count.offsetWidth; count.classList.add('is-bump');
        add.classList.add('is-added');
        add.innerHTML = `<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> ${tr('Adicionado', 'Added')}`;
        // Pequena pausa para a confirmação no botão ser vista antes de a sacola abrir
        const here = location.hash;
        setTimeout(() => { if (location.hash === here) openDrawer(key); }, reduceMotion() ? 0 : 280);
        setTimeout(() => { add.classList.remove('is-added'); add.innerHTML = addLabel; }, 1600);
      };
    },
  };
}

// ---------- Sacola (gaveta e página) ----------
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let justAdded = null;
export function openDrawer(addedKey = null) {
  const d = document.getElementById('drawer');
  justAdded = addedKey;
  clearTimeout(closeDrawer.t);
  d.classList.remove('is-closing');
  renderDrawer();
  justAdded = null;
  d.hidden = false;
  document.body.classList.add('no-scroll');
  d.querySelector('.drawer-close').focus({ preventScroll: true });
}
// immediate: fecha sem animação (usado na troca de página)
export function closeDrawer(immediate = false) {
  const d = document.getElementById('drawer');
  if (d.hidden) return;
  const done = () => { d.hidden = true; d.classList.remove('is-closing'); document.body.classList.remove('no-scroll'); };
  if (immediate === true || reduceMotion()) { done(); return; }
  d.classList.add('is-closing');
  closeDrawer.t = setTimeout(done, 240);
}
// Opções escolhidas (guardadas em português) mostradas no idioma da loja.
function optionsText(product, options, personalization) {
  const out = Object.entries(options || {}).map(([k, v]) => { const o = S.optionText(product, k, v); return `${esc(o.name)}: ${esc(o.label)}`; });
  if (personalization) out.push(`${tr('Personalização', 'Personalization')}: “${esc(personalization)}”`);
  return out;
}
function lineHTML(l, compact) {
  const opts = optionsText(l.product, l.options, l.personalization);
  return `<li class="line" data-key="${esc(l.key)}" data-testid="cart-line">
    <a class="line-media tone-${esc(l.product.art?.bg || 'cream')}" href="#p-${l.id}">${productMedia(l.product)}</a>
    <div class="line-info">
      <a class="line-name" href="#p-${l.id}">${esc(l.product.name)}</a>
      ${opts.length ? `<p class="line-opts">${opts.join(' · ')}</p>` : ''}
      <div class="line-actions">
        <div class="stepper stepper-sm" role="group" aria-label="${tr(`Quantidade de ${esc(l.product.name)}`, `Quantity of ${esc(l.product.name)}`)}">
          <button type="button" data-act="dec" aria-label="${tr('Diminuir', 'Decrease')}">−</button><span class="qty" data-testid="line-qty">${l.qty}</span><button type="button" data-act="inc" aria-label="${tr('Aumentar', 'Increase')}">+</button>
        </div>
        <button type="button" class="link-btn" data-act="rm">${tr('Remover', 'Remove')}</button>
      </div>
    </div>
    <p class="line-total">${brl(l.total)}${compact ? '' : `<small>${brl(l.unit)} ${tr('cada', 'each')}</small>`}</p>
  </li>`;
}
function bindLines(root, after) {
  root.querySelectorAll('.line').forEach((li) => {
    const key = li.dataset.key;
    const line = S.getCart().find((l) => l.key === key);
    li.querySelector('[data-act="dec"]').onclick = () => { S.setQty(key, line.qty - 1); after(); };
    li.querySelector('[data-act="inc"]').onclick = () => { S.setQty(key, line.qty + 1); after(); };
    li.querySelector('[data-act="rm"]').onclick = () => { S.removeLine(key); after(); toast(tr('Item removido', 'Item removed')); };
  });
}
const emptyBag = (cls = 'btn-ghost') => `<div class="empty-bag"><p>${tr('Sua sacola está vazia.', 'Your bag is empty.')}</p><a class="btn ${cls}" href="#loja">${tr('Explorar a loja', 'Browse the shop')}</a></div>`;
export function renderDrawer() {
  const body = document.getElementById('drawer-body');
  const lines = S.cartLines();
  const added = justAdded && lines.find((l) => l.key === justAdded);
  body.innerHTML = lines.length ? `${added ? `<p class="drawer-added" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${tr(`${esc(added.product.name)} foi para a sacola`, `${esc(added.product.name)} added to your bag`)}</p>` : ''}<ul class="lines">${lines.map((l) => lineHTML(l, true).replace('class="line"', l.key === justAdded ? 'class="line is-new"' : 'class="line"')).join('')}</ul>
    <div class="drawer-foot">
      <p class="sum-row"><span>Subtotal</span><strong>${brl(S.cartSubtotal())}</strong></p>
      <p class="fine">${tr('Frete e desconto do Pix calculados na sacola.', 'Shipping and the Pix discount are calculated in the bag.')}</p>
      <a class="btn btn-primary btn-wide" href="#sacola">${tr('Ver sacola e calcular frete', 'View bag and calculate shipping')}</a>
    </div>` : emptyBag();
  bindLines(body, renderDrawer);
}

let cep = '';
let chosenShip = null;
const freeOr = (v) => (v ? brl(v) : tr('Grátis', 'Free'));
// Cotação de frete da sacola: vale para o mesmo CEP e os mesmos produtos e quantidades.
// Na loja real é buscada no servidor (Melhor Envio), então chega depois de um instante.
let shipState = { key: '', result: null, error: '', loading: false };
const shipKey = (lines) => `${cep.replace(/\D/g, '')}|${lines.map((l) => `${l.id}:${l.qty}`).sort().join(',')}`;
const currentQuotes = (lines) => (shipState.key === shipKey(lines) && !shipState.loading ? shipState.result : null);
function requestQuotes(lines, after) {
  const key = shipKey(lines);
  if (shipState.key === key) return;
  shipState = { key, result: null, error: '', loading: true };
  api.quoteShipping(cep, lines)
    .then((res) => { if (shipState.key === key) shipState = { key, result: res, error: res ? '' : 'cep', loading: false }; })
    .catch((e) => { if (shipState.key === key) shipState = { key, result: null, error: e.message, loading: false }; })
    .finally(() => { if (shipState.key === key) after(); });
}
function bagPage() {
  return {
    html: `<section class="section page-top"><div class="wrap"><p class="eyebrow">${tr('Sacola', 'Bag')}</p><h1 class="h1">${tr('Sua sacola', 'Your bag')}</h1><div id="bag"></div></div></section>`,
    mount(root) {
      const box = root.querySelector('#bag');
      const render = () => {
        const lines = S.cartLines();
        if (!lines.length) { box.innerHTML = emptyBag('btn-primary'); return; }
        if (cep) requestQuotes(lines, () => { if (box.isConnected) render(); });
        const quotes = cep ? currentQuotes(lines) : null;
        const mine = cep && shipState.key === shipKey(lines);
        const loading = mine && shipState.loading;
        const shipError = mine && !loading ? shipState.error : '';
        if (quotes && !quotes.quotes.find((q) => q.id === chosenShip?.id)) chosenShip = quotes.quotes[0];
        const sub = S.cartSubtotal();
        box.innerHTML = `<div class="bag-grid">
          <ul class="lines lines-page">${lines.map((l) => lineHTML(l, false)).join('')}</ul>
          <aside class="summary">
            <h2 class="h3">${tr('Resumo', 'Summary')}</h2>
            <form id="cep-form" class="cep-form"><label class="field" for="cep"><span>${tr('Calcular frete', 'Calculate shipping (CEP)')}</span>
              <span class="inline"><input id="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" value="${esc(cep)}" maxlength="9"><button class="btn btn-small btn-ghost" type="submit">${tr('Calcular', 'Calculate')}</button></span></label></form>
            ${isEn() ? '<p class="fine">We ship within Brazil only. The CEP is the 8-digit Brazilian ZIP code.</p>' : ''}
            ${loading ? `<p class="fine" role="status">${tr('Calculando o frete…', 'Calculating shipping…')}</p>` : ''}
            ${shipError === 'cep' ? `<p class="error">${tr('Digite um CEP com 8 números.', 'Enter a CEP with 8 digits.')}</p>` : shipError ? `<p class="error">${esc(shipError)} <button type="button" class="link-btn" id="ship-retry">${tr('Tentar de novo', 'Try again')}</button></p>` : ''}
            ${quotes ? `<p class="fine">${tr(`Entrega para ${esc(S.regionName(quotes.region))}`, `Delivery to ${esc(S.regionName(quotes.region))}`)}${api.live ? '' : tr(' (valores simulados)', ' (simulated rates)')}</p><div class="ship-opts">${quotes.quotes.map((q) => `<label class="ship"><input type="radio" name="ship" value="${q.id}" ${chosenShip?.id === q.id ? 'checked' : ''}><span><strong>${esc(S.shipName(q.name))}</strong> · ${tr('até', 'up to')} ${q.days} ${days(q.days)}</span><b>${freeOr(q.price)}</b></label>`).join('')}</div>` : ''}
            <p class="sum-row"><span>Subtotal</span><span>${brl(sub)}</span></p>
            <p class="sum-row"><span>${tr('Frete', 'Shipping')}</span><span>${chosenShip && quotes ? freeOr(chosenShip.price) : loading ? '…' : tr('Informe o CEP', 'Enter your CEP')}</span></p>
            <p class="sum-row sum-total"><span>Total</span><strong data-testid="bag-total">${brl(sub + (quotes && chosenShip ? chosenShip.price : 0))}</strong></p>
            <p class="fine">${tr(`No Pix: ${brl(sub * 0.95 + (quotes && chosenShip ? chosenShip.price : 0))} (5% de desconto nos produtos)`, `With Pix: ${brl(sub * 0.95 + (quotes && chosenShip ? chosenShip.price : 0))} (5% off products)`)}</p>
            <button class="btn btn-primary btn-wide" id="to-checkout" type="button" ${quotes ? '' : 'disabled'}>${tr('Finalizar compra', 'Checkout')}</button>
            ${quotes ? '' : `<p class="fine">${tr('Calcule o frete para continuar.', 'Calculate shipping to continue.')}</p>`}
            <a class="link" href="#loja">${tr('Continuar comprando', 'Keep shopping')}</a>
          </aside>
        </div>`;
        bindLines(box, render);
        box.querySelector('#cep-form').onsubmit = (e) => { e.preventDefault(); cep = box.querySelector('#cep').value; chosenShip = null; render(); };
        box.querySelector('#cep').oninput = (e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 8); e.target.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
        box.querySelectorAll('input[name="ship"]').forEach((r) => { r.onchange = () => { chosenShip = quotes.quotes.find((q) => q.id === r.value); render(); }; });
        const retry = box.querySelector('#ship-retry');
        if (retry) retry.onclick = () => { shipState.key = ''; render(); };
        box.querySelector('#to-checkout').onclick = () => go('#checkout');
      };
      render();
    },
  };
}

// ---------- Checkout ----------
const luhn = (num) => {
  const d = num.replace(/\D/g, '');
  if (d.length < 13) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
};

function checkout() {
  const lines = S.cartLines();
  if (!lines.length) return { html: `<section class="section page-top"><div class="wrap">${emptyBag('btn-primary')}</div></section>` };
  const quotes = cep ? currentQuotes(lines) : null;
  if (!quotes || !chosenShip || !quotes.quotes.some((q) => q.id === chosenShip.id)) return { html: `<section class="section page-top"><div class="wrap empty-bag"><p>${tr('Calcule o frete na sacola antes de finalizar.', 'Calculate shipping in your bag before checking out.')}</p><a class="btn btn-primary" href="#sacola">${tr('Voltar para a sacola', 'Back to bag')}</a></div></section>` };
  const sub = S.cartSubtotal();
  return {
    html: `<section class="section page-top"><div class="wrap">
      <p class="eyebrow">${tr('Finalizar compra', 'Checkout')}${api.live ? '' : tr(' · demonstração', ' · demo')}</p><h1 class="h1">${tr('Quase lá.', 'Almost there.')}</h1>
      <p class="notice">${api.onlinePayment ? tr('Depois de confirmar, você vai para a página segura do Mercado Pago para pagar com Pix ou cartão. Os dados do cartão não passam pela loja.', 'After you confirm, you’ll go to Mercado Pago’s secure page to pay with Pix or card. Card details never go through the shop.') : api.live ? tr('Loja em fase de testes: o pagamento on-line ainda não está ativado. Depois do pedido, a Fan Joy Store entra em contato para combinar o pagamento.', 'The shop is in its testing phase: online payment isn’t active yet. After you order, Fan Joy Store will contact you to arrange payment.') : tr('Nenhum pagamento é cobrado nesta apresentação. Não use dados reais de cartão.', 'No payment is charged in this demo. Don’t use real card details.')}</p>
      <form id="co" class="checkout" novalidate>
        <div class="co-main">
          <fieldset class="co-step"><legend><span class="step-n">1</span> ${tr('Seus dados', 'Your details')}</legend>
            <div class="row2">
              <label class="field" for="c-name"><span>${tr('Nome completo', 'Full name')}</span><input id="c-name" autocomplete="name" required></label>
              <label class="field" for="c-email"><span>E-mail</span><input id="c-email" type="email" autocomplete="email" required></label>
              <label class="field" for="c-phone"><span>WhatsApp</span><input id="c-phone" type="tel" autocomplete="tel" placeholder="(11) 90000-0000" required></label>
            </div>
          </fieldset>
          <fieldset class="co-step"><legend><span class="step-n">2</span> ${tr('Entrega', 'Delivery')}</legend>
            <p class="muted">CEP ${esc(cep)} · ${esc(S.regionName(quotes.region))} · <a href="#sacola">${tr('alterar', 'change')}</a></p>
            ${chosenShip.id === 'retirada' ? `<p>${tr('Retirada combinada em São Paulo. A Lilian envia o endereço e o horário pelo WhatsApp.', 'Pickup in São Paulo by arrangement. Lilian will send the address and time on WhatsApp.')}</p>` : `<div class="row2">
              <label class="field field-wide" for="c-street"><span>${tr('Endereço', 'Street address')}</span><input id="c-street" autocomplete="address-line1" required></label>
              <label class="field" for="c-num"><span>${tr('Número', 'Number')}</span><input id="c-num" required></label>
              <label class="field" for="c-comp"><span>${tr('Complemento', 'Apt, suite, etc.')} <small>(${tr('opcional', 'optional')})</small></span><input id="c-comp" autocomplete="address-line2"></label>
              <label class="field" for="c-city"><span>${tr('Cidade e estado', 'City and state')}</span><input id="c-city" placeholder="São Paulo, SP" required></label>
            </div>`}
          </fieldset>
          <fieldset class="co-step"><legend><span class="step-n">3</span> ${tr('Pagamento', 'Payment')}</legend>
            <div class="pay-opts">
              <label class="pay"><input type="radio" name="pay" value="pix" checked><span>${tr('<strong>Pix</strong> · 5% de desconto, aprovação na hora', '<strong>Pix</strong> · 5% off, instant approval (Brazilian instant payment)')}</span></label>
              <label class="pay"><input type="radio" name="pay" value="cartao"><span>${tr('<strong>Cartão de crédito</strong> · até 3× sem juros', '<strong>Credit card</strong> · up to 3 interest-free installments')}</span></label>
            </div>
            <div id="card" class="card-form" hidden>
              ${api.onlinePayment ? `<select id="cc-inst" hidden aria-hidden="true"></select>
              <p class="fine">${tr('Você escolhe o cartão e as parcelas (até 3× sem juros) na página segura do Mercado Pago.', 'You choose your card and installments (up to 3, interest-free) on Mercado Pago’s secure page.')}</p>` : api.live ? `<div class="row2"><label class="field field-wide" for="cc-inst"><span>${tr('Parcelas', 'Installments')}</span><select id="cc-inst"></select></label></div>
              <p class="fine">${tr('O pagamento com cartão ainda está sendo ativado. Depois do pedido, a Fan Joy Store envia um link seguro de pagamento.', 'Card payment is still being set up. After you order, Fan Joy Store will send you a secure payment link.')}</p>` : `<div class="row2">
                <label class="field field-wide" for="cc-num"><span>${tr('Número do cartão', 'Card number')}</span><input id="cc-num" inputmode="numeric" autocomplete="off" placeholder="4111 1111 1111 1111"></label>
                <label class="field field-wide" for="cc-name"><span>${tr('Nome impresso no cartão', 'Name on card')}</span><input id="cc-name" autocomplete="off"></label>
                <label class="field" for="cc-exp"><span>${tr('Validade', 'Expiry')}</span><input id="cc-exp" placeholder="${tr('MM/AA', 'MM/YY')}" autocomplete="off" maxlength="5"></label>
                <label class="field" for="cc-cvv"><span>CVV</span><input id="cc-cvv" inputmode="numeric" autocomplete="off" maxlength="4"></label>
                <label class="field field-wide" for="cc-inst"><span>${tr('Parcelas', 'Installments')}</span><select id="cc-inst"></select></label>
              </div>
              <p class="fine">${tr('Para testar, use 4111 1111 1111 1111. Na loja definitiva, os dados do cartão vão direto para a empresa de pagamentos e nunca ficam salvos aqui.', 'To test, use 4111 1111 1111 1111. In the live shop, card details go straight to the payment company and are never stored here.')}</p>`}
            </div>
          </fieldset>
          <p class="error" id="co-error" role="alert" hidden></p>
        </div>
        <aside class="summary">
          <h2 class="h3">${tr('Seu pedido', 'Your order')}</h2>
          <ul class="mini-lines">${lines.map((l) => `<li><span>${l.qty}× ${esc(l.product.name)}${l.personalization ? ` <small>“${esc(l.personalization)}”</small>` : ''}</span><span>${brl(l.total)}</span></li>`).join('')}</ul>
          <p class="sum-row"><span>Subtotal</span><span>${brl(sub)}</span></p>
          <p class="sum-row" id="row-disc"><span>${tr('Desconto Pix', 'Pix discount')}</span><span>− ${brl(sub * 0.05)}</span></p>
          <p class="sum-row"><span>${tr('Frete', 'Shipping')} · ${esc(S.shipName(chosenShip.name))}</span><span>${freeOr(chosenShip.price)}</span></p>
          <p class="sum-row sum-total"><span>Total</span><strong id="co-total"></strong></p>
          <p class="fine">${tr(`Prazo estimado: até ${chosenShip.days} dias úteis, já com produção e separação.`, `Estimated delivery: up to ${chosenShip.days} business days, including production and handling.`)}</p>
          <button class="btn btn-primary btn-wide" type="submit" id="place">${api.onlinePayment ? tr('Confirmar e pagar', 'Confirm and pay') : tr('Confirmar pedido', 'Place order')}</button>
          <p class="fine">${tr('Ao confirmar, você concorda com as', 'By placing your order, you agree to the')} <a href="#politicas">${tr('políticas da loja', 'shop policies')}</a>.</p>
        </aside>
      </form>
    </div></section>`,
    mount(root) {
      const $ = (s) => root.querySelector(s);
      const inst = $('#cc-inst');
      const update = () => {
        const pix = root.querySelector('input[name="pay"]:checked').value === 'pix';
        $('#card').hidden = pix;
        $('#row-disc').hidden = !pix;
        const total = sub - (pix ? sub * 0.05 : 0) + chosenShip.price;
        $('#co-total').textContent = brl(total);
        inst.innerHTML = [1, 2, 3].map((n) => `<option value="${n}">${tr(`${n}× de ${brl(total / n)} sem juros`, `${n}× ${brl(total / n)}, interest-free`)}</option>`).join('');
      };
      root.querySelectorAll('input[name="pay"]').forEach((r) => { r.onchange = update; });
      if (!api.live) $('#cc-num').oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); };
      if (!api.live) $('#cc-exp').oninput = (e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
      update();
      const placeLabel = $('#place').textContent;
      $('#co').onsubmit = async (e) => {
        e.preventDefault();
        const err = $('#co-error');
        const missing = [...root.querySelectorAll('.co-main input[required]')].filter((i) => !i.value.trim());
        root.querySelectorAll('.is-invalid').forEach((i) => i.classList.remove('is-invalid'));
        const fail = (msg, els) => { err.textContent = msg; err.hidden = false; els.forEach((i) => i.classList.add('is-invalid')); els[0]?.focus(); };
        if (missing.length) return fail(tr('Preencha os campos destacados para continuar.', 'Fill in the highlighted fields to continue.'), missing);
        if (!/^\S+@\S+\.\S+$/.test($('#c-email').value)) return fail(tr('Confira o e-mail: ele precisa ter o formato nome@provedor.com.', 'Check your e-mail: it should look like name@provider.com.'), [$('#c-email')]);
        const method = root.querySelector('input[name="pay"]:checked').value;
        let last4 = null;
        if (method === 'cartao' && !api.live) {
          const num = $('#cc-num').value;
          if (!luhn(num)) return fail(tr('O número do cartão não é válido. Para testar, use 4111 1111 1111 1111.', 'The card number isn’t valid. To test, use 4111 1111 1111 1111.'), [$('#cc-num')]);
          const [mm, yy] = $('#cc-exp').value.split('/').map(Number);
          const nowD = new Date();
          if (!mm || mm > 12 || !yy || 2000 + yy < nowD.getFullYear() || (2000 + yy === nowD.getFullYear() && mm < nowD.getMonth() + 1)) return fail(tr('Confira a validade do cartão no formato MM/AA.', 'Check the card expiry in MM/YY format.'), [$('#cc-exp')]);
          if (!/^\d{3,4}$/.test($('#cc-cvv').value)) return fail(tr('O CVV tem 3 ou 4 números, no verso do cartão.', 'The CVV has 3 or 4 digits, on the back of the card.'), [$('#cc-cvv')]);
          if (!$('#cc-name').value.trim()) return fail(tr('Informe o nome impresso no cartão.', 'Enter the name on the card.'), [$('#cc-name')]);
          last4 = num.replace(/\D/g, '').slice(-4);
        }
        err.hidden = true;
        const place = $('#place');
        place.disabled = true; place.textContent = tr('Enviando pedido…', 'Placing order…');
        try {
          const order = await api.placeOrder({
            customer: { name: $('#c-name').value.trim(), email: $('#c-email').value.trim(), phone: $('#c-phone').value.trim(), city: $('#c-city')?.value.trim() || 'São Paulo, SP' },
            address: chosenShip.id === 'retirada' ? {} : { street: $('#c-street').value.trim(), number: $('#c-num').value.trim(), complement: $('#c-comp').value.trim(), city: $('#c-city').value.trim(), cep },
            shipping: { id: chosenShip.id, name: chosenShip.name, price: chosenShip.price, days: chosenShip.days, cep, quote: quotes.quoteId },
            payment: { method, installments: method === 'cartao' ? Number(inst.value) : 1, last4 },
            lines: S.cartLines(),
          });
          S.clearCart();
          if (api.onlinePayment) {
            place.textContent = tr('Abrindo o pagamento…', 'Opening payment…');
            try { location.assign(await api.startPayment(order.code, $('#c-email').value.trim())); return; } catch (payErr) { toast(payErr.message); }
          }
          go(`#pedido-${order.code}`);
        } catch (ex) {
          place.disabled = false; place.textContent = placeLabel;
          shipState.key = ''; // na volta para a sacola, o frete é cotado de novo
          fail(ex.message, []);
        }
      };
    },
  };
}

// ---------- Pedido e acompanhamento ----------
function pixPattern(code) {
  // Padrão visual que imita um QR Code. Não é um QR Code válido.
  let s = [...code].reduce((a, c) => a + c.charCodeAt(0), 7);
  const cells = [];
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    const finder = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
    s = (s * 9301 + 49297) % 233280;
    const on = finder ? (x % 6 === 0 || y % 6 === 0 || (x % 18 >= 2 && x % 18 <= 4 && y % 18 >= 2 && y % 18 <= 4)) : s / 233280 > 0.55;
    if (on) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  }
  return `<svg viewBox="-1 -1 27 27" class="pix-qr" role="img" aria-label="${tr('Código Pix demonstrativo, não pode ser pago', 'Sample Pix code, cannot be paid')}"><rect x="-1" y="-1" width="27" height="27" fill="#fff"/><g fill="#16224F">${cells.join('')}</g></svg>`;
}

const FLOW = ['aguardando', 'pago', 'producao', 'enviado', 'entregue'];
function orderView(o) {
  const idx = FLOW.indexOf(o.status);
  const demo = api.canSimulatePayment;
  const pixCode = `00020126-FANJOY-DEMO-${o.code}-NAO-PAGAVEL`;
  // Nome e opções do item no idioma da loja (o pedido guarda o português do momento da compra).
  const itemText = (it) => {
    const p = S.product(it.id);
    const opts = p ? optionsText(p, it.options, '').join(' · ') : Object.values(it.options || {}).map(esc).join(' · ');
    return `${it.qty}× ${esc(p?.name || it.name)}${opts ? ` <small>${opts}</small>` : ''}${it.personalization ? ` <small>“${esc(it.personalization)}”</small>` : ''}`;
  };
  const title = o.status === 'aguardando'
    ? (o.payment.method === 'pix' ? tr('Pedido recebido. Falta o Pix.', 'Order received. Pix payment pending.') : tr('Pedido recebido. Falta o pagamento.', 'Order received. Payment pending.'))
    : o.status === 'cancelado' ? tr('Pedido cancelado.', 'Order cancelled.') : tr('Obrigada pelo pedido!', 'Thank you for your order!');
  return `<section class="section page-top"><div class="wrap order">
      <p class="eyebrow">${tr('Pedido', 'Order')} ${esc(o.code)} · ${fmtDateTime(o.createdAt)}</p>
      <h1 class="h1">${title}</h1>
      ${demo ? `<p class="notice">${tr('Pedido de demonstração: nada foi cobrado e nada será enviado.', 'Demo order: nothing was charged and nothing will be shipped.')}</p>`
        : api.onlinePayment ? (o.status === 'aguardando' ? `<div class="notice pay-now"><p>${tr('Falta o pagamento. Pague com Pix ou cartão na página segura do Mercado Pago. Se você acabou de pagar, a confirmação pode levar alguns instantes.', 'Payment pending. Pay with Pix or card on Mercado Pago’s secure page. If you just paid, the confirmation may take a few moments.')}</p><button class="btn btn-primary" id="pay-now" type="button">${tr('Pagar agora', 'Pay now')}</button></div>` : '')
        : `<p class="notice">${tr('Loja em fase de testes: o pagamento on-line ainda não está ativado. A Fan Joy Store vai entrar em contato para combinar o pagamento.', 'The shop is in its testing phase: online payment isn’t active yet. Fan Joy Store will contact you to arrange payment.')}</p>`}
      ${o.status === 'cancelado' ? '' : `<ol class="timeline" aria-label="${tr('Andamento do pedido', 'Order progress')}">${FLOW.map((s, i) => `<li class="${i <= idx ? 'is-done' : ''} ${i === idx ? 'is-now' : ''}"><span></span>${esc(S.statusLabel(s))}</li>`).join('')}</ol>`}
      ${o.trackingCode ? `<p class="notice">${tr('Código de rastreio', 'Tracking code')}: <strong>${esc(o.trackingCode)}</strong></p>` : ''}
      ${o.status === 'aguardando' && o.payment.method === 'pix' && demo ? `<div class="pix-box">
        ${pixPattern(o.code)}
        <div><h2 class="h3">${tr(`Pague ${brl(o.total)} com Pix`, `Pay ${brl(o.total)} with Pix`)}</h2>
          <p>${tr('Na loja definitiva, este QR Code é gerado pela empresa de pagamentos e a confirmação chega sozinha em segundos.', 'In the live shop, this QR code comes from the payment company and the confirmation arrives on its own in seconds.')}</p>
          <label class="field" for="pix-code"><span>${tr('Pix copia e cola (demonstrativo)', 'Pix copy-and-paste code (sample)')}</span><input id="pix-code" readonly value="${pixCode}"></label>
          <div class="inline"><button class="btn btn-small btn-ghost" id="copy-pix" type="button">${tr('Copiar código', 'Copy code')}</button><button class="btn btn-small btn-primary" id="sim-pay" type="button">${tr('Simular pagamento aprovado', 'Simulate approved payment')}</button></div>
        </div></div>` : ''}
      <div class="order-grid">
        <div>
          <h2 class="h3">${tr('Itens', 'Items')}</h2>
          <ul class="mini-lines">${o.items.map((it) => `<li><span>${itemText(it)}</span><span>${brl(it.unit * it.qty)}</span></li>`).join('')}</ul>
          <p class="sum-row"><span>Subtotal</span><span>${brl(o.subtotal)}</span></p>
          ${Number(o.discount) ? `<p class="sum-row"><span>${tr('Desconto Pix', 'Pix discount')}</span><span>− ${brl(Number(o.discount))}</span></p>` : ''}
          <p class="sum-row"><span>${tr('Frete', 'Shipping')} · ${esc(S.shipName(o.shipping.name))}</span><span>${freeOr(Number(o.shippingPrice))}</span></p>
          <p class="sum-row sum-total"><span>Total</span><strong>${brl(Number(o.total))}</strong></p>
        </div>
        <div class="order-side">
          <h2 class="h3">${tr('Entrega e pagamento', 'Delivery and payment')}</h2>
          <p>${esc(o.customer.name)}<br>${esc(o.customer.email)}</p>
          <p>${esc(S.shipName(o.shipping.name))}${o.shipping.days ? ` · ${tr('até', 'up to')} ${o.shipping.days} ${days(o.shipping.days)}` : ''}</p>
          <p>${o.payment.method === 'pix' ? 'Pix' : `${tr('Cartão', 'Card')}${o.payment.last4 ? ` ${tr('final', 'ending in')} ${esc(o.payment.last4)}` : ''} · ${o.payment.installments}×`}</p>
          <h2 class="h3">${tr('Histórico', 'History')}</h2>
          <ul class="history">${o.history.map((h) => `<li>${fmtDateTime(h.at)} · ${esc(S.statusLabel(h.status))}</li>`).join('')}</ul>
          <a class="link" href="#pedidos">${tr('Acompanhar outros pedidos', 'Track other orders')} ${icon.arrow}</a>
        </div>
      </div>
    </div></section>`;
}

function orderPage(code) {
  const notFoundHtml = `<section class="section page-top"><div class="wrap narrow-wrap"><h1 class="h1">${tr('Pedido não encontrado', 'Order not found')}</h1><p>${tr(`Não encontramos o pedido ${esc(code)} neste navegador. Busque pelo número e pelo e-mail usado na compra.`, `We couldn’t find order ${esc(code)} in this browser. Look it up with the order number and the e-mail you used.`)}</p><a class="btn btn-primary" href="#pedidos">${tr('Buscar pedido', 'Find order')}</a></div></section>`;
  return {
    html: `<section class="section page-top"><div class="wrap"><p class="muted" role="status">${tr('Carregando pedido…', 'Loading order…')}</p></div></section>`,
    async mount(root) {
      let o;
      try { o = await api.getOrder(code); } catch (e) {
        root.innerHTML = `<section class="section page-top"><div class="wrap narrow-wrap"><h1 class="h1">${tr('Não foi possível abrir o pedido', 'We couldn’t open this order')}</h1><p>${esc(e.message)}</p><a class="btn btn-ghost" href="#pedidos">${tr('Voltar', 'Back')}</a></div></section>`;
        return;
      }
      if (location.hash.slice(1) !== `pedido-${code}`) return;
      if (!o) { root.innerHTML = notFoundHtml; return; }
      root.innerHTML = orderView(o);
      const payNow = root.querySelector('#pay-now');
      if (payNow) {
        payNow.onclick = async () => {
          payNow.disabled = true; payNow.textContent = tr('Abrindo o pagamento…', 'Opening payment…');
          try { location.assign(await api.startPayment(o.code)); } catch (e) { toast(e.message); payNow.disabled = false; payNow.textContent = tr('Pagar agora', 'Pay now'); }
        };
        // Voltando do Mercado Pago: a confirmação chega em segundos; confere de novo algumas vezes.
        if (sessionStorage.getItem('fjs:paid-return') === o.code && (orderPage.tries = (orderPage.tries || 0) + 1) <= 6) {
          setTimeout(() => { if (location.hash.slice(1) === `pedido-${code}`) window.dispatchEvent(new HashChangeEvent('hashchange')); }, 5000);
        }
      }
      const sim = root.querySelector('#sim-pay');
      if (sim) sim.onclick = () => { api.simulatePix(o.code); toast(tr('Pagamento aprovado (simulação)', 'Payment approved (simulation)')); window.dispatchEvent(new HashChangeEvent('hashchange')); };
      const copy = root.querySelector('#copy-pix');
      if (copy) copy.onclick = () => {
        const input = root.querySelector('#pix-code');
        navigator.clipboard?.writeText(input.value).then(() => toast(tr('Código copiado', 'Code copied')), () => { input.select(); toast(tr('Selecione e copie o código', 'Select and copy the code')); }) ?? input.select();
      };
    },
  };
}

function ordersLookup() {
  const mine = api.myOrders();
  return {
    html: `<section class="section page-top"><div class="wrap narrow-wrap">
      <p class="eyebrow">${tr('Meus pedidos', 'My orders')}</p><h1 class="h1">${tr('Acompanhe seu pedido.', 'Track your order.')}</h1>
      <form id="lookup" class="lookup"><label class="field" for="lk-code"><span>${tr('Número do pedido', 'Order number')}</span><input id="lk-code" placeholder="FJ123456" required></label>
        <label class="field" for="lk-email"><span>${tr('E-mail usado na compra', 'E-mail used for the order')}</span><input id="lk-email" type="email" required></label>
        <button class="btn btn-primary" type="submit">${tr('Buscar pedido', 'Find order')}</button></form>
      <p class="error" id="lk-err" role="alert" hidden></p>
      <h2 class="h3">${tr('Pedidos feitos neste navegador', 'Orders placed in this browser')}</h2>
      ${mine.length ? `<ul class="order-list">${mine.map((o) => `<li><a href="#pedido-${o.code}"><strong>${o.code}</strong><span>${fmtDateTime(o.at)}</span>${o.status ? `<span class="pill pill-${o.status}">${esc(S.statusLabel(o.status))}</span>` : '<span></span>'}<span>${o.total != null ? brl(o.total) : tr('Ver pedido', 'View order')}</span></a></li>`).join('')}</ul>` : `<p class="muted">${tr(`Você ainda não fez nenhum pedido${api.live ? '' : ' de demonstração'} neste navegador.`, `You haven’t placed any${api.live ? '' : ' demo'} orders in this browser yet.`)} <a href="#loja">${tr('Visite a loja', 'Visit the shop')}</a>.</p>`}
      <p class="fine">${tr('Quando o pedido for enviado, o código de rastreio aparece aqui e chega por e-mail.', 'Once your order ships, the tracking code shows up here and is sent by e-mail.')}</p>
    </div></section>`,
    mount(root) {
      root.querySelector('#lookup').onsubmit = async (e) => {
        e.preventDefault();
        const err = root.querySelector('#lk-err');
        const btn = root.querySelector('#lookup button');
        err.hidden = true; btn.disabled = true;
        try {
          const o = await api.getOrder(root.querySelector('#lk-code').value.trim(), root.querySelector('#lk-email').value.trim());
          if (!o) { err.textContent = tr('Não encontramos um pedido com esse número e e-mail. Confira os dados no e-mail de confirmação.', 'We couldn’t find an order with that number and e-mail. Check the details in your confirmation e-mail.'); err.hidden = false; return; }
          go(`#pedido-${o.code}`);
        } catch (ex) { err.textContent = ex.message; err.hidden = false; } finally { btn.disabled = false; }
      };
    },
  };
}

// ---------- Encomendas personalizadas e brindes ----------
// As opções de produto são enviadas em português (é a Lilian quem lê no painel).
const REQ_PRODUCTS = {
  orcamento: [['Canecas', 'Mugs'], ['Cadernos e papelaria', 'Notebooks and stationery'], ['Ecobags', 'Tote bags'], ['Kits completos', 'Full kits'], ['Ainda não sei', 'Not sure yet']],
  encomenda: [['Caneca', 'Mug'], ['Camiseta', 'T-shirt'], ['Photocards', 'Photocards'], ['Bottons', 'Buttons'], ['Adesivos', 'Stickers'], ['Banner', 'Banner'], ['Caixa presente', 'Gift box'], ['Outro', 'Other']],
};
function requestForm(type) {
  const corp = type === 'orcamento';
  return {
    html: `<section class="section page-top"><div class="wrap req">
      <div class="req-copy">
        <p class="eyebrow">${corp ? tr('Brindes corporativos', 'Corporate gifts') : tr('Encomendas personalizadas', 'Custom orders')}</p>
        <h1 class="h1">${corp ? tr('Brindes que as pessoas guardam.', 'Gifts people actually keep.') : tr('Sua ideia, desenhada pela Lilian.', 'Your idea, drawn by Lilian.')}</h1>
        <p class="lead">${corp ? tr('Kits para eventos, onboarding, datas comemorativas e ações com influenciadores. A arte é criada a partir da identidade da sua empresa.', 'Kits for events, onboarding, special dates and influencer campaigns. The art is created from your company’s brand identity.') : tr('Um presente com o casal favorito, um kit para o fã-clube ou uma caneca com aquela piada interna. Conte o que você imagina.', 'A gift with your favorite couple, a kit for your fan club or a mug with that inside joke. Tell us what you have in mind.')}</p>
        <ol class="steps">
          ${(corp
            ? [tr('Você conta o objetivo, a quantidade e a data', 'You share the goal, quantity and date'), tr('A Lilian envia proposta com produtos, arte e valores', 'Lilian sends a proposal with products, art and prices'), tr('Aprovação da arte e produção em lote', 'Art approval and batch production'), tr('Entrega com nota fiscal', 'Delivery with a Brazilian invoice (nota fiscal)')]
            : [tr('Você envia a ideia e as referências', 'You send your idea and references'), tr('A Lilian responde com proposta e prazo', 'Lilian replies with a proposal and timeline'), tr('Você aprova o esboço antes da produção', 'You approve the sketch before production'), tr('Produção e envio', 'Production and shipping')]).map((s) => `<li>${esc(s)}</li>`).join('')}
        </ol>
        ${corp ? `<p class="fine">${tr('Pedido mínimo de 20 unidades por produto. Prazo médio de 15 dias úteis após aprovação da arte.', 'Minimum of 20 units per product. Average lead time of 15 business days after art approval.')}</p>` : `<p class="fine">${tr('Encomendas usam artes novas, por isso o valor e o prazo são combinados caso a caso.', 'Custom orders use new art, so price and timing are agreed case by case.')}</p>`}
        ${isEn() ? '<p class="fine">We deliver within Brazil only.</p>' : ''}
      </div>
      <form id="req" class="req-form" novalidate>
        <div class="row2">
          <label class="field" for="r-name"><span>${tr('Seu nome', 'Your name')}</span><input id="r-name" required autocomplete="name"></label>
          ${corp ? `<label class="field" for="r-company"><span>${tr('Empresa', 'Company')}</span><input id="r-company" required autocomplete="organization"></label>` : ''}
          <label class="field" for="r-email"><span>E-mail</span><input id="r-email" type="email" required autocomplete="email"></label>
          <label class="field" for="r-phone"><span>WhatsApp</span><input id="r-phone" type="tel" autocomplete="tel"></label>
          ${corp ? `<label class="field" for="r-cnpj"><span>${tr('CNPJ', 'CNPJ (Brazilian company ID)')} <small>(${tr('opcional', 'optional')})</small></span><input id="r-cnpj" inputmode="numeric"></label>` : ''}
          <label class="field" for="r-product"><span>${corp ? tr('Produtos de interesse', 'Products you’re interested in') : tr('Produto base', 'Base product')}</span>
            <select id="r-product">${REQ_PRODUCTS[type].map(([pt, en]) => `<option value="${esc(pt)}">${esc(tr(pt, en))}</option>`).join('')}</select></label>
          <label class="field" for="r-qty"><span>${tr('Quantidade', 'Quantity')}</span><input id="r-qty" type="number" min="${corp ? 20 : 1}" value="${corp ? 20 : 1}" required></label>
          <label class="field" for="r-date"><span>${tr('Para quando?', 'Needed by')}</span><input id="r-date" type="date"></label>
        </div>
        <label class="field" for="r-msg"><span>${corp ? tr('Conte sobre a ação e o público', 'Tell us about the campaign and audience') : tr('Descreva sua ideia', 'Describe your idea')}</span><textarea id="r-msg" rows="5" required maxlength="1000"></textarea></label>
        <label class="field" for="r-file"><span>${tr('Referências', 'References')} <small>(${tr('opcional', 'optional')})</small></span><input id="r-file" type="file" accept="image/*,.pdf" multiple></label>
        <label class="check"><input type="checkbox" id="r-lgpd" required> ${tr('Autorizo o contato da Fan Joy Store sobre este pedido, conforme a', 'I agree to be contacted by Fan Joy Store about this request, as described in the')} <a href="#politicas">${tr('política de privacidade', 'privacy policy')}</a>.</label>
        <p class="error" id="r-err" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">${corp ? tr('Pedir orçamento', 'Request a quote') : tr('Enviar minha ideia', 'Send my idea')}</button>
        <p class="fine">${api.live ? tr('A Lilian recebe a sua solicitação no painel da loja e responde pelo e-mail ou WhatsApp informado.', 'Lilian receives your request and replies by e-mail or WhatsApp.') : tr('Demonstração: a solicitação aparece no painel de gestão, mas nenhum e-mail é enviado.', 'Demo: the request shows up in the admin panel, but no e-mail is sent.')}</p>
      </form>
      <div id="req-ok" class="req-ok" hidden></div>
    </div></section>`,
    mount(root) {
      const $ = (s) => root.querySelector(s);
      $('#req').onsubmit = async (e) => {
        e.preventDefault();
        const req = [...root.querySelectorAll('#req [required]')].filter((i) => (i.type === 'checkbox' ? !i.checked : !i.value.trim()));
        root.querySelectorAll('.is-invalid').forEach((i) => i.classList.remove('is-invalid'));
        const err = $('#r-err');
        if (req.length) { err.textContent = tr('Preencha os campos destacados e aceite o contato para enviar.', 'Fill in the highlighted fields and accept being contacted to send.'); err.hidden = false; req.forEach((i) => i.classList.add('is-invalid')); req[0].focus(); return; }
        if (corp && Number($('#r-qty').value) < 20) { err.textContent = tr('Para brindes corporativos, o mínimo é de 20 unidades.', 'Corporate gifts have a minimum of 20 units.'); err.hidden = false; $('#r-qty').focus(); return; }
        const sendBtn = $('#req button[type="submit"]');
        sendBtn.disabled = true;
        let r;
        try { r = await api.submitRequest({
          type, name: $('#r-name').value.trim(), company: $('#r-company')?.value.trim(), email: $('#r-email').value.trim(),
          phone: $('#r-phone').value.trim(), product: $('#r-product').value, qty: Number($('#r-qty').value), date: $('#r-date').value,
          message: (isEn() ? '[EN] ' : '') + $('#r-msg').value.trim(), files: [...$('#r-file').files].map((f) => f.name),
        }); } catch (ex) { err.textContent = ex.message; err.hidden = false; sendBtn.disabled = false; return; }
        $('#req').hidden = true;
        const ok = $('#req-ok');
        ok.hidden = false;
        const when = api.live ? tr('A Lilian responde em até 2 dias úteis pelo e-mail ou WhatsApp informado.', 'Lilian will reply within 2 business days by e-mail or WhatsApp.') : tr('Na loja definitiva, a Lilian responde em até 2 dias úteis pelo e-mail ou WhatsApp informado.', 'In the live shop, Lilian replies within 2 business days by e-mail or WhatsApp.');
        ok.innerHTML = `<h2 class="h3">${corp ? tr('Recebemos sua solicitação de orçamento.', 'We got your quote request.') : tr('Recebemos sua ideia.', 'We got your idea.')}</h2><p>${tr('Protocolo', 'Reference')} <strong>${esc(r.code)}</strong>. ${when}</p><a class="btn btn-ghost" href="#loja">${tr('Voltar para a loja', 'Back to the shop')}</a>`;
        ok.focus?.();
      };
    },
  };
}

// ---------- Institucionais ----------
function story() {
  return `<section class="section page-top"><div class="wrap story-page">
    <img src="img/logo.webp" alt="${tr('Logo da Fan Joy Store', 'Fan Joy Store logo')}" width="360" height="360" class="story-logo">
    <div class="prose">
      <p class="eyebrow">${tr('Nossa história', 'Our story')}</p>
      <h1 class="h1">${tr('De fã para fã. De verdade.', 'From fan to fan. For real.')}</h1>
      <p>${tr('A Fan Joy Store nasceu em São Paulo, da criatividade da Lilian e da vontade de transformar o carinho por artistas, séries e doramas em objetos para o dia a dia.', 'Fan Joy Store was born in São Paulo, from Lilian’s creativity and her wish to turn love for artists, series and K-dramas into everyday objects.')}</p>
      <p>${tr('Cada produto começa num desenho dela. A florzinha sorridente da logo resume a ideia: pequenas alegrias que acompanham a rotina, do café da manhã ao show.', 'Every product starts as one of her drawings. The smiling little flower in the logo sums it up: small joys that come along with you, from breakfast to the concert.')}</p>
      <h2 class="h3">${tr('Como nasceu “Virou coisa nossa”', 'How “It became our thing” was born')}</h2>
      <p>${tr('No fanmeeting no Brasil, o Boat respondia “Tá bom!” para tudo. A Lilian guardou essa lembrança numa arte, que deu origem à coleção conceitual BoatOat FM Brasil 2026.', 'At the fan meeting in Brazil, Boat answered “Tá bom!” (“Okay!”) to everything. Lilian kept that memory in a piece of art, which became the BoatOat FM Brasil 2026 concept collection.')}</p>
      <p class="fine">${tr('A coleção é uma homenagem de fã, sem vínculo oficial com os artistas, a produtora ou o evento.', 'The collection is a fan tribute, with no official connection to the artists, the producer or the event.')}</p>
      <h2 class="h3">${tr('O que a gente valoriza', 'What we care about')}</h2>
      <ul class="values"><li>${tr('<strong>Arte autoral.</strong> Desenhos próprios, feitos com cuidado e respeito ao fandom.', '<strong>Original art.</strong> Our own drawings, made with care and respect for the fandom.')}</li><li>${tr('<strong>Transparência.</strong> Prazo, disponibilidade e custos claros antes da compra.', '<strong>Transparency.</strong> Clear timing, availability and costs before you buy.')}</li><li>${tr('<strong>Comunidade.</strong> Freebies, encomendas e espaço para ideias dos fãs.', '<strong>Community.</strong> Freebies, custom orders and room for fans’ ideas.')}</li></ul>
      <p class="credit">${tr('Site criado e desenvolvido pela VB Studio, de Victoria Bellisario.', 'Website designed and built by VB Studio, by Victoria Bellisario.')}</p>
    </div>
  </div></section>`;
}

function support() {
  return `<section class="section page-top"><div class="wrap">
    <p class="eyebrow">${tr('Atendimento', 'Contact')}</p><h1 class="h1">${tr('Estamos por aqui.', 'We’re here for you.')}</h1>
    <div class="contact-grid">
      <div class="contact"><h2 class="h3">WhatsApp</h2><p class="muted">${tr('Número oficial a definir', 'Official number coming soon')}</p><p>${tr('Segunda a sexta, das 10h às 18h.', 'Monday to Friday, 10 a.m. to 6 p.m. (Brasília time).')}</p></div>
      <div class="contact"><h2 class="h3">E-mail</h2><p class="muted">${tr('Endereço oficial a definir', 'Official address coming soon')}</p><p>${tr('Respostas em até 2 dias úteis.', 'Replies within 2 business days.')}</p></div>
      <div class="contact"><h2 class="h3">Instagram</h2><p class="muted">${tr('Perfil oficial a definir', 'Official profile coming soon')}</p><p>${tr('Novidades, bastidores e freebies.', 'News, behind the scenes and freebies.')}</p></div>
    </div>
    <div class="faq-wrap"><div><h2 class="h2">${tr('Dúvidas frequentes', 'Frequently asked questions')}</h2><a class="link" href="#politicas">${tr('Políticas da loja', 'Shop policies')} ${icon.arrow}</a></div>${faqList(faqItems())}</div>
  </div></section>`;
}

const POLICIES = [
  { id: 'entrega', title: ['Entrega', 'Shipping'], body: [
    ['Enviamos para todo o Brasil pelos Correios (PAC e SEDEX). Em São Paulo capital, também é possível combinar a retirada.', 'We ship anywhere in Brazil with Correios, the Brazilian postal service (PAC and SEDEX). We don’t ship outside Brazil. In the city of São Paulo, you can also arrange a pickup.'],
    ['O prazo total soma a separação ou produção do produto e o prazo do frete. Os dois aparecem antes de você finalizar a compra.', 'Total delivery time is handling or production time plus shipping time. You’ll see both before you check out.'],
    ['Depois do envio, você recebe o código de rastreio por e-mail e WhatsApp.', 'Once your order ships, you get the tracking code by e-mail and WhatsApp.'],
  ] },
  { id: 'trocas', title: ['Trocas e devoluções', 'Returns and exchanges'], body: [
    ['Compras feitas pela internet podem ser desistidas em até 7 dias após o recebimento, conforme o artigo 49 do Código de Defesa do Consumidor.', 'Online purchases can be cancelled within 7 days of delivery, under article 49 of the Brazilian Consumer Protection Code.'],
    ['Produtos com defeito ou diferentes do pedido são trocados sem custo. Avise em até 30 dias com fotos do produto e da embalagem.', 'Defective items or items different from your order are exchanged at no cost. Let us know within 30 days with photos of the product and packaging.'],
    ['Produtos personalizados com nome, frase ou arte exclusiva são feitos sob medida. Pedidos de troca por arrependimento nesses casos serão avaliados conforme a orientação jurídica da loja.', 'Products personalized with a name, phrase or exclusive art are made just for you. Change-of-mind return requests for these items are reviewed case by case, following the shop’s legal guidance.'],
  ] },
  { id: 'cancelamento', title: ['Cancelamento', 'Cancellation'], body: [
    ['Pedidos podem ser cancelados sem custo até o início da produção. O status aparece em “Meus pedidos”.', 'Orders can be cancelled at no cost until production starts. You can see the status under “My orders”.'],
    ['O reembolso é feito pelo mesmo meio de pagamento: Pix em até 5 dias úteis e estorno no cartão conforme a operadora.', 'Refunds go back to the original payment method: Pix within 5 business days, and card refunds according to your card issuer.'],
  ] },
  { id: 'privacidade', title: ['Privacidade', 'Privacy'], body: [
    ['Usamos seus dados apenas para processar pedidos, entregar produtos e responder atendimentos, conforme a Lei Geral de Proteção de Dados (LGPD).', 'We only use your data to process orders, deliver products and answer your messages, in line with Brazil’s General Data Protection Law (LGPD).'],
    ['Os dados de cartão são processados pela empresa de pagamentos e não ficam armazenados na loja.', 'Card details are processed by the payment company and are not stored by the shop.'],
    ['Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail oficial de atendimento.', 'You can ask to access, correct or delete your data through our official support e-mail.'],
  ] },
];
function policies() {
  const t = ([pt, en]) => tr(pt, en);
  return {
    html: `<section class="section page-top"><div class="wrap policies">
      <aside class="policy-nav"><p class="eyebrow">${tr('Políticas', 'Policies')}</p>${POLICIES.map((p) => `<button type="button" class="link-btn" data-to="pol-${p.id}">${esc(t(p.title))}</button>`).join('')}</aside>
      <div class="prose">
        <h1 class="h1">${tr('Entregas, trocas, cancelamento e privacidade', 'Shipping, returns, cancellation and privacy')}</h1>
        <p class="notice">${tr('Textos-modelo, que serão revisados com a Lilian e com orientação jurídica.', 'Draft policies, to be reviewed with Lilian and legal advice.')}${isEn() ? ' The Portuguese version prevails.' : ''}</p>
        ${POLICIES.map((p) => `<section id="pol-${p.id}"><h2 class="h3">${esc(t(p.title))}</h2>${p.body.map((b) => `<p>${esc(t(b))}</p>`).join('')}</section>`).join('')}
      </div>
    </div></section>`,
    mount(root) {
      root.querySelectorAll('[data-to]').forEach((b) => { b.onclick = () => root.querySelector('#' + b.dataset.to).scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    },
  };
}

export function notFound() {
  return `<section class="section page-top"><div class="wrap narrow-wrap">
    <p class="eyebrow">${tr('Página não encontrada', 'Page not found')}</p><h1 class="h1">${tr('Essa página saiu para o show.', 'This page went off to a concert.')}</h1>
    <p>${tr('O endereço pode ter mudado ou o produto saiu do catálogo.', 'The address may have changed, or the product is no longer in the catalog.')}</p>
    <div class="hero-actions"><a class="btn btn-primary" href="#loja">${tr('Ir para a loja', 'Go to the shop')}</a><a class="btn btn-ghost" href="#inicio">${tr('Página inicial', 'Home page')}</a></div>
  </div></section>`;
}

// ---------- Rotas da loja ----------
export function storeRoute(route) {
  if (route === 'inicio' || route === '') return home();
  if (route === 'loja') return catalog();
  if (route.startsWith('categoria-')) return catalog({ cat: route.slice(10), coll: '', q: '' });
  if (route === 'colecoes') return collections();
  if (route.startsWith('colecao-')) return collectionPage(route.slice(8));
  if (route.startsWith('p-')) return productPage(route.slice(2));
  if (route === 'sacola') return bagPage();
  if (route === 'checkout') return checkout();
  if (route === 'pedidos') return ordersLookup();
  if (route.startsWith('pedido-')) return orderPage(route.slice(7));
  if (route === 'personalizados') return requestForm('encomenda');
  if (route === 'brindes') return requestForm('orcamento');
  if (route === 'historia') return story();
  if (route === 'atendimento') return support();
  if (route === 'politicas') return policies();
  return null;
}

export { BRAND };

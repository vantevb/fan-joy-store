// Páginas da loja: início, catálogo, produto, sacola, checkout, pedidos e páginas institucionais.
import { FAQ, BRAND } from './data.js';
import * as S from './state.js';
import { brl, esc, priceLabel, productMedia, toast, icon, fmtDateTime } from './ui.js';

const go = (hash) => { location.hash = hash; };

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
        <div class="card-tags">${isNew && p.active ? '<span class="tag tag-new">Novo</span>' : ''}${a.id === 'encomenda' ? '<span class="tag">Sob encomenda</span>' : ''}${a.id === 'esgotado' || a.id === 'indisponivel' ? '<span class="tag tag-off">Indisponível</span>' : ''}${a.id === 'ultimas' ? '<span class="tag tag-warn">Últimas unidades</span>' : ''}</div>
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
  : '<p class="empty">Nenhum produto encontrado com esses filtros. Tente limpar a busca ou escolher outra categoria.</p>';

const conceptNote = '<p class="concept-note"><strong>Coleção conceitual.</strong> Criada a partir das artes da Lilian, sem vínculo oficial com os artistas, a produtora ou o evento. Produtos, materiais e preços são ilustrativos.</p>';

// ---------- Início ----------
function home() {
  const all = S.products().filter((p) => p.active);
  const featured = all.filter((p) => p.featured);
  return `
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow"><span class="dot"></span> Artes da Lilian · feito em São Paulo</p>
        <h1 class="display">Seu fandom,<br><em>desenhado</em> com carinho.</h1>
        <p class="lead">Canecas, papelaria, photocards e presentes para fãs de K-pop, BTS, doramas e BL. Cada peça começa num desenho feito à mão.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#loja">Ver a loja ${icon.arrow}</a>
          <a class="btn btn-ghost" href="#colecao-boatoat">Coleção BoatOat</a>
        </div>
        <ul class="hero-facts">
          <li><strong>Pix</strong> com 5% de desconto</li>
          <li><strong>3×</strong> sem juros no cartão</li>
          <li><strong>Envio</strong> para todo o Brasil</li>
        </ul>
      </div>
      <figure class="hero-art">
        <div class="hero-frame frame-a"><img src="img/arte-ta-bom.webp" alt="Arte “Tá bom!” da Lilian aplicada em canecas" width="1200" height="800" fetchpriority="high"></div>
        <div class="hero-frame frame-b"><img src="img/arte-gostoso.webp" alt="Arte panorâmica “Gostoso!” da Lilian" width="1400" height="599"></div>
        <figcaption>Artes da Lilian · coleção conceitual BoatOat FM Brasil 2026</figcaption>
      </figure>
    </div>
  </section>

  <div class="band" aria-label="Diferenciais">
    <div class="wrap band-row">
      <span>Arte autoral</span><span class="spark">${icon.star}</span>
      <span>Personalize com nome ou frase</span><span class="spark">${icon.star}</span>
      <span>Brindes para empresas</span><span class="spark">${icon.star}</span>
      <span>Freebies para a comunidade</span>
    </div>
  </div>

  <section class="section">
    <div class="wrap story">
      <div class="story-copy">
        <p class="eyebrow">Coleção conceitual · BoatOat FM Brasil 2026</p>
        <h2 class="h2">Virou coisa nossa.</h2>
        <p>No fanmeeting no Brasil, o Boat respondia “Tá bom!” para quase tudo. E toda vez que alguém chamava o Oat de fofo, ele corrigia: “gostoso!”.</p>
        <p>A Lilian transformou essas lembranças em artes. Delas nasceu uma coleção com canecas, bottons, photocards, ecobag, adesivos e os banners do Boat e do Oat.</p>
        <a class="btn btn-primary" href="#colecao-boatoat">Conhecer a coleção ${icon.arrow}</a>
        ${conceptNote}
      </div>
      <div class="story-quotes" aria-hidden="true">
        <span class="bubble bubble-a">Tá bom!</span>
        <span class="bubble bubble-b">Gostoso!</span>
      </div>
    </div>
  </section>

  <section class="section section-tint">
    <div class="wrap">
      <div class="section-head">
        <div><p class="eyebrow">Coleções</p><h2 class="h2">Cada paixão tem um universo.</h2></div>
        <a class="link" href="#colecoes">Todas as coleções ${icon.arrow}</a>
      </div>
      <div class="grid-collections">${S.COLLECTIONS.map(collectionTile).join('')}</div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div><p class="eyebrow">Destaques</p><h2 class="h2">Os queridinhos da Lilian.</h2></div>
        <a class="link" href="#loja">Ver todos os produtos ${icon.arrow}</a>
      </div>
      ${grid(featured)}
      <div class="chips chips-cats">${S.CATEGORIES.map((c) => `<a class="chip" href="#categoria-${c.id}">${esc(c.name)}</a>`).join('')}</div>
    </div>
  </section>

  <section class="section section-navy">
    <div class="wrap split">
      <a class="cta-card" href="#personalizados">
        <p class="eyebrow">Encomendas personalizadas</p>
        <h3 class="h3">Tem uma ideia? A Lilian desenha.</h3>
        <p>Presente para alguém especial, kit para o seu fã-clube ou uma arte do seu casal favorito.</p>
        <span class="link">Contar minha ideia ${icon.arrow}</span>
      </a>
      <a class="cta-card cta-yellow" href="#brindes">
        <p class="eyebrow">Para empresas</p>
        <h3 class="h3">Brindes com personalidade.</h3>
        <p>Canecas, cadernos e ecobags com arte criada para a sua marca, a partir de 20 unidades.</p>
        <span class="link">Pedir orçamento ${icon.arrow}</span>
      </a>
    </div>
  </section>

  <section class="section">
    <div class="wrap about">
      <img src="img/logo.webp" alt="Logo da Fan Joy Store: flor vermelha sorridente dentro de um selo azul-marinho" width="360" height="360" loading="lazy">
      <div>
        <p class="eyebrow">De fã para fã</p>
        <h2 class="h2">Uma loja feita por quem também sente tudo um pouco mais.</h2>
        <p>A Fan Joy Store nasce da criatividade da Lilian, em São Paulo, e da vontade de transformar paixões em arte para o dia a dia.</p>
        <a class="link" href="#historia">Nossa história ${icon.arrow}</a>
      </div>
    </div>
  </section>

  <section class="section section-tint">
    <div class="wrap faq-wrap">
      <div><p class="eyebrow">Dúvidas frequentes</p><h2 class="h2">Antes de escolher.</h2><a class="link" href="#atendimento">Falar com a gente ${icon.arrow}</a></div>
      ${faqList(FAQ.slice(0, 4))}
    </div>
  </section>`;
}

function collectionTile(c) {
  const count = S.products().filter((p) => p.collection === c.id && p.active).length;
  return `<a class="coll tone-${c.tone}" href="#colecao-${c.id}">
    ${c.image ? `<img src="${c.image}" alt="" loading="lazy">` : ''}
    <span class="coll-meta">${count} ${count === 1 ? 'produto' : 'produtos'}${c.concept ? ' · conceitual' : ''}</span>
    <strong class="coll-name">${esc(c.name)}</strong>
    <span class="coll-tag">${esc(c.tagline)}</span>
  </a>`;
}

function faqList(items) {
  return `<div class="faq">${items.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>`;
}

// ---------- Catálogo ----------
const filters = { q: '', cat: '', coll: '', avail: '', custom: false, sort: 'destaques', max: 200 };

function catalog(preset = {}) {
  Object.assign(filters, preset);
  return {
    html: `<section class="section page-top">
      <div class="wrap">
        <p class="eyebrow">Loja</p>
        <h1 class="h1">Encontre o seu favorito.</h1>
        <div class="catalog">
          <aside class="filters" aria-label="Filtros">
            <details class="filters-box" open>
              <summary>Filtros</summary>
              <label class="field"><span>Categoria</span>
                <select id="f-cat"><option value="">Todas</option>${S.CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
              <label class="field"><span>Coleção</span>
                <select id="f-coll"><option value="">Todas</option>${S.COLLECTIONS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
              <fieldset class="field"><legend>Disponibilidade</legend>
                <label class="check"><input type="radio" name="f-avail" value="" id="f-av-all"> Todas</label>
                <label class="check"><input type="radio" name="f-avail" value="pronta" id="f-av-pronta"> Pronta entrega</label>
                <label class="check"><input type="radio" name="f-avail" value="encomenda" id="f-av-enc"> Sob encomenda</label>
              </fieldset>
              <label class="check"><input type="checkbox" id="f-custom"> Personalizável</label>
              <label class="field"><span>Preço até <output id="f-max-out"></output></span>
                <input type="range" id="f-max" min="10" max="200" step="5"></label>
              <button class="btn btn-small btn-ghost" id="f-clear" type="button">Limpar filtros</button>
            </details>
          </aside>
          <div class="catalog-main">
            <div class="catalog-bar">
              <label class="search">${icon.search}<span class="sr">Buscar produtos</span><input id="f-q" type="search" placeholder="Buscar por produto, coleção ou frase"></label>
              <label class="sort"><span>Ordenar</span>
                <select id="f-sort">
                  <option value="destaques">Destaques</option><option value="novidades">Novidades</option>
                  <option value="menor">Menor preço</option><option value="maior">Maior preço</option><option value="nome">Nome (A–Z)</option>
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
          nome: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
        };
        list = list.sort(by[filters.sort]);
        // Itens indisponíveis sempre por último
        list.sort((a, b) => (S.availability(a).buyable || a.mode === 'gratis' || a.mode === 'orcamento' ? 0 : 1) - (S.availability(b).buyable || b.mode === 'gratis' || b.mode === 'orcamento' ? 0 : 1));
        $('#f-count').textContent = `${list.length} ${list.length === 1 ? 'produto' : 'produtos'}`;
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
    <p class="eyebrow">Coleções</p><h1 class="h1">Universos que se encontram.</h1>
    <p class="lead narrow">Cada coleção reúne produtos com a mesma história. As artes das coleções Dorama Club, Sweet Memories e BL Diaries são modelos demonstrativos até a Lilian enviar as definitivas.</p>
    <div class="grid-collections">${S.COLLECTIONS.map(collectionTile).join('')}</div>
  </div></section>`;
}

function collectionPage(id) {
  const c = S.COLLECTIONS.find((x) => x.id === id);
  if (!c) return notFound();
  const list = S.products().filter((p) => p.collection === id && p.active);
  if (id === 'boatoat') {
    return `<section class="boat-hero">
      <div class="wrap boat-grid">
        <div>
          <p class="eyebrow">Coleção conceitual · 8 produtos</p>
          <h1 class="display">BoatOat FM<br>Brasil 2026</h1>
          <p class="lead">As artes da Lilian, dois bordões e uma piada interna que o fandom inteiro entendeu.</p>
          ${conceptNote}
        </div>
        <div class="boat-arts">
          <figure><img src="img/arte-ta-bom.webp" alt="Arte “Tá bom!” da Lilian aplicada em canecas, com as vistas lado esquerdo, meio e lado direito" width="1200" height="800"><figcaption>Arte 1 · “Tá bom!”</figcaption></figure>
          <figure><img src="img/arte-gostoso.webp" alt="Arte panorâmica “Gostoso!” da Lilian com seis personagens entre corações" width="1400" height="599"><figcaption>Arte 2 · “Gostoso!”</figcaption></figure>
          <figure><img src="img/banner-boat.webp" alt="Banner “A frase favorita do Boat: Tá bom”, arte da Lilian" width="1400" height="630"><figcaption>Banner do Boat · “Tá bom”</figcaption></figure>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="wrap joke">
        <div class="joke-step"><span class="bubble bubble-a">Tá bom!</span><p>Durante o fanmeeting no Brasil, o Boat repetia “Tá bom!” a cada pergunta, pedido ou grito da plateia. Virou trilha sonora da noite.</p></div>
        <div class="joke-step"><span class="bubble bubble-b">Gostoso!</span><p>Quando os fãs chamavam o Oat de fofo, ele brincava e se chamava de “gostoso”. A plateia respondeu em coro até o final.</p></div>
        <div class="joke-step joke-end"><h2 class="h2">Virou coisa nossa.</h2><p>A Lilian juntou as duas lembranças em artes para guardar o que o fandom viveu junto. Na arte original, “Te Amo!” deu lugar a “Gostoso!”.</p></div>
      </div>
    </section>
    <section class="section section-tint"><div class="wrap">
      <div class="section-head"><div><p class="eyebrow">A coleção</p><h2 class="h2">Oito jeitos de levar a piada com você.</h2></div></div>
      ${grid(list)}
      <p class="fine">Mockups ilustrativos para apresentação. Materiais, medidas e preços serão confirmados pela Fan Joy Store antes das vendas.</p>
    </div></section>`;
  }
  return `<section class="section page-top"><div class="wrap">
    <p class="eyebrow">Coleção</p><h1 class="h1">${esc(c.name)}</h1>
    <p class="lead narrow">${esc(c.summary)}</p>
    ${grid(list)}
    <p class="fine">As artes desta coleção são modelos demonstrativos criados pela VB Studio para a apresentação.</p>
  </div></section>`;
}

// ---------- Produto ----------
function productPage(id) {
  const p = S.product(id);
  if (!p) return notFound();
  const a = S.availability(p);
  const gallery = [...(p.images || [])];
  if (p.collection === 'boatoat') {
    for (const art of [{ src: 'img/arte-ta-bom.webp', alt: 'Arte original “Tá bom!” da Lilian', fit: 'contain' }, { src: 'img/arte-gostoso.webp', alt: 'Arte original “Gostoso!” da Lilian', fit: 'contain' }]) {
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
      ${p.variations.map((v) => `<fieldset class="variation"><legend>${esc(v.name)}</legend><div class="opts">
        ${v.options.map((o, i) => `<label class="opt"><input type="radio" name="v-${esc(v.name)}" value="${esc(o.label)}" ${i === 0 ? 'checked' : ''}><span>${esc(o.label)}${o.add ? ` <small>+ ${brl(o.add)}</small>` : ''}</span></label>`).join('')}
      </div></fieldset>`).join('')}
      ${p.personalization ? `<label class="field" for="pz"><span>${esc(p.personalization.label)} <small>(opcional, até ${p.personalization.max} caracteres)</small></span>
        <input id="pz" maxlength="${p.personalization.max}" placeholder="${esc(p.personalization.placeholder)}">
        <small class="counter" id="pz-count">0/${p.personalization.max}</small></label>` : ''}
      <div class="buy-row">
        <div class="stepper" role="group" aria-label="Quantidade">
          <button type="button" id="q-minus" aria-label="Diminuir quantidade">−</button>
          <input id="qty" type="number" min="1" max="${qtyMax}" value="1" aria-label="Quantidade">
          <button type="button" id="q-plus" aria-label="Aumentar quantidade">+</button>
        </div>
        <button class="btn btn-primary btn-wide" id="add" type="button">Adicionar à sacola</button>
      </div>`;
  } else if (p.mode === 'gratis') {
    buy = '<button class="btn btn-primary btn-wide" id="free" type="button">Baixar grátis</button>';
  } else if (p.mode === 'orcamento') {
    buy = `<a class="btn btn-primary btn-wide" href="#brindes">Pedir orçamento ${icon.arrow}</a>`;
  } else {
    buy = '<p class="notice">Este produto está indisponível no momento. Ele volta para a loja quando houver nova tiragem.</p>';
  }

  return {
    html: `<section class="section page-top"><div class="wrap">
      <nav class="crumbs" aria-label="Você está em"><a href="#inicio">Início</a> / <a href="#categoria-${p.category}">${esc(S.categoryName(p.category))}</a> / <span>${esc(p.name)}</span></nav>
      <div class="pdp">
        <div class="pdp-gallery">
          <div class="pdp-main tone-${esc(p.art?.bg || 'cream')}" id="pdp-main">${productMedia(p, { large: true })}</div>
          ${gallery.length > 1 ? `<div class="thumbs">${gallery.map((g, i) => `<button type="button" class="thumb ${i === 0 ? 'is-on' : ''}" data-i="${i}" aria-label="Ver imagem ${i + 1}"><img src="${g.src}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>
        <div class="pdp-info">
          <a class="eyebrow" href="#colecao-${p.collection}">${esc(S.collectionName(p.collection))}</a>
          <h1 class="h1 pdp-title">${esc(p.name)}</h1>
          <p class="pdp-short">${esc(p.short)}</p>
          <p class="pdp-price" id="price">${p.mode === 'gratis' ? 'Grátis' : p.price == null ? 'Sob orçamento' : brl(p.price)}</p>
          ${p.price ? `<p class="pdp-pix">${brl(p.price * 0.95)} no Pix · ou 3× de ${brl(p.price / 3)} sem juros</p>` : ''}
          <div class="pdp-status">${availabilityPill(p)}${p.productionDays && a.buyable ? `<span class="muted">${p.mode === 'encomenda' ? 'Produção' : 'Separação'}: ${p.productionDays} ${p.productionDays === 1 ? 'dia útil' : 'dias úteis'} + frete</span>` : ''}</div>
          ${buy}
          <div class="pdp-acc">
            <details open><summary>Sobre o produto</summary><p>${esc(p.description)}</p></details>
            <details><summary>Detalhes</summary><ul>${p.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></details>
            <details><summary>Entrega e prazo</summary><p>O prazo total soma o tempo de ${p.mode === 'encomenda' ? 'produção' : 'separação'} e o prazo do frete escolhido. Calcule o frete pelo CEP na sacola.</p></details>
            <details><summary>Trocas</summary><p>Você pode desistir da compra em até 7 dias após o recebimento. Produtos personalizados com nome ou frase têm regras próprias. <a href="#politicas">Ver políticas</a>.</p></details>
          </div>
          ${p.collection === 'boatoat' ? conceptNote : '<p class="fine">Valores e materiais ilustrativos para a apresentação.</p>'}
        </div>
      </div>
      ${related.length ? `<div class="section-head related"><h2 class="h3">Combina com</h2></div>${grid(related)}` : ''}
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
      if (free) free.onclick = () => toast('Na loja definitiva o download começa aqui. Nesta apresentação, nenhum arquivo é baixado.');
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
      add.onclick = () => {
        S.addToCart(p.id, clampQty(qty.value), { ...selected }, pz ? pz.value.trim() : '');
        openDrawer();
        toast('Adicionado à sacola');
      };
    },
  };
}

// ---------- Sacola (gaveta e página) ----------
export function openDrawer() {
  const d = document.getElementById('drawer');
  renderDrawer();
  d.hidden = false;
  document.body.classList.add('no-scroll');
  d.querySelector('.drawer-close').focus();
}
export function closeDrawer() {
  document.getElementById('drawer').hidden = true;
  document.body.classList.remove('no-scroll');
}
function lineHTML(l, compact) {
  const opts = Object.entries(l.options).map(([k, v]) => `${esc(k)}: ${esc(v)}`);
  if (l.personalization) opts.push(`Personalização: “${esc(l.personalization)}”`);
  return `<li class="line" data-key="${esc(l.key)}" data-testid="cart-line">
    <a class="line-media tone-${esc(l.product.art?.bg || 'cream')}" href="#p-${l.id}">${productMedia(l.product)}</a>
    <div class="line-info">
      <a class="line-name" href="#p-${l.id}">${esc(l.product.name)}</a>
      ${opts.length ? `<p class="line-opts">${opts.join(' · ')}</p>` : ''}
      <div class="line-actions">
        <div class="stepper stepper-sm" role="group" aria-label="Quantidade de ${esc(l.product.name)}">
          <button type="button" data-act="dec" aria-label="Diminuir">−</button><span class="qty" data-testid="line-qty">${l.qty}</span><button type="button" data-act="inc" aria-label="Aumentar">+</button>
        </div>
        <button type="button" class="link-btn" data-act="rm">Remover</button>
      </div>
    </div>
    <p class="line-total">${brl(l.total)}${compact ? '' : `<small>${brl(l.unit)} cada</small>`}</p>
  </li>`;
}
function bindLines(root, after) {
  root.querySelectorAll('.line').forEach((li) => {
    const key = li.dataset.key;
    const line = S.getCart().find((l) => l.key === key);
    li.querySelector('[data-act="dec"]').onclick = () => { S.setQty(key, line.qty - 1); after(); };
    li.querySelector('[data-act="inc"]').onclick = () => { S.setQty(key, line.qty + 1); after(); };
    li.querySelector('[data-act="rm"]').onclick = () => { S.removeLine(key); after(); toast('Item removido'); };
  });
}
export function renderDrawer() {
  const body = document.getElementById('drawer-body');
  const lines = S.cartLines();
  body.innerHTML = lines.length ? `<ul class="lines">${lines.map((l) => lineHTML(l, true)).join('')}</ul>
    <div class="drawer-foot">
      <p class="sum-row"><span>Subtotal</span><strong>${brl(S.cartSubtotal())}</strong></p>
      <p class="fine">Frete e desconto do Pix calculados na sacola.</p>
      <a class="btn btn-primary btn-wide" href="#sacola">Ver sacola e calcular frete</a>
    </div>` : `<div class="empty-bag"><p>Sua sacola está vazia.</p><a class="btn btn-ghost" href="#loja">Explorar a loja</a></div>`;
  bindLines(body, renderDrawer);
}

let cep = '';
let chosenShip = null;
function bagPage() {
  return {
    html: '<section class="section page-top"><div class="wrap"><p class="eyebrow">Sacola</p><h1 class="h1">Sua sacola</h1><div id="bag"></div></div></section>',
    mount(root) {
      const box = root.querySelector('#bag');
      const render = () => {
        const lines = S.cartLines();
        if (!lines.length) { box.innerHTML = '<div class="empty-bag"><p>Sua sacola está vazia.</p><a class="btn btn-primary" href="#loja">Explorar a loja</a></div>'; return; }
        const quotes = cep ? S.shippingQuotes(cep, lines) : null;
        if (quotes && !quotes.quotes.find((q) => q.id === chosenShip?.id)) chosenShip = quotes.quotes[0];
        const sub = S.cartSubtotal();
        box.innerHTML = `<div class="bag-grid">
          <ul class="lines lines-page">${lines.map((l) => lineHTML(l, false)).join('')}</ul>
          <aside class="summary">
            <h2 class="h3">Resumo</h2>
            <form id="cep-form" class="cep-form"><label class="field" for="cep"><span>Calcular frete</span>
              <span class="inline"><input id="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" value="${esc(cep)}" maxlength="9"><button class="btn btn-small btn-ghost" type="submit">Calcular</button></span></label></form>
            ${cep && !quotes ? '<p class="error">Digite um CEP com 8 números.</p>' : ''}
            ${quotes ? `<p class="fine">Entrega para ${esc(quotes.region)} (valores simulados)</p><div class="ship-opts">${quotes.quotes.map((q) => `<label class="ship"><input type="radio" name="ship" value="${q.id}" ${chosenShip?.id === q.id ? 'checked' : ''}><span><strong>${esc(q.name)}</strong> · até ${q.days} dias úteis</span><b>${q.price ? brl(q.price) : 'Grátis'}</b></label>`).join('')}</div>` : ''}
            <p class="sum-row"><span>Subtotal</span><span>${brl(sub)}</span></p>
            <p class="sum-row"><span>Frete</span><span>${chosenShip && quotes ? (chosenShip.price ? brl(chosenShip.price) : 'Grátis') : 'Informe o CEP'}</span></p>
            <p class="sum-row sum-total"><span>Total</span><strong data-testid="bag-total">${brl(sub + (quotes && chosenShip ? chosenShip.price : 0))}</strong></p>
            <p class="fine">No Pix: ${brl(sub * 0.95 + (quotes && chosenShip ? chosenShip.price : 0))} (5% de desconto nos produtos)</p>
            <button class="btn btn-primary btn-wide" id="to-checkout" type="button" ${quotes ? '' : 'disabled'}>Finalizar compra</button>
            ${quotes ? '' : '<p class="fine">Calcule o frete para continuar.</p>'}
            <a class="link" href="#loja">Continuar comprando</a>
          </aside>
        </div>`;
        bindLines(box, render);
        box.querySelector('#cep-form').onsubmit = (e) => { e.preventDefault(); cep = box.querySelector('#cep').value; chosenShip = null; render(); };
        box.querySelector('#cep').oninput = (e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 8); e.target.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
        box.querySelectorAll('input[name="ship"]').forEach((r) => { r.onchange = () => { chosenShip = quotes.quotes.find((q) => q.id === r.value); render(); }; });
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
  if (!lines.length) return { html: '<section class="section page-top"><div class="wrap empty-bag"><p>Sua sacola está vazia.</p><a class="btn btn-primary" href="#loja">Explorar a loja</a></div></section>' };
  const quotes = cep ? S.shippingQuotes(cep, lines) : null;
  if (!quotes || !chosenShip) return { html: '<section class="section page-top"><div class="wrap empty-bag"><p>Calcule o frete na sacola antes de finalizar.</p><a class="btn btn-primary" href="#sacola">Voltar para a sacola</a></div></section>' };
  const sub = S.cartSubtotal();
  return {
    html: `<section class="section page-top"><div class="wrap">
      <p class="eyebrow">Finalizar compra · demonstração</p><h1 class="h1">Quase lá.</h1>
      <p class="notice">Nenhum pagamento é cobrado nesta apresentação. Não use dados reais de cartão.</p>
      <form id="co" class="checkout" novalidate>
        <div class="co-main">
          <fieldset class="co-step"><legend><span class="step-n">1</span> Seus dados</legend>
            <div class="row2">
              <label class="field" for="c-name"><span>Nome completo</span><input id="c-name" autocomplete="name" required></label>
              <label class="field" for="c-email"><span>E-mail</span><input id="c-email" type="email" autocomplete="email" required></label>
              <label class="field" for="c-phone"><span>WhatsApp</span><input id="c-phone" type="tel" autocomplete="tel" placeholder="(11) 90000-0000" required></label>
            </div>
          </fieldset>
          <fieldset class="co-step"><legend><span class="step-n">2</span> Entrega</legend>
            <p class="muted">CEP ${esc(cep)} · ${esc(quotes.region)} · <a href="#sacola">alterar</a></p>
            ${chosenShip.id === 'retirada' ? '<p>Retirada combinada em São Paulo. A Lilian envia o endereço e o horário pelo WhatsApp.</p>' : `<div class="row2">
              <label class="field field-wide" for="c-street"><span>Endereço</span><input id="c-street" autocomplete="address-line1" required></label>
              <label class="field" for="c-num"><span>Número</span><input id="c-num" required></label>
              <label class="field" for="c-comp"><span>Complemento <small>(opcional)</small></span><input id="c-comp" autocomplete="address-line2"></label>
              <label class="field" for="c-city"><span>Cidade e estado</span><input id="c-city" placeholder="São Paulo, SP" required></label>
            </div>`}
          </fieldset>
          <fieldset class="co-step"><legend><span class="step-n">3</span> Pagamento</legend>
            <div class="pay-opts">
              <label class="pay"><input type="radio" name="pay" value="pix" checked><span><strong>Pix</strong> · 5% de desconto, aprovação na hora</span></label>
              <label class="pay"><input type="radio" name="pay" value="cartao"><span><strong>Cartão de crédito</strong> · até 3× sem juros</span></label>
            </div>
            <div id="card" class="card-form" hidden>
              <div class="row2">
                <label class="field field-wide" for="cc-num"><span>Número do cartão</span><input id="cc-num" inputmode="numeric" autocomplete="off" placeholder="4111 1111 1111 1111"></label>
                <label class="field field-wide" for="cc-name"><span>Nome impresso no cartão</span><input id="cc-name" autocomplete="off"></label>
                <label class="field" for="cc-exp"><span>Validade</span><input id="cc-exp" placeholder="MM/AA" autocomplete="off" maxlength="5"></label>
                <label class="field" for="cc-cvv"><span>CVV</span><input id="cc-cvv" inputmode="numeric" autocomplete="off" maxlength="4"></label>
                <label class="field field-wide" for="cc-inst"><span>Parcelas</span><select id="cc-inst"></select></label>
              </div>
              <p class="fine">Para testar, use 4111 1111 1111 1111. Na loja definitiva, os dados do cartão vão direto para a empresa de pagamentos e nunca ficam salvos aqui.</p>
            </div>
          </fieldset>
          <p class="error" id="co-error" role="alert" hidden></p>
        </div>
        <aside class="summary">
          <h2 class="h3">Seu pedido</h2>
          <ul class="mini-lines">${lines.map((l) => `<li><span>${l.qty}× ${esc(l.product.name)}${l.personalization ? ` <small>“${esc(l.personalization)}”</small>` : ''}</span><span>${brl(l.total)}</span></li>`).join('')}</ul>
          <p class="sum-row"><span>Subtotal</span><span>${brl(sub)}</span></p>
          <p class="sum-row" id="row-disc"><span>Desconto Pix</span><span>− ${brl(sub * 0.05)}</span></p>
          <p class="sum-row"><span>Frete · ${esc(chosenShip.name)}</span><span>${chosenShip.price ? brl(chosenShip.price) : 'Grátis'}</span></p>
          <p class="sum-row sum-total"><span>Total</span><strong id="co-total"></strong></p>
          <p class="fine">Prazo estimado: até ${chosenShip.days} dias úteis, já com produção e separação.</p>
          <button class="btn btn-primary btn-wide" type="submit" id="place">Confirmar pedido</button>
          <p class="fine">Ao confirmar, você concorda com as <a href="#politicas">políticas da loja</a>.</p>
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
        inst.innerHTML = [1, 2, 3].map((n) => `<option value="${n}">${n}× de ${brl(total / n)} sem juros</option>`).join('');
      };
      root.querySelectorAll('input[name="pay"]').forEach((r) => { r.onchange = update; });
      $('#cc-num').oninput = (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); };
      $('#cc-exp').oninput = (e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
      update();
      $('#co').onsubmit = (e) => {
        e.preventDefault();
        const err = $('#co-error');
        const missing = [...root.querySelectorAll('.co-main input[required]')].filter((i) => !i.value.trim());
        root.querySelectorAll('.is-invalid').forEach((i) => i.classList.remove('is-invalid'));
        const fail = (msg, els) => { err.textContent = msg; err.hidden = false; els.forEach((i) => i.classList.add('is-invalid')); els[0]?.focus(); };
        if (missing.length) return fail('Preencha os campos destacados para continuar.', missing);
        if (!/^\S+@\S+\.\S+$/.test($('#c-email').value)) return fail('Confira o e-mail: ele precisa ter o formato nome@provedor.com.', [$('#c-email')]);
        const method = root.querySelector('input[name="pay"]:checked').value;
        let last4 = null;
        if (method === 'cartao') {
          const num = $('#cc-num').value;
          if (!luhn(num)) return fail('O número do cartão não é válido. Para testar, use 4111 1111 1111 1111.', [$('#cc-num')]);
          const [mm, yy] = $('#cc-exp').value.split('/').map(Number);
          const nowD = new Date();
          if (!mm || mm > 12 || !yy || 2000 + yy < nowD.getFullYear() || (2000 + yy === nowD.getFullYear() && mm < nowD.getMonth() + 1)) return fail('Confira a validade do cartão no formato MM/AA.', [$('#cc-exp')]);
          if (!/^\d{3,4}$/.test($('#cc-cvv').value)) return fail('O CVV tem 3 ou 4 números, no verso do cartão.', [$('#cc-cvv')]);
          if (!$('#cc-name').value.trim()) return fail('Informe o nome impresso no cartão.', [$('#cc-name')]);
          last4 = num.replace(/\D/g, '').slice(-4);
        }
        err.hidden = true;
        const order = S.createOrder({
          customer: { name: $('#c-name').value.trim(), email: $('#c-email').value.trim(), phone: $('#c-phone').value.trim(), city: $('#c-city')?.value.trim() || 'São Paulo, SP' },
          shipping: { id: chosenShip.id, name: chosenShip.name, price: chosenShip.price, days: chosenShip.days, cep },
          payment: { method, installments: method === 'cartao' ? Number(inst.value) : 1, last4 },
          lines: S.cartLines(),
        });
        S.clearCart();
        go(`#pedido-${order.code}`);
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
  return `<svg viewBox="-1 -1 27 27" class="pix-qr" role="img" aria-label="Código Pix demonstrativo, não pode ser pago"><rect x="-1" y="-1" width="27" height="27" fill="#fff"/><g fill="#16224F">${cells.join('')}</g></svg>`;
}

const FLOW = ['aguardando', 'pago', 'producao', 'enviado', 'entregue'];
function orderPage(code) {
  const o = S.getOrder(code);
  if (!o) return { html: `<section class="section page-top"><div class="wrap"><h1 class="h1">Pedido não encontrado</h1><p>Não encontramos o pedido ${esc(code)} neste navegador. <a href="#pedidos">Buscar outro pedido</a>.</p></div></section>` };
  const idx = FLOW.indexOf(o.status);
  const pixCode = `00020126-FANJOY-DEMO-${o.code}-NAO-PAGAVEL`;
  return {
    html: `<section class="section page-top"><div class="wrap order">
      <p class="eyebrow">Pedido ${esc(o.code)} · ${fmtDateTime(o.createdAt)}</p>
      <h1 class="h1">${o.status === 'aguardando' ? 'Pedido recebido. Falta o Pix.' : o.status === 'cancelado' ? 'Pedido cancelado.' : 'Obrigada pelo pedido!'}</h1>
      <p class="notice">Pedido de demonstração: nada foi cobrado e nada será enviado.</p>
      ${o.status === 'cancelado' ? '' : `<ol class="timeline" aria-label="Andamento do pedido">${FLOW.map((s, i) => `<li class="${i <= idx ? 'is-done' : ''} ${i === idx ? 'is-now' : ''}"><span></span>${esc(S.statusLabel(s))}</li>`).join('')}</ol>`}
      ${o.status === 'aguardando' && o.payment.method === 'pix' ? `<div class="pix-box">
        ${pixPattern(o.code)}
        <div><h2 class="h3">Pague ${brl(o.total)} com Pix</h2>
          <p>Na loja definitiva, este QR Code é gerado pela empresa de pagamentos e a confirmação chega sozinha em segundos.</p>
          <label class="field" for="pix-code"><span>Pix copia e cola (demonstrativo)</span><input id="pix-code" readonly value="${pixCode}"></label>
          <div class="inline"><button class="btn btn-small btn-ghost" id="copy-pix" type="button">Copiar código</button><button class="btn btn-small btn-primary" id="sim-pay" type="button">Simular pagamento aprovado</button></div>
        </div></div>` : ''}
      <div class="order-grid">
        <div>
          <h2 class="h3">Itens</h2>
          <ul class="mini-lines">${o.items.map((it) => `<li><span>${it.qty}× ${esc(it.name)}${Object.values(it.options || {}).length ? ` <small>${esc(Object.values(it.options).join(' · '))}</small>` : ''}${it.personalization ? ` <small>“${esc(it.personalization)}”</small>` : ''}</span><span>${brl(it.unit * it.qty)}</span></li>`).join('')}</ul>
          <p class="sum-row"><span>Subtotal</span><span>${brl(o.subtotal)}</span></p>
          ${o.discount ? `<p class="sum-row"><span>Desconto Pix</span><span>− ${brl(o.discount)}</span></p>` : ''}
          <p class="sum-row"><span>Frete · ${esc(o.shipping.name)}</span><span>${o.shippingPrice ? brl(o.shippingPrice) : 'Grátis'}</span></p>
          <p class="sum-row sum-total"><span>Total</span><strong>${brl(o.total)}</strong></p>
        </div>
        <div class="order-side">
          <h2 class="h3">Entrega e pagamento</h2>
          <p>${esc(o.customer.name)}<br>${esc(o.customer.email)}</p>
          <p>${esc(o.shipping.name)}${o.shipping.days ? ` · até ${o.shipping.days} dias úteis` : ''}</p>
          <p>${o.payment.method === 'pix' ? 'Pix' : `Cartão final ${esc(o.payment.last4 || '••••')} · ${o.payment.installments}×`}</p>
          <h2 class="h3">Histórico</h2>
          <ul class="history">${o.history.map((h) => `<li>${fmtDateTime(h.at)} · ${esc(S.statusLabel(h.status))}</li>`).join('')}</ul>
          <a class="link" href="#pedidos">Acompanhar outros pedidos ${icon.arrow}</a>
        </div>
      </div>
    </div></section>`,
    mount(root) {
      const sim = root.querySelector('#sim-pay');
      if (sim) sim.onclick = () => { S.payPix(o.code); toast('Pagamento aprovado (simulação)'); window.dispatchEvent(new HashChangeEvent('hashchange')); };
      const copy = root.querySelector('#copy-pix');
      if (copy) copy.onclick = () => {
        const input = root.querySelector('#pix-code');
        navigator.clipboard?.writeText(input.value).then(() => toast('Código copiado'), () => { input.select(); toast('Selecione e copie o código'); }) ?? input.select();
      };
    },
  };
}

function ordersLookup() {
  const mine = S.getOrders().filter((o) => o.origin === 'loja');
  return {
    html: `<section class="section page-top"><div class="wrap narrow-wrap">
      <p class="eyebrow">Meus pedidos</p><h1 class="h1">Acompanhe seu pedido.</h1>
      <form id="lookup" class="lookup"><label class="field" for="lk-code"><span>Número do pedido</span><input id="lk-code" placeholder="FJ1234" required></label>
        <label class="field" for="lk-email"><span>E-mail usado na compra</span><input id="lk-email" type="email" required></label>
        <button class="btn btn-primary" type="submit">Buscar pedido</button></form>
      <p class="error" id="lk-err" role="alert" hidden></p>
      <h2 class="h3">Pedidos feitos neste navegador</h2>
      ${mine.length ? `<ul class="order-list">${mine.map((o) => `<li><a href="#pedido-${o.code}"><strong>${o.code}</strong><span>${fmtDateTime(o.createdAt)}</span><span class="pill pill-${o.status}">${esc(S.statusLabel(o.status))}</span><span>${brl(o.total)}</span></a></li>`).join('')}</ul>` : '<p class="muted">Você ainda não fez nenhum pedido de demonstração. <a href="#loja">Visite a loja</a> e experimente o checkout.</p>'}
      <p class="fine">Na loja definitiva, a cliente também recebe o código de rastreio dos Correios por e-mail e WhatsApp.</p>
    </div></section>`,
    mount(root) {
      root.querySelector('#lookup').onsubmit = (e) => {
        e.preventDefault();
        const o = S.getOrder(root.querySelector('#lk-code').value.trim());
        const email = root.querySelector('#lk-email').value.trim().toLowerCase();
        const err = root.querySelector('#lk-err');
        if (!o || o.customer.email.toLowerCase() !== email) { err.textContent = 'Não encontramos um pedido com esse número e e-mail. Confira os dados no e-mail de confirmação.'; err.hidden = false; return; }
        go(`#pedido-${o.code}`);
      };
    },
  };
}

// ---------- Encomendas personalizadas e brindes ----------
function requestForm(type) {
  const corp = type === 'orcamento';
  return {
    html: `<section class="section page-top"><div class="wrap req">
      <div class="req-copy">
        <p class="eyebrow">${corp ? 'Brindes corporativos' : 'Encomendas personalizadas'}</p>
        <h1 class="h1">${corp ? 'Brindes que as pessoas guardam.' : 'Sua ideia, desenhada pela Lilian.'}</h1>
        <p class="lead">${corp ? 'Kits para eventos, onboarding, datas comemorativas e ações com influenciadores. A arte é criada a partir da identidade da sua empresa.' : 'Um presente com o casal favorito, um kit para o fã-clube ou uma caneca com aquela piada interna. Conte o que você imagina.'}</p>
        <ol class="steps">
          ${(corp
            ? ['Você conta o objetivo, a quantidade e a data', 'A Lilian envia proposta com produtos, arte e valores', 'Aprovação da arte e produção em lote', 'Entrega com nota fiscal']
            : ['Você envia a ideia e as referências', 'A Lilian responde com proposta e prazo', 'Você aprova o esboço antes da produção', 'Produção e envio']).map((s) => `<li>${esc(s)}</li>`).join('')}
        </ol>
        ${corp ? '<p class="fine">Pedido mínimo de 20 unidades por produto. Prazo médio de 15 dias úteis após aprovação da arte.</p>' : '<p class="fine">Encomendas usam artes novas, por isso o valor e o prazo são combinados caso a caso.</p>'}
      </div>
      <form id="req" class="req-form" novalidate>
        <div class="row2">
          <label class="field" for="r-name"><span>Seu nome</span><input id="r-name" required autocomplete="name"></label>
          ${corp ? '<label class="field" for="r-company"><span>Empresa</span><input id="r-company" required autocomplete="organization"></label>' : ''}
          <label class="field" for="r-email"><span>E-mail</span><input id="r-email" type="email" required autocomplete="email"></label>
          <label class="field" for="r-phone"><span>WhatsApp</span><input id="r-phone" type="tel" autocomplete="tel"></label>
          ${corp ? '<label class="field" for="r-cnpj"><span>CNPJ <small>(opcional)</small></span><input id="r-cnpj" inputmode="numeric"></label>' : ''}
          <label class="field" for="r-product"><span>${corp ? 'Produtos de interesse' : 'Produto base'}</span>
            <select id="r-product">${(corp ? ['Canecas', 'Cadernos e papelaria', 'Ecobags', 'Kits completos', 'Ainda não sei'] : ['Caneca', 'Camiseta', 'Photocards', 'Bottons', 'Adesivos', 'Banner', 'Caixa presente', 'Outro']).map((x) => `<option>${x}</option>`).join('')}</select></label>
          <label class="field" for="r-qty"><span>Quantidade</span><input id="r-qty" type="number" min="${corp ? 20 : 1}" value="${corp ? 20 : 1}" required></label>
          <label class="field" for="r-date"><span>Para quando?</span><input id="r-date" type="date"></label>
        </div>
        <label class="field" for="r-msg"><span>${corp ? 'Conte sobre a ação e o público' : 'Descreva sua ideia'}</span><textarea id="r-msg" rows="5" required maxlength="1000"></textarea></label>
        <label class="field" for="r-file"><span>Referências <small>(opcional)</small></span><input id="r-file" type="file" accept="image/*,.pdf" multiple></label>
        <label class="check"><input type="checkbox" id="r-lgpd" required> Autorizo o contato da Fan Joy Store sobre este pedido, conforme a <a href="#politicas">política de privacidade</a>.</label>
        <p class="error" id="r-err" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">${corp ? 'Pedir orçamento' : 'Enviar minha ideia'}</button>
        <p class="fine">Demonstração: a solicitação aparece no painel de gestão, mas nenhum e-mail é enviado.</p>
      </form>
      <div id="req-ok" class="req-ok" hidden></div>
    </div></section>`,
    mount(root) {
      const $ = (s) => root.querySelector(s);
      $('#req').onsubmit = (e) => {
        e.preventDefault();
        const req = [...root.querySelectorAll('#req [required]')].filter((i) => (i.type === 'checkbox' ? !i.checked : !i.value.trim()));
        root.querySelectorAll('.is-invalid').forEach((i) => i.classList.remove('is-invalid'));
        const err = $('#r-err');
        if (req.length) { err.textContent = 'Preencha os campos destacados e aceite o contato para enviar.'; err.hidden = false; req.forEach((i) => i.classList.add('is-invalid')); req[0].focus(); return; }
        if (corp && Number($('#r-qty').value) < 20) { err.textContent = 'Para brindes corporativos, o mínimo é de 20 unidades.'; err.hidden = false; $('#r-qty').focus(); return; }
        const r = S.addRequest({
          type, name: $('#r-name').value.trim(), company: $('#r-company')?.value.trim(), email: $('#r-email').value.trim(),
          phone: $('#r-phone').value.trim(), product: $('#r-product').value, qty: Number($('#r-qty').value), date: $('#r-date').value,
          message: $('#r-msg').value.trim(), files: [...$('#r-file').files].map((f) => f.name),
        });
        $('#req').hidden = true;
        const ok = $('#req-ok');
        ok.hidden = false;
        ok.innerHTML = `<h2 class="h3">Recebemos sua ${corp ? 'solicitação de orçamento' : 'ideia'}.</h2><p>Protocolo <strong>${r.id}</strong>. Na loja definitiva, a Lilian responde em até 2 dias úteis pelo e-mail ou WhatsApp informado.</p><a class="btn btn-ghost" href="#loja">Voltar para a loja</a>`;
        ok.focus?.();
      };
    },
  };
}

// ---------- Institucionais ----------
function story() {
  return `<section class="section page-top"><div class="wrap story-page">
    <img src="img/logo.webp" alt="Logo da Fan Joy Store" width="360" height="360" class="story-logo">
    <div class="prose">
      <p class="eyebrow">Nossa história</p>
      <h1 class="h1">De fã para fã. De verdade.</h1>
      <p>A Fan Joy Store nasceu em São Paulo, da criatividade da Lilian e da vontade de transformar o carinho por artistas, séries e doramas em objetos para o dia a dia.</p>
      <p>Cada produto começa num desenho dela. A florzinha sorridente da logo resume a ideia: pequenas alegrias que acompanham a rotina, do café da manhã ao show.</p>
      <h2 class="h3">Como nasceu “Virou coisa nossa”</h2>
      <p>No fanmeeting no Brasil, o Boat respondia “Tá bom!” para tudo, e o Oat brincava se chamando de “gostoso” quando os fãs o chamavam de fofo. A Lilian guardou essas lembranças em duas artes, que deram origem à coleção conceitual BoatOat FM Brasil 2026.</p>
      <p class="fine">A coleção é uma homenagem de fã, sem vínculo oficial com os artistas, a produtora ou o evento.</p>
      <h2 class="h3">O que a gente valoriza</h2>
      <ul class="values"><li><strong>Arte autoral.</strong> Desenhos próprios, feitos com cuidado e respeito ao fandom.</li><li><strong>Transparência.</strong> Prazo, disponibilidade e custos claros antes da compra.</li><li><strong>Comunidade.</strong> Freebies, encomendas e espaço para ideias dos fãs.</li></ul>
      <p class="credit">Site criado e desenvolvido pela VB Studio, de Victoria Bellisario.</p>
    </div>
  </div></section>`;
}

function support() {
  return `<section class="section page-top"><div class="wrap">
    <p class="eyebrow">Atendimento</p><h1 class="h1">Estamos por aqui.</h1>
    <div class="contact-grid">
      <div class="contact"><h2 class="h3">WhatsApp</h2><p class="muted">Número oficial a definir</p><p>Segunda a sexta, das 10h às 18h.</p></div>
      <div class="contact"><h2 class="h3">E-mail</h2><p class="muted">Endereço oficial a definir</p><p>Respostas em até 2 dias úteis.</p></div>
      <div class="contact"><h2 class="h3">Instagram</h2><p class="muted">Perfil oficial a definir</p><p>Novidades, bastidores e freebies.</p></div>
    </div>
    <div class="faq-wrap"><div><h2 class="h2">Dúvidas frequentes</h2><a class="link" href="#politicas">Políticas da loja ${icon.arrow}</a></div>${faqList(FAQ)}</div>
  </div></section>`;
}

const POLICIES = [
  { id: 'entrega', title: 'Entrega', body: [
    'Enviamos para todo o Brasil pelos Correios (PAC e SEDEX). Em São Paulo capital, também é possível combinar a retirada.',
    'O prazo total soma a separação ou produção do produto e o prazo do frete. Os dois aparecem antes de você finalizar a compra.',
    'Depois do envio, você recebe o código de rastreio por e-mail e WhatsApp.',
  ] },
  { id: 'trocas', title: 'Trocas e devoluções', body: [
    'Compras feitas pela internet podem ser desistidas em até 7 dias após o recebimento, conforme o artigo 49 do Código de Defesa do Consumidor.',
    'Produtos com defeito ou diferentes do pedido são trocados sem custo. Avise em até 30 dias com fotos do produto e da embalagem.',
    'Produtos personalizados com nome, frase ou arte exclusiva são feitos sob medida. Pedidos de troca por arrependimento nesses casos serão avaliados conforme a orientação jurídica da loja.',
  ] },
  { id: 'cancelamento', title: 'Cancelamento', body: [
    'Pedidos podem ser cancelados sem custo até o início da produção. O status aparece em “Meus pedidos”.',
    'O reembolso é feito pelo mesmo meio de pagamento: Pix em até 5 dias úteis e estorno no cartão conforme a operadora.',
  ] },
  { id: 'privacidade', title: 'Privacidade', body: [
    'Usamos seus dados apenas para processar pedidos, entregar produtos e responder atendimentos, conforme a Lei Geral de Proteção de Dados (LGPD).',
    'Os dados de cartão são processados pela empresa de pagamentos e não ficam armazenados na loja.',
    'Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail oficial de atendimento.',
  ] },
];
function policies() {
  return {
    html: `<section class="section page-top"><div class="wrap policies">
      <aside class="policy-nav"><p class="eyebrow">Políticas</p>${POLICIES.map((p) => `<button type="button" class="link-btn" data-to="pol-${p.id}">${esc(p.title)}</button>`).join('')}</aside>
      <div class="prose">
        <h1 class="h1">Entregas, trocas, cancelamento e privacidade</h1>
        <p class="notice">Textos-modelo para a apresentação. Eles serão revisados com a Lilian e com orientação jurídica antes das vendas.</p>
        ${POLICIES.map((p) => `<section id="pol-${p.id}"><h2 class="h3">${esc(p.title)}</h2>${p.body.map((b) => `<p>${esc(b)}</p>`).join('')}</section>`).join('')}
      </div>
    </div></section>`,
    mount(root) {
      root.querySelectorAll('[data-to]').forEach((b) => { b.onclick = () => root.querySelector('#' + b.dataset.to).scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    },
  };
}

export function notFound() {
  return `<section class="section page-top"><div class="wrap narrow-wrap">
    <p class="eyebrow">Página não encontrada</p><h1 class="h1">Essa página saiu para o show.</h1>
    <p>O endereço pode ter mudado ou o produto saiu do catálogo.</p>
    <div class="hero-actions"><a class="btn btn-primary" href="#loja">Ir para a loja</a><a class="btn btn-ghost" href="#inicio">Página inicial</a></div>
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

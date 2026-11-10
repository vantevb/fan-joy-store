// Painel de gestão da Lilian: visão geral, pedidos, produtos e estoque, solicitações, relatórios
// e a apresentação do sistema personalizado opcional.
import * as S from './state.js';
import * as api from './api.js';
import { brl, esc, fmtDate, fmtDateTime, toast, productMedia } from './ui.js';

const loading = '<p class="muted loading-row" role="status">Carregando…</p>';
// Mostra o erro dentro do painel, sem derrubar a página.
const failBox = (e) => `<div class="panel panel-error" role="alert"><strong>Não foi possível carregar.</strong><p>${esc(e.message)}</p><button type="button" class="btn btn-small btn-ghost" data-retry>Tentar de novo</button></div>`;
async function safe(box, fn) {
  try { await fn(); } catch (e) {
    box.innerHTML = failBox(e);
    box.querySelector('[data-retry]').onclick = () => safe(box, fn);
  }
}

const KIND = {
  regular: { label: 'Em linha', cls: 'k-regular' },
  novo: { label: 'Novo (menos de 30 dias)', cls: 'k-novo' },
  encomenda: { label: 'Sob encomenda', cls: 'k-encomenda' },
  indisponivel: { label: 'Indisponível', cls: 'k-off' },
};
const kindChip = (k) => `<span class="kchip ${KIND[k].cls}">${KIND[k].label}</span>`;

const period = { days: 30, category: '', collection: '' };

let counts = { pending: 0, newReq: 0 };
let countsLoaded = false;
// Atualiza só os números do menu, sem redesenhar a página.
function updateNavCounts(root) {
  const set = (id, n) => {
    const a = root.querySelector(`.admin-nav a[href="#${id}"]`);
    if (!a) return;
    let b = a.querySelector('.count');
    if (!n) { b?.remove(); return; }
    if (!b) { b = document.createElement('b'); b.className = 'count'; a.append(' ', b); }
    b.textContent = n;
  };
  set('painel-pedidos', counts.pending);
  set('painel-solicitacoes', counts.newReq);
}
async function refreshCounts() {
  const [orders, reqs] = await Promise.all([api.admin.orders(), api.admin.requests()]);
  counts = { pending: orders.filter((o) => ['aguardando', 'pago', 'producao'].includes(o.status)).length, newReq: reqs.filter((r) => r.status === 'novo').length };
  return { orders, reqs };
}
function shell(active, content) {
  const nav = [
    ['painel', 'Visão geral'], ['painel-pedidos', 'Pedidos'], ['painel-produtos', 'Produtos e estoque'],
    ['painel-solicitacoes', 'Encomendas e orçamentos'], ['painel-relatorios', 'Relatórios'], ['sistema-opcional', 'Sistema opcional'],
  ];
  const { pending, newReq } = counts;
  return `<section class="admin">
    <div class="wrap admin-grid">
      <aside class="admin-nav" aria-label="Menu do painel">
        <p class="admin-brand">Fan Joy · Gestão</p>
        ${nav.map(([id, label]) => `<a href="#${id}" class="${active === id ? 'is-on' : ''}" ${active === id ? 'aria-current="page"' : ''}>${label}${id === 'painel-pedidos' && pending ? ` <b class="count">${pending}</b>` : ''}${id === 'painel-solicitacoes' && newReq ? ` <b class="count">${newReq}</b>` : ''}</a>`).join('')}
        <div class="admin-nav-foot">
          ${api.admin.canReset ? '<p class="fine">Dados de exemplo salvos só neste navegador.</p><button type="button" class="link-btn" id="adm-reset">Restaurar dados de exemplo</button>' : ''}
          <button type="button" class="link-btn" id="adm-out">Sair do painel</button>
        </div>
      </aside>
      <div class="admin-main">${content}</div>
    </div>
  </section>`;
}
function bindShell(root) {
  root.querySelector('#adm-out').onclick = async () => { await api.admin.signOut(); countsLoaded = false; location.hash = '#inicio'; };
  const reset = root.querySelector('#adm-reset');
  if (reset) reset.onclick = () => {
    if (reset.dataset.armed) { S.resetDemo(); return; }
    reset.dataset.armed = '1';
    reset.textContent = 'Clique de novo para confirmar';
    setTimeout(() => { reset.textContent = 'Restaurar dados de exemplo'; delete reset.dataset.armed; }, 4000);
  };
}

function login(next) {
  const demo = !api.live;
  return {
    html: `<section class="section page-top"><div class="wrap narrow-wrap login">
      <p class="eyebrow">Painel de gestão</p><h1 class="h1">Área da Lilian</h1>
      ${demo ? '<p>Na loja definitiva, o painel tem login com e-mail e senha, e cada pessoa da equipe recebe só as permissões de que precisa.</p>' : '<p>Entre com o e-mail e a senha da sua conta da loja.</p>'}
      <form id="login" class="lookup" novalidate>
        <label class="field" for="lg-email"><span>E-mail</span><input id="lg-email" type="email" autocomplete="username" ${demo ? 'value="lilian@fanjoy.demo" readonly' : 'required'}></label>
        <label class="field" for="lg-pass"><span>Senha</span><input id="lg-pass" type="password" autocomplete="current-password" ${demo ? 'value="demonstracao" readonly' : 'required'}></label>
        <p class="error" id="lg-err" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">${demo ? 'Entrar na demonstração' : 'Entrar'}</button>
      </form>
      ${demo ? '<p class="fine">Nesta apresentação, o acesso é liberado para qualquer pessoa conhecer o painel.</p>' : '<p class="fine">Esqueceu a senha? Peça para a VB Studio enviar um link de redefinição.</p>'}
    </div></section>`,
    mount(root) {
      root.querySelector('#login').onsubmit = async (e) => {
        e.preventDefault();
        const btn = root.querySelector('#login button');
        const err = root.querySelector('#lg-err');
        err.hidden = true; btn.disabled = true; btn.textContent = 'Entrando…';
        try {
          await api.admin.signIn(root.querySelector('#lg-email').value.trim(), root.querySelector('#lg-pass').value);
          next();
        } catch (ex) {
          err.textContent = ex.message; err.hidden = false;
          btn.disabled = false; btn.textContent = demo ? 'Entrar na demonstração' : 'Entrar';
        }
      };
    },
  };
}

function periodBar() {
  return `<form class="period" id="period">
    <label class="field"><span>Período</span><select id="pd-days">${[[7, 'Últimos 7 dias'], [30, 'Últimos 30 dias'], [90, 'Últimos 90 dias'], [120, 'Últimos 120 dias']].map(([v, l]) => `<option value="${v}" ${period.days === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field"><span>Categoria</span><select id="pd-cat"><option value="">Todas</option>${S.CATEGORIES.filter((c) => !['freebies', 'brindes'].includes(c.id)).map((c) => `<option value="${c.id}" ${period.category === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Coleção</span><select id="pd-coll"><option value="">Todas</option>${S.COLLECTIONS.map((c) => `<option value="${c.id}" ${period.collection === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
  </form>`;
}
function bindPeriod(root, rerender) {
  root.querySelector('#pd-days').onchange = (e) => { period.days = Number(e.target.value); rerender(); };
  root.querySelector('#pd-cat').onchange = (e) => { period.category = e.target.value; rerender(); };
  root.querySelector('#pd-coll').onchange = (e) => { period.collection = e.target.value; rerender(); };
}

// Gráfico de barras simples: receita por semana (uma série, sem legenda).
function weeklyChart(weekly) {
  const max = Math.max(1, ...weekly.map((w) => w.revenue));
  const nice = Math.ceil(max / 500) * 500;
  const W = 640; const H = 200; const pad = { l: 56, r: 8, t: 12, b: 28 };
  const bw = (W - pad.l - pad.r) / weekly.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / nice);
  const ticks = [0, nice / 2, nice];
  return `<div class="chart-box"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Receita por semana no período">
    ${ticks.map((t) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" class="axis">${brl(t).replace(',00', '')}</text>`).join('')}
    ${weekly.map((w, i) => {
      const h = Math.max(0, y(0) - y(w.revenue));
      const x = pad.l + i * bw + 2;
      const r = Math.min(4, h / 2);
      return `<g class="bar"><title>Semana de ${fmtDate(w.start)}: ${brl(w.revenue)}</title>
        <rect x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}" fill="transparent"/>
        ${h > 0 ? `<path d="M${x} ${y(0)} V${y(w.revenue) + r} Q${x} ${y(w.revenue)} ${x + r} ${y(w.revenue)} H${x + bw - 4 - r} Q${x + bw - 4} ${y(w.revenue)} ${x + bw - 4} ${y(w.revenue) + r} V${y(0)} Z" class="bar-fill"/>` : ''}
        ${weekly.length <= 6 || i % Math.ceil(weekly.length / 6) === 0 ? `<text x="${x + (bw - 4) / 2}" y="${H - 8}" text-anchor="middle" class="axis">${fmtDate(w.start)}</text>` : ''}</g>`;
    }).join('')}
  </svg></div>`;
}

function rowItem(r, metric) {
  return `<li><span class="ri-media">${productMedia(r.p)}</span><span class="ri-name">${esc(r.p.name)}<small>${kindChip(r.kind)}</small></span><span class="ri-val">${metric}</span></li>`;
}

function overview() {
  return {
    html: shell('painel', '<div id="ov"></div>'),
    mount(root) {
      bindShell(root);
      const box = root.querySelector('#ov');
      const render = () => safe(box, async () => {
        const [a, orders] = await Promise.all([api.admin.dashboard(period), api.admin.orders()]);
        const action = orders.filter((o) => ['aguardando', 'pago', 'producao'].includes(o.status));
        box.innerHTML = `
          <div class="admin-head"><div><p class="eyebrow">Visão geral</p><h1 class="h2">Bom dia, Lilian.</h1></div>${periodBar()}</div>
          <div class="kpis">
            <div class="kpi"><span>Receita de produtos</span><strong>${brl(a.revenue)}</strong></div>
            <div class="kpi"><span>Pedidos</span><strong>${a.orderCount}</strong></div>
            <div class="kpi"><span>Ticket médio</span><strong>${brl(a.ticket)}</strong></div>
            <div class="kpi"><span>Itens vendidos</span><strong>${a.items}</strong></div>
          </div>
          <div class="panel"><div class="panel-head"><h2 class="h3">Receita por semana</h2><span class="fine">Sem frete, sem pedidos cancelados</span></div>${weeklyChart(a.weekly)}</div>
          <div class="panels-2">
            <div class="panel"><h2 class="h3">Mais vendidos</h2>
              ${a.top.length ? `<ol class="rank">${a.top.map((r) => rowItem(r, `${r.qty} un · ${brl(r.revenue)}`)).join('')}</ol>` : '<p class="muted">Nenhuma venda no período.</p>'}</div>
            <div class="panel"><h2 class="h3">Menos vendidos</h2>
              <p class="fine">Só entram produtos em linha há mais de 30 dias e com estoque. Novos, sob encomenda e indisponíveis ficam de fora para não distorcer a leitura.</p>
              ${a.bottom.length ? `<ol class="rank">${a.bottom.map((r) => rowItem(r, `${r.qty} un · ${r.perWeek.toLocaleString('pt-BR')} por semana`)).join('')}</ol>` : '<p class="muted">Nenhum produto comparável nesse filtro.</p>'}</div>
            <div class="panel panel-warn"><h2 class="h3">Estoque baixo</h2>
              ${a.lowStock.length ? `<ul class="rank">${a.lowStock.map((p) => `<li><span class="ri-media">${productMedia(p)}</span><span class="ri-name">${esc(p.name)}<small>mínimo: ${p.lowStock} un</small></span><span class="ri-val"><b class="stock-low">${p.stock} un</b></span></li>`).join('')}</ul>` : '<p class="muted">Tudo certo com o estoque.</p>'}
              <a class="link" href="#painel-produtos">Repor estoque</a></div>
            <div class="panel"><h2 class="h3">Com estoque, sem vendas no período</h2>
              ${a.stalled.length ? `<ul class="rank">${a.stalled.map((r) => rowItem(r, `${r.p.stock} un paradas`)).join('')}</ul><p class="fine">Ideias: destaque na página inicial, kit com produto que vende bem ou post no Instagram.</p>` : '<p class="muted">Todos os produtos com estoque tiveram vendas no período.</p>'}</div>
          </div>
          <div class="panel"><div class="panel-head"><h2 class="h3">Pedidos que precisam de você</h2><a class="link" href="#painel-pedidos">Ver todos</a></div>
            ${action.length ? `<ul class="order-list">${action.slice(0, 6).map((o) => `<li><a href="#painel-pedidos"><strong>${o.code}</strong><span>${esc(o.customer.name)}</span><span class="pill pill-${o.status}">${esc(S.statusLabel(o.status))}</span><span>${brl(o.total)}</span></a></li>`).join('')}</ul>` : '<p class="muted">Nenhum pedido pendente.</p>'}</div>
          <p class="legend-kinds">${Object.keys(KIND).map(kindChip).join('')}</p>`;
        bindPeriod(box, render);
      });
      return render();
    },
  };
}

const orderFilter = { status: '', q: '' };
function ordersAdmin() {
  return {
    html: shell('painel-pedidos', '<div id="po"></div>'),
    mount(root) {
      bindShell(root);
      const box = root.querySelector('#po');
      const render = (keepFocus = false) => safe(box, async () => {
        const list = await api.admin.orders({ status: orderFilter.status, q: orderFilter.q });
        box.innerHTML = `<div class="admin-head"><div><p class="eyebrow">Pedidos</p><h1 class="h2">Acompanhar e atualizar pedidos</h1></div>
          <div class="period"><label class="field"><span>Status</span><select id="os"><option value="">Todos</option>${S.STATUS.map((s) => `<option value="${s.id}" ${orderFilter.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
          <label class="field"><span>Buscar</span><input id="oq" type="search" placeholder="Código ou cliente" value="${esc(orderFilter.q)}"></label></div></div>
          <p class="fine">${list.length} pedidos. Ao mudar o status, a cliente vê a atualização em “Meus pedidos”. Na versão definitiva, ela também recebe e-mail.</p>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Itens</th><th class="num">Total</th><th>Pagamento</th><th>Status</th></tr></thead>
            <tbody>${list.slice(0, 60).map((o) => `<tr data-testid="admin-order" data-code="${o.code}">
              <td><a href="#pedido-${o.code}"><strong>${o.code}</strong></a>${o.origin === 'loja' ? ' <span class="kchip k-novo">da loja</span>' : ''}</td>
              <td>${fmtDateTime(o.createdAt)}</td><td>${esc(o.customer.name)}<small class="block">${esc(o.customer.city || '')}</small></td>
              <td>${o.items.map((it) => `${it.qty}× ${esc(it.name)}${it.personalization ? ` <small>“${esc(it.personalization)}”</small>` : ''}`).join('<br>')}</td>
              <td class="num">${brl(o.total)}</td><td>${o.payment.method === 'pix' ? 'Pix' : `Cartão ${o.payment.installments}×`}</td>
              <td><label class="sr" for="st-${o.code}">Status do pedido ${o.code}</label><select id="st-${o.code}" class="status-select pill-${o.status}" data-code="${o.code}">${S.STATUS.map((s) => `<option value="${s.id}" ${o.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
              ${['pago', 'producao', 'enviado'].includes(o.status) && api.live ? `<label class="sr" for="tr-${o.code}">Código de rastreio do pedido ${o.code}</label><input id="tr-${o.code}" class="tracking" placeholder="Rastreio" value="${esc(o.trackingCode || '')}">` : ''}</td>
            </tr>`).join('')}</tbody></table></div>
          ${list.length > 60 ? '<p class="fine">Mostrando os 60 mais recentes. Use os filtros para encontrar pedidos antigos.</p>' : ''}`;
        box.querySelector('#os').onchange = (e) => { orderFilter.status = e.target.value; render(); };
        let t;
        box.querySelector('#oq').oninput = (e) => { orderFilter.q = e.target.value; clearTimeout(t); t = setTimeout(() => render(true), 250); };
        if (keepFocus) { const i = box.querySelector('#oq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
        box.querySelectorAll('.status-select').forEach((sel) => {
          sel.onchange = async () => {
            sel.disabled = true;
            let tracking = '';
            if (sel.value === 'enviado') tracking = box.querySelector(`#tr-${sel.dataset.code}`)?.value || '';
            try { await api.admin.setOrderStatus(sel.dataset.code, sel.value, tracking); toast(`Pedido ${sel.dataset.code}: ${S.statusLabel(sel.value)}`); } catch (e) { toast(e.message); }
            render();
          };
        });
      });
      return render();
    },
  };
}

// Textos em inglês do produto novo. O que ficar vazio aparece em português na versão em inglês da loja.
function englishTexts(name, desc, pz) {
  if (!name && !desc) return undefined;
  const en = {};
  if (name) en.name = name;
  if (desc) { en.short = desc.slice(0, 80); en.description = desc; }
  en.details = ['Product added from the shop panel'];
  if (pz) en.personalization = { label: 'Name or phrase', placeholder: 'E.g.: your name' };
  return en;
}

function productsAdmin() {
  return {
    html: shell('painel-produtos', '<div id="pp"></div>'),
    mount(root) {
      bindShell(root);
      const box = root.querySelector('#pp');
      const render = () => safe(box, async () => {
        const list = await api.admin.products();
        box.innerHTML = `<div class="admin-head"><div><p class="eyebrow">Produtos e estoque</p><h1 class="h2">Catálogo</h1></div></div>
          <p class="fine">Altere preço, estoque, mínimo de alerta, tipo de venda e se o produto aparece na loja. As mudanças valem na hora.</p>
          <div class="table-wrap"><table class="table table-edit">
            <thead><tr><th>Produto</th><th>Tipo</th><th class="num">Preço</th><th class="num">Estoque</th><th class="num">Alerta</th><th>Na loja</th></tr></thead>
            <tbody>${list.map((p) => {
              const sellable = !['gratis', 'orcamento'].includes(p.mode);
              const low = p.active && p.mode === 'pronta' && p.stock <= p.lowStock;
              return `<tr data-id="${p.id}" data-testid="admin-product">
                <td class="prod-cell"><span class="ri-media">${productMedia(p)}</span><span><a href="#p-${p.id}">${esc(p.name)}</a><small class="block">${esc(S.categoryName(p.category))} · ${esc(S.collectionName(p.collection))}</small></span></td>
                <td>${sellable ? `<select data-f="mode" aria-label="Tipo de venda de ${esc(p.name)}"><option value="pronta" ${p.mode === 'pronta' ? 'selected' : ''}>Pronta entrega</option><option value="encomenda" ${p.mode === 'encomenda' ? 'selected' : ''}>Sob encomenda</option></select>` : (p.mode === 'gratis' ? 'Freebie' : 'Orçamento')}</td>
                <td class="num">${sellable ? `<input data-f="price" type="number" step="0.1" min="0" value="${p.price}" aria-label="Preço de ${esc(p.name)}">` : '—'}</td>
                <td class="num">${p.mode === 'pronta' ? `<input data-f="stock" type="number" min="0" value="${p.stock}" class="${low ? 'stock-low' : ''}" aria-label="Estoque de ${esc(p.name)}">` : '<span class="muted">não usa</span>'}</td>
                <td class="num">${p.mode === 'pronta' ? `<input data-f="lowStock" type="number" min="0" value="${p.lowStock}" aria-label="Alerta de estoque de ${esc(p.name)}">` : '—'}</td>
                <td><label class="switch"><input type="checkbox" data-f="active" ${p.active ? 'checked' : ''} aria-label="Mostrar ${esc(p.name)} na loja"><span></span></label></td>
              </tr>`;
            }).join('')}</tbody></table></div>
          <details class="panel add-product"><summary class="h3">Cadastrar produto</summary>
            <form id="np" class="row2">
              <label class="field field-wide" for="np-name"><span>Nome</span><input id="np-name" required></label>
              <label class="field" for="np-cat"><span>Categoria</span><select id="np-cat">${S.CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
              <label class="field" for="np-coll"><span>Coleção</span><select id="np-coll">${S.COLLECTIONS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
              <label class="field" for="np-price"><span>Preço (R$)</span><input id="np-price" type="number" step="0.1" min="0" required></label>
              <label class="field" for="np-mode"><span>Tipo</span><select id="np-mode"><option value="pronta">Pronta entrega</option><option value="encomenda">Sob encomenda</option></select></label>
              <label class="field" for="np-stock"><span>Estoque inicial</span><input id="np-stock" type="number" min="0" value="10"></label>
              <label class="field" for="np-days"><span>Prazo de produção (dias úteis)</span><input id="np-days" type="number" min="1" value="3"></label>
              <label class="field field-wide" for="np-desc"><span>Descrição</span><textarea id="np-desc" rows="3"></textarea></label>
              <label class="field field-wide" for="np-name-en"><span>Nome em inglês <small>(opcional; vazio mostra o português)</small></span><input id="np-name-en" lang="en"></label>
              <label class="field field-wide" for="np-desc-en"><span>Descrição em inglês <small>(opcional)</small></span><textarea id="np-desc-en" rows="3" lang="en"></textarea></label>
              <label class="check field-wide"><input type="checkbox" id="np-pz"> Aceita personalização com nome ou frase</label>
              <p class="fine field-wide">Na versão definitiva, este formulário também recebe fotos, variações e medidas.</p>
              <button class="btn btn-primary" type="submit">Cadastrar</button>
            </form></details>`;
        box.querySelectorAll('tr[data-id]').forEach((tr) => {
          tr.querySelectorAll('[data-f]').forEach((el) => {
            el.onchange = async () => {
              const f = el.dataset.f;
              const v = f === 'active' ? el.checked : f === 'mode' ? el.value : Math.max(0, Number(el.value) || 0);
              el.disabled = true;
              try { await api.admin.updateProduct(tr.dataset.id, { [f]: v }); toast('Produto atualizado'); } catch (e) { toast(e.message); }
              render();
            };
          });
        });
        box.querySelector('#np').onsubmit = async (e) => {
          e.preventDefault();
          const $ = (s) => box.querySelector(s);
          if (!$('#np-name').value.trim() || $('#np-price').value === '') { toast('Preencha nome e preço'); return; }
          const name = $('#np-name').value.trim();
          const btn = box.querySelector('#np button[type="submit"]');
          btn.disabled = true;
          try { await api.admin.createProduct({
            id: 'novo-' + Date.now().toString(36), name, category: $('#np-cat').value, collection: $('#np-coll').value,
            price: Number($('#np-price').value), mode: $('#np-mode').value, stock: Number($('#np-stock').value) || 0, lowStock: 3,
            productionDays: Number($('#np-days').value) || 3, short: $('#np-desc').value.trim().slice(0, 80) || 'Novidade da Fan Joy Store.',
            description: $('#np-desc').value.trim() || 'Novidade da Fan Joy Store.', details: ['Produto cadastrado pelo painel'], variations: [],
            art: { kind: 'default', bg: 'cream' },
            personalization: $('#np-pz').checked ? { label: 'Nome ou frase', max: 20, placeholder: 'Ex.: seu nome' } : null,
            en: englishTexts($('#np-name-en').value.trim(), $('#np-desc-en').value.trim(), $('#np-pz').checked),
          }); } catch (ex) { toast(ex.message); btn.disabled = false; return; }
          toast(`${name} cadastrado e já aparece na loja`);
          render();
        };
      });
      return render();
    },
  };
}

function requestsAdmin() {
  return {
    html: shell('painel-solicitacoes', '<div id="pr"></div>'),
    mount(root) {
      bindShell(root);
      const box = root.querySelector('#pr');
      const render = () => safe(box, async () => {
        const list = await api.admin.requests();
        box.innerHTML = `<div class="admin-head"><div><p class="eyebrow">Encomendas e orçamentos</p><h1 class="h2">Solicitações recebidas</h1></div></div>
          <div class="req-list">${list.map((r) => `<article class="panel req-card">
            <header><span class="kchip ${r.type === 'orcamento' ? 'k-encomenda' : 'k-novo'}">${r.type === 'orcamento' ? 'Brinde corporativo' : 'Encomenda personalizada'}</span><strong>${r.id}</strong><span class="fine">${fmtDateTime(r.createdAt)}</span></header>
            <h2 class="h3">${esc(r.name)}${r.company ? ` · ${esc(r.company)}` : ''}</h2>
            <p>${esc(r.product)} · ${r.qty} ${r.qty === 1 ? 'unidade' : 'unidades'}${r.date ? ` · para ${new Date(r.date + 'T12:00').toLocaleDateString('pt-BR')}` : ''}</p>
            <p class="muted">${esc(r.message)}</p>
            ${r.files?.length ? `<p class="fine">Referências: ${r.files.map(esc).join(', ')}</p>` : ''}
            <label class="field"><span>Situação</span><select data-id="${r.id}">${[['novo', 'Nova'], ['respondido', 'Proposta enviada'], ['aprovado', 'Aprovada'], ['recusado', 'Não seguiu']].map(([v, l]) => `<option value="${v}" ${r.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          </article>`).join('')}</div>`;
        box.querySelectorAll('select[data-id]').forEach((sel) => {
          sel.onchange = async () => {
            try { await api.admin.setRequestStatus(sel.dataset.id, sel.value); toast('Situação atualizada'); } catch (e) { toast(e.message); }
            render();
          };
        });
      });
      return render();
    },
  };
}

function toCSV(a) {
  const head = ['Produto', 'Categoria', 'Coleção', 'Situação', 'Tipo', 'Quantidade vendida', 'Receita (R$)', 'Vendas por semana', 'Estoque', 'Dias no catálogo'];
  const rows = a.rows.map((r) => [r.p.name, S.categoryName(r.p.category), S.collectionName(r.p.collection), KIND[r.kind].label,
    r.p.mode === 'encomenda' ? 'Sob encomenda' : 'Pronta entrega', r.qty, r.revenue.toFixed(2).replace('.', ','), String(r.perWeek).replace('.', ','),
    r.p.mode === 'pronta' ? r.p.stock : '', r.ageDays]);
  return [head, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
}

const reportSort = { key: 'qty', dir: -1 };
function reports() {
  return {
    html: shell('painel-relatorios', '<div id="rp"></div>'),
    mount(root) {
      bindShell(root);
      const box = root.querySelector('#rp');
      const render = () => safe(box, async () => {
        const a = await api.admin.dashboard(period);
        const rows = [...a.rows].sort((x, y) => {
          const v = (r) => (reportSort.key === 'name' ? r.p.name : reportSort.key === 'stock' ? (r.p.mode === 'pronta' ? r.p.stock : -1) : r[reportSort.key]);
          return (v(x) > v(y) ? 1 : v(x) < v(y) ? -1 : 0) * reportSort.dir;
        });
        const maxQty = Math.max(1, ...rows.map((r) => r.qty));
        const th = (key, label, num) => `<th class="${num ? 'num' : ''}"><button type="button" class="sort-btn" data-k="${key}">${label}${reportSort.key === key ? (reportSort.dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`;
        box.innerHTML = `<div class="admin-head"><div><p class="eyebrow">Relatórios</p><h1 class="h2">Vendas e receita por produto</h1></div>${periodBar()}</div>
          <div class="export">
            <button class="btn btn-primary btn-small" id="dl" type="button">Baixar CSV</button>
            <button class="btn btn-ghost btn-small" id="cp" type="button">Copiar para planilha</button>
            <span class="fine">O CSV abre no Excel e no Google Planilhas. Se o download estiver bloqueado no seu navegador, use “Copiar”.</span>
          </div>
          <div class="table-wrap"><table class="table" data-testid="report">
            <thead><tr>${th('name', 'Produto')}<th>Situação</th>${th('qty', 'Vendidos', true)}${th('revenue', 'Receita', true)}${th('perWeek', 'Por semana', true)}${th('stock', 'Estoque', true)}</tr></thead>
            <tbody>${rows.map((r) => `<tr>
              <td>${esc(r.p.name)}<small class="block">${esc(S.collectionName(r.p.collection))}</small></td>
              <td>${kindChip(r.kind)}</td>
              <td class="num"><span class="qbar" style="--w:${(r.qty / maxQty) * 100}%"></span>${r.qty}</td>
              <td class="num">${brl(r.revenue)}</td>
              <td class="num">${r.perWeek.toLocaleString('pt-BR')}${r.kind === 'novo' ? '<small class="block">em ' + r.daysListed + ' dias</small>' : ''}</td>
              <td class="num">${r.p.mode === 'pronta' ? `<span class="${r.p.active && r.p.stock <= r.p.lowStock ? 'stock-low' : ''}">${r.p.stock}</span>` : '<span class="muted">—</span>'}</td>
            </tr>`).join('')}</tbody>
            <tfoot><tr><td colspan="2">Total no período</td><td class="num">${a.items}</td><td class="num">${brl(a.revenue)}</td><td colspan="2"></td></tr></tfoot>
          </table></div>
          <div class="panel"><h2 class="h3">Como ler a situação</h2>
            <ul class="kinds-help">
              <li>${kindChip('regular')} Produto à venda há mais de 30 dias. É o único grupo comparado em “menos vendidos”.</li>
              <li>${kindChip('novo')} Entrou há menos de 30 dias. “Por semana” considera só os dias em que ele existia.</li>
              <li>${kindChip('encomenda')} Produzido após o pedido. Não tem estoque, então estoque zerado não é problema.</li>
              <li>${kindChip('indisponivel')} Fora da loja ou esgotado. Poucas vendas aqui refletem falta de produto, não falta de procura.</li>
            </ul></div>
          <textarea id="csv-out" class="csv-out" readonly hidden aria-label="Relatório em CSV"></textarea>`;
        bindPeriod(box, render);
        box.querySelectorAll('.sort-btn').forEach((b) => { b.onclick = () => { if (reportSort.key === b.dataset.k) reportSort.dir *= -1; else { reportSort.key = b.dataset.k; reportSort.dir = b.dataset.k === 'name' ? 1 : -1; } render(); }; });
        const csv = toCSV(a);
        box.querySelector('#dl').onclick = () => {
          const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url; link.download = `fan-joy-relatorio-${period.days}d.csv`;
          document.body.appendChild(link); link.click(); link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          toast('Relatório gerado');
        };
        box.querySelector('#cp').onclick = () => {
          const out = box.querySelector('#csv-out');
          out.value = csv;
          navigator.clipboard?.writeText(csv.replace(/;/g, '\t').replace(/"/g, '')).then(() => toast('Relatório copiado. Cole na planilha.'), () => { out.hidden = false; out.select(); toast('Selecione o texto abaixo e copie'); });
        };
      });
      return render();
    },
  };
}

function optionalSystem() {
  const modules = [
    ['Financeiro', 'Entradas, despesas, contas a pagar e a receber e fluxo de caixa, com as vendas da loja entrando sozinhas.'],
    ['Custos e margem', 'Custo de cada produto (material, impressão, embalagem e taxas) e margem estimada por venda.'],
    ['Produção', 'Materiais, fornecedores e etapas de produção de cada pedido sob encomenda.'],
    ['Notas fiscais', 'Integração com emissor de notas fiscais. A configuração depende da validação do contador.'],
    ['Relatórios e acessos', 'Relatórios de gestão e perfis de acesso para quem ajudar no dia a dia.'],
  ];
  return {
    html: shell('sistema-opcional', `
      <div class="admin-head"><div><p class="eyebrow">Proposta separada · opcional</p><h1 class="h2">Sistema de gestão integrado</h1></div></div>
      <div class="panel panel-note">
        <p><strong>A loja funciona completa sem este sistema.</strong> Ele é uma contratação à parte, com escopo, custos e contrato próprios. A Lilian pode decidir depois da abertura da loja, ou não contratar.</p>
      </div>
      <div class="compare">
        <div class="panel"><p class="eyebrow">Incluído na loja</p><h2 class="h3">Gestão básica</h2>
          <ul class="checks"><li>Catálogo, preços e estoque</li><li>Pedidos e atualização de status</li><li>Mais e menos vendidos, estoque parado e alertas</li><li>Filtros por período, categoria e coleção</li><li>Exportação de relatórios</li><li>Encomendas e orçamentos</li></ul></div>
        <div class="panel panel-optional"><p class="eyebrow">Opcional</p><h2 class="h3">Sistema personalizado</h2>
          <ul class="checks">${modules.map(([t]) => `<li>${t}</li>`).join('')}</ul></div>
      </div>
      <div class="modules">${modules.map(([t, d], i) => `<article class="panel module"><span class="module-n">Módulo ${i + 1}</span><h3 class="h3">${t}</h3><p>${d}</p><p class="fine">Investimento: definido em proposta própria.</p></article>`).join('')}</div>
      <div class="panel"><h2 class="h3">Como seria a contratação</h2>
        <ol class="steps"><li>Conversa sobre a rotina financeira e de produção da Lilian</li><li>Proposta separada da VB Studio, com módulos, valores e prazos</li><li>Validação da parte fiscal com o contador</li><li>Implantação por etapas, conectada aos pedidos e ao estoque da loja</li></ol>
        <p class="fine">Nenhum valor deste sistema está incluído no orçamento da loja.</p></div>`),
    mount(root) { bindShell(root); },
  };
}

const VIEWS = { painel: overview, 'painel-pedidos': ordersAdmin, 'painel-produtos': productsAdmin, 'painel-solicitacoes': requestsAdmin, 'painel-relatorios': reports, 'sistema-opcional': optionalSystem };

// Toda página do painel passa por aqui: confere a sessão, mostra o login se precisar e carrega os contadores do menu.
export function adminRoute(route) {
  if (!VIEWS[route]) return null;
  return {
    html: `<section class="section page-top"><div class="wrap">${loading}</div></section>`,
    async mount(root) {
      const show = async () => {
        let prof = null;
        try { prof = await api.admin.session(); } catch { prof = null; }
        if (location.hash.slice(1) !== route && !(route === 'painel' && !location.hash)) return;
        if (!prof) { const l = login(show); root.innerHTML = l.html; l.mount(root); return; }
        // Na primeira abertura espera os contadores do menu; nas trocas de aba usa os últimos
        // e atualiza em segundo plano, para a aba não esperar duas consultas seguidas.
        if (!countsLoaded) { try { await refreshCounts(); countsLoaded = true; } catch { /* o menu fica sem contadores */ } }
        else refreshCounts().then(() => updateNavCounts(root)).catch(() => {});
        const v = VIEWS[route]();
        root.innerHTML = v.html;
        await v.mount(root);
      };
      await show();
    },
  };
}

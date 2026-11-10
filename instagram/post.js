// Base de posts do Instagram da Fan Joy Store.
// Preenche o post com um produto do catálogo da loja, deixa ajustar os textos e baixa a imagem 1080 × 1350.
import { PRODUCTS, COLLECTIONS } from '../js/data.js';

const $ = (id) => document.getElementById(id);
const NEW = '__novo__';
const DEFAULTS = { pix: 5, installments: 'ou em até 3× no cartão', cta: 'Compre pelo link na bio' };
const CONCEPT_NOTE = 'Arte original da Lilian · coleção conceitual, sem vínculo oficial com os artistas, a produtora ou o evento.';

const sellable = PRODUCTS.filter((p) => p.mode === 'pronta' || p.mode === 'encomenda');
const collectionOf = (p) => COLLECTIONS.find((c) => c.id === p.collection);
// Linhas de aviso ficam no rodapé, não na lista de detalhes.
const isNote = (d) => /^Arte (original|demonstrativa)/i.test(d);

let photo = null; // { src, fit }

function fromProduct(p) {
  if (!p) {
    return { badge: 'Novidade', eyebrow: '', name: 'Nome do produto', short: 'Uma frase curta que conte por que a pessoa vai amar.',
      details: ['Material e tamanho', 'Personalização, se tiver'], price: '', from: false, pix: DEFAULTS.pix,
      installments: DEFAULTS.installments, cta: DEFAULTS.cta, note: '', photo: null };
  }
  const coll = collectionOf(p);
  const img = p.images?.[0];
  return {
    badge: p.mode === 'encomenda' ? 'Sob encomenda' : 'Pronta entrega',
    eyebrow: coll?.name || '',
    name: p.name,
    short: p.short,
    details: p.details.filter((d) => !isNote(d)).slice(0, 3),
    price: p.price,
    from: (p.variations || []).some((v) => v.options.some((o) => o.add > 0)),
    pix: DEFAULTS.pix,
    installments: DEFAULTS.installments,
    cta: DEFAULTS.cta,
    note: coll?.concept ? CONCEPT_NOTE : '',
    photo: img ? { src: `../${img.src}`, fit: img.fit === 'contain' ? 'contain' : 'cover' } : null,
  };
}

function fillForm(d) {
  $('f-badge').value = d.badge;
  $('f-eyebrow').value = d.eyebrow;
  $('f-name').value = d.name;
  $('f-short').value = d.short;
  $('f-details').value = d.details.join('\n');
  $('f-price').value = d.price === '' ? '' : Number(d.price).toFixed(2);
  $('f-pix').value = d.pix;
  $('f-from').checked = d.from;
  $('f-installments').value = d.installments;
  $('f-cta').value = d.cta;
  $('f-note').value = d.note;
  $('f-photo').value = '';
  photo = d.photo;
  $('f-fit').value = photo?.fit || 'cover';
}

const brl = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const setText = (id, text) => { const el = $(id); el.textContent = text; el.hidden = !text; };

function render() {
  setText('p-badge', $('f-badge').value.trim());
  setText('p-eyebrow', $('f-eyebrow').value.trim());
  setText('p-name', $('f-name').value.trim());
  setText('p-short', $('f-short').value.trim());

  const details = $('f-details').value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  $('p-details').replaceChildren(...details.map((d) => Object.assign(document.createElement('li'), { textContent: d })));
  $('p-details').hidden = !details.length;

  // Preço sempre visível quando informado; o desconto do Pix segue a mesma conta do checkout da loja.
  const price = parseFloat($('f-price').value);
  const hasPrice = Number.isFinite(price) && price > 0;
  document.querySelector('.p-price').hidden = !hasPrice;
  if (hasPrice) {
    $('p-from').hidden = !$('f-from').checked;
    $('p-value').innerHTML = `<small>R$</small>${brl(price)}`;
    const pct = Math.min(50, Math.max(0, parseFloat($('f-pix').value) || 0));
    const pix = price - Math.round(price * pct) / 100;
    setText('p-pix', pct > 0 ? `R$ ${brl(pix)} no Pix` : '');
    setText('p-installments', $('f-installments').value.trim());
  }

  setText('p-cta', $('f-cta').value.trim());
  setText('p-note', $('f-note').value.trim());

  const box = $('p-photo');
  box.classList.toggle('is-contain', $('f-fit').value === 'contain');
  if (photo?.src) {
    let img = box.querySelector('img');
    if (!img) { box.replaceChildren(img = document.createElement('img')); img.alt = ''; }
    if (img.getAttribute('src') !== photo.src) img.src = photo.src;
  } else {
    box.replaceChildren(Object.assign(document.createElement('div'), { className: 'frame-empty', textContent: 'Envie a foto do produto' }));
  }
  fitText();
}

// Nomes e listas longas encolhem um pouco para tudo caber ao lado da foto.
function fitText() {
  const body = document.querySelector('.p-body');
  const info = $('p-info');
  const name = $('p-name');
  const items = [...$('p-details').children];
  name.style.fontSize = '';
  items.forEach((li) => { li.style.fontSize = ''; li.hidden = false; });
  $('p-short').style.fontSize = '';
  const over = () => info.scrollHeight > body.clientHeight - 8;
  for (let s = 60; over() && s > 42; s -= 3) name.style.fontSize = `${s - 3}px`;
  for (let s = 23; over() && s > 19; s -= 1) items.forEach((li) => { li.style.fontSize = `${s - 1}px`; });
  if (over()) $('p-short').style.fontSize = '24px';
  for (let i = items.length - 1; over() && i > 0; i -= 1) items[i].hidden = true;
}

// Prévia reduzida para caber na tela; a imagem baixada usa o tamanho real.
function scalePreview() {
  const stage = $('stage');
  $('post').style.transform = `scale(${stage.clientWidth / 1080})`;
}

function slug(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'post';
}

async function download(e) {
  e.preventDefault();
  const btn = $('download');
  btn.disabled = true;
  $('status').textContent = 'Gerando a imagem…';
  try {
    await document.fonts.ready;
    const img = $('p-photo').querySelector('img');
    if (img && !img.complete) await img.decode().catch(() => {});
    const url = await window.htmlToImage.toPng($('post'), {
      width: 1080, height: 1350, pixelRatio: 1, backgroundColor: '#FFFFFF',
      style: { transform: 'none', position: 'static' },
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `fanjoy-${slug($('f-name').value)}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    $('status').textContent = 'Imagem baixada. Confira a pasta de downloads.';
  } catch (err) {
    console.error(err);
    $('status').textContent = 'Não foi possível gerar a imagem. Recarregue a página e tente de novo.';
  } finally {
    btn.disabled = false;
  }
}

function selectProduct() {
  const id = $('f-product').value;
  fillForm(fromProduct(id === NEW ? null : sellable.find((p) => p.id === id)));
  render();
}

// ---------- Início ----------
$('f-product').innerHTML = sellable.map((p) => `<option value="${p.id}">${p.name.replace(/</g, '&lt;')}</option>`).join('')
  + `<option value="${NEW}">+ Produto novo (preencher do zero)</option>`;
const initial = new URLSearchParams(location.search).get('produto');
if (initial && sellable.some((p) => p.id === initial)) $('f-product').value = initial;

$('f-product').addEventListener('change', selectProduct);
$('form').addEventListener('input', (e) => { if (e.target.id !== 'f-product' && e.target.id !== 'f-photo') render(); });
$('f-fit').addEventListener('change', () => { if (photo) photo.fit = $('f-fit').value; render(); });
$('f-photo').addEventListener('change', () => {
  const file = $('f-photo').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { photo = { src: reader.result, fit: $('f-fit').value }; render(); };
  reader.readAsDataURL(file);
});
$('reset').addEventListener('click', selectProduct);
$('form').addEventListener('submit', download);
new ResizeObserver(scalePreview).observe($('stage'));
document.fonts.ready.then(render);
selectProduct();

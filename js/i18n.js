// Idioma da loja: português (padrão) ou inglês.
// Escolha guardada no navegador; na primeira visita, inglês para quem usa o navegador em outro idioma,
// ou para quem chega por um link com ?lang=en. O painel de gestão fica sempre em português.
const KEY = 'fjs:v1:lang';
const LANGS = ['pt', 'en'];

function initial() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) { localStorage.setItem(KEY, q); return q; }
    const saved = localStorage.getItem(KEY);
    if (LANGS.includes(saved)) return saved;
  } catch { /* sem armazenamento: decide pelo navegador */ }
  const nav = (navigator.languages?.[0] || navigator.language || 'pt').toLowerCase();
  return nav.startsWith('pt') ? 'pt' : 'en';
}

let chosen = initial();
let forced = null; // o painel força português sem mudar a escolha da cliente

export const lang = () => forced || chosen;
export const isEn = () => lang() === 'en';
export const chosenLang = () => chosen;
// Texto inline nos dois idiomas: tr('Sacola', 'Bag').
export const tr = (pt, en) => (isEn() ? en : pt);
export const locale = () => (isEn() ? 'en-US' : 'pt-BR');

export function forceLang(l) { forced = l; syncDocument(); }
export function setLang(l) {
  if (!LANGS.includes(l) || l === chosen) return;
  chosen = l;
  try { localStorage.setItem(KEY, l); } catch { /* segue só nesta visita */ }
  syncDocument();
  window.dispatchEvent(new CustomEvent('langchange', { detail: l }));
}
function syncDocument() { document.documentElement.lang = isEn() ? 'en' : 'pt-BR'; }
syncDocument();

// Campo traduzido de um item do catálogo: usa obj.en[field] em inglês, e o português se faltar.
export function loc(obj, field) {
  if (!obj) return '';
  return (isEn() && obj.en && obj.en[field] != null && obj.en[field] !== '') ? obj.en[field] : obj[field];
}

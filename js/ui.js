// Utilitários de interface e as ilustrações demonstrativas (SVG) dos produtos sem arte definitiva.

import { tr, locale } from './i18n.js';

// Preços sempre em reais; em inglês aparecem no formato "R$50.00".
export const brl = (v) => (v ?? 0).toLocaleString(locale(), { style: 'currency', currency: 'BRL' });
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDate = (t) => new Date(t).toLocaleDateString(locale(), { day: '2-digit', month: 'short' });
export const fmtDateTime = (t) => new Date(t).toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function priceLabel(p) {
  if (p.mode === 'gratis') return tr('Grátis', 'Free');
  if (p.mode === 'orcamento' || p.price == null) return tr('Sob orçamento', 'Quote on request');
  const from = (p.variations || []).some((v) => v.options.some((o) => o.add > 0));
  return (from ? tr('a partir de ', 'from ') : '') + brl(p.price);
}

const TONES = {
  red: { bg: '#F7D9DB', ink: '#C81E32', obj: '#FFFFFF' },
  cream: { bg: '#F6EEDD', ink: '#16224F', obj: '#FFFFFF' },
  lilac: { bg: '#E4E1F3', ink: '#16224F', obj: '#FFFFFF' },
  yellow: { bg: '#FBEBB5', ink: '#16224F', obj: '#FFFFFF' },
  navy: { bg: '#16224F', ink: '#F6C343', obj: '#22316A' },
};

// Florzinha da marca, desenhada em SVG para os modelos demonstrativos.
function flower(cx, cy, r) {
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return `<ellipse cx="${cx + Math.cos(a) * r * 0.62}" cy="${cy + Math.sin(a) * r * 0.62}" rx="${r * 0.42}" ry="${r * 0.3}" transform="rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * r * 0.62} ${cy + Math.sin(a) * r * 0.62})" fill="#E3263A"/>`;
  }).join('');
  return `${petals}<circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="#F6C343"/>
    <circle cx="${cx - r * 0.13}" cy="${cy - r * 0.05}" r="${r * 0.05}" fill="#16224F"/><circle cx="${cx + r * 0.13}" cy="${cy - r * 0.05}" r="${r * 0.05}" fill="#16224F"/>
    <path d="M${cx - r * 0.12} ${cy + r * 0.1} Q${cx} ${cy + r * 0.24} ${cx + r * 0.12} ${cy + r * 0.1}" stroke="#16224F" stroke-width="${r * 0.05}" fill="none" stroke-linecap="round"/>`;
}

function label(text, x, y, size, color, anchor = 'middle') {
  return text.split('\n').map((line, i) =>
    `<text x="${x}" y="${y + i * size * 1.05}" font-family="Gloock, Georgia, serif" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(line)}</text>`).join('');
}

export function artSVG(art, title) {
  const t = TONES[art.bg] || TONES.cream;
  const ink = art.bg === 'navy' ? '#16224F' : t.ink;
  let body = '';
  switch (art.kind) {
    case 'mug':
      body = `<ellipse cx="200" cy="318" rx="110" ry="14" fill="#000" opacity=".08"/>
        <path d="M270 150 q70 0 70 60 t-70 60" stroke="${t.obj}" stroke-width="22" fill="none"/>
        <rect x="100" y="110" width="180" height="205" rx="16" fill="${t.obj}"/>
        <ellipse cx="190" cy="112" rx="90" ry="12" fill="#ECE7DC"/>
        ${flower(190, 170, 34)}${label(art.text, 190, 245, 28, ink)}`;
      break;
    case 'tee':
      body = `<path d="M130 90 L90 110 L55 170 L100 192 L118 160 L118 330 L282 330 L282 160 L300 192 L345 170 L310 110 L270 90 Q250 120 200 120 Q150 120 130 90Z" fill="${t.obj}" stroke="#E8E1D2" stroke-width="2"/>
        ${flower(200, 190, 42)}${label(art.text, 200, 275, 26, ink)}`;
      break;
    case 'notebook':
      body = `<rect x="112" y="70" width="190" height="260" rx="10" fill="${art.bg === 'cream' ? '#16224F' : '#FFFFFF'}"/>
        <rect x="112" y="70" width="22" height="260" fill="#000" opacity=".12"/>
        ${flower(215, 145, 32)}${label(art.text, 215, 230, 30, art.bg === 'cream' ? '#FFFFFF' : '#16224F')}`;
      break;
    case 'bookmarks':
      body = [0, 1, 2, 3].map((i) => `<rect x="${92 + i * 58}" y="${80 + (i % 2) * 18}" width="46" height="220" rx="6" fill="${['#16224F', '#E3263A', '#FFFFFF', '#F6C343'][i]}"/>
        <circle cx="${115 + i * 58}" cy="${100 + (i % 2) * 18}" r="5" fill="${i === 2 ? '#16224F' : '#FFFFFF'}"/>`).join('')
        + `<rect x="80" y="318" width="240" height="40" rx="20" fill="#FFFFFF"/>${label(art.text, 200, 346, 22, '#16224F')}`;
      break;
    case 'holder':
      body = `<path d="M200 40 v40" stroke="#C9A34A" stroke-width="4" stroke-dasharray="6 4"/>
        <rect x="128" y="80" width="144" height="220" rx="14" fill="#FFFFFF" opacity=".85" stroke="#FFFFFF" stroke-width="6"/>
        <rect x="142" y="96" width="116" height="170" rx="8" fill="#16224F"/>
        ${flower(200, 150, 30)}${label(art.text, 200, 215, 22, '#FFFFFF')}`;
      break;
    case 'cards':
      body = [-12, 0, 12].map((r, i) => `<g transform="rotate(${r} 200 210)"><rect x="140" y="90" width="120" height="180" rx="10" fill="${['#FFFFFF', '#16224F', '#FFFFFF'][i]}" stroke="#16224F" stroke-width="2"/></g>`).join('')
        + `${flower(200, 155, 28)}${label(art.text, 200, 222, 20, '#FFFFFF')}`;
      break;
    case 'keychain':
      body = `<circle cx="200" cy="70" r="20" fill="none" stroke="#9AA0B5" stroke-width="6"/>
        <path d="M200 90 v30" stroke="#9AA0B5" stroke-width="5"/>
        <path d="M200 300 C 90 230 80 140 140 120 C 175 110 195 130 200 150 C 205 130 225 110 260 120 C 320 140 310 230 200 300Z" fill="#E3263A" stroke="#FFFFFF" stroke-width="8"/>
        ${label(art.text, 200, 195, 30, '#FFFFFF')}`;
      break;
    case 'box':
      body = `<rect x="95" y="160" width="210" height="160" rx="8" fill="${art.bg === 'navy' ? '#FFFFFF' : '#16224F'}"/>
        <rect x="85" y="130" width="230" height="44" rx="6" fill="#E3263A"/>
        <rect x="188" y="130" width="24" height="190" fill="#F6C343"/>
        <path d="M200 130 C 160 80 130 110 170 128 M200 130 C 240 80 270 110 230 128" stroke="#F6C343" stroke-width="12" fill="none" stroke-linecap="round"/>
        ${label(art.text, 140, 240, 24, '#16224F')}`;
      break;
    case 'bag':
      body = `<path d="M150 120 q0 -60 50 -60 q50 0 50 60" stroke="#D9C9A6" stroke-width="12" fill="none"/>
        <rect x="105" y="115" width="190" height="215" rx="6" fill="#F3E9D2"/>
        ${flower(200, 190, 38)}${label(art.text, 200, 270, 24, '#16224F')}`;
      break;
    case 'phone':
      body = `<rect x="135" y="40" width="130" height="270" rx="22" fill="#16224F"/>
        <rect x="143" y="52" width="114" height="246" rx="16" fill="#F7D9DB"/>
        ${flower(200, 150, 36)}${label(art.text, 200, 235, 22, '#16224F')}`;
      break;
    default:
      body = flower(200, 200, 60);
  }
  const bg = art.bg === 'navy' ? '#E7E9F2' : t.bg;
  return `<svg viewBox="0 0 400 400" role="img" aria-label="${esc(title)}: ${tr('modelo demonstrativo', 'sample illustration')}" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="${bg}"/>${body}</svg>`;
}

export function productMedia(p, { large = false, index = 0 } = {}) {
  const img = p.images?.[index];
  if (img) {
    return `<img src="${img.src}" alt="${esc(img.alt)}" class="media-img ${img.fit === 'contain' ? 'is-contain' : ''}" loading="${large ? 'eager' : 'lazy'}" decoding="async" width="800" height="800">`;
  }
  if (p.art) return artSVG(p.art, p.name);
  return artSVG({ kind: 'default', bg: 'cream' }, p.name);
}

export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 2600);
}

export const icon = {
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};

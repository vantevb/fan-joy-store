// Gera supabase/seed.sql a partir do catálogo de js/data.js.
// Uso: node tools/gerar-seed.mjs
// Peso e medidas são ESTIMATIVAS por categoria; a Lilian deve informar os valores reais da embalagem.
import { writeFileSync } from 'node:fs';
import { CATEGORIES, COLLECTIONS, PRODUCTS } from '../js/data.js';

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => (v === null || v === undefined ? 'null' : `${q(JSON.stringify(v))}::jsonb`);
const PACK = {
  canecas: [400, 12, 12, 10], camisetas: [200, 25, 20, 3], bottons: [50, 10, 10, 2], photocards: [50, 12, 8, 2],
  banners: [250, 70, 10, 10], papelaria: [250, 23, 17, 3], acessorios: [200, 30, 25, 3], presentes: [900, 25, 25, 15],
};

const out = ['-- Gerado por tools/gerar-seed.mjs. Não edite à mão.', 'begin;', ''];
out.push('insert into public.categories (id, name, position) values');
out.push(CATEGORIES.map((c, i) => `  (${q(c.id)}, ${q(c.name)}, ${i})`).join(',\n') + '\non conflict (id) do update set name = excluded.name, position = excluded.position;', '');
out.push('insert into public.collections (id, name, tagline, summary, concept, image, tone, position) values');
out.push(COLLECTIONS.map((c, i) => `  (${q(c.id)}, ${q(c.name)}, ${q(c.tagline)}, ${q(c.summary)}, ${!!c.concept}, ${q(c.image)}, ${q(c.tone)}, ${i})`).join(',\n')
  + '\non conflict (id) do update set name = excluded.name, tagline = excluded.tagline, summary = excluded.summary, concept = excluded.concept, image = excluded.image, tone = excluded.tone, position = excluded.position;', '');
out.push('insert into public.products (id, name, category_id, collection_id, price, mode, stock, low_stock, production_days, featured, active, short, description, details, images, art, variations, personalization, weight_g, length_cm, width_cm, height_cm, i18n) values');
out.push(PRODUCTS.map((p) => {
  const pack = PACK[p.category] || [null, null, null, null];
  return `  (${[q(p.id), q(p.name), q(p.category), q(p.collection), p.price ?? 'null', q(p.mode), p.stock, p.lowStock, p.productionDays,
    !!p.featured, p.active !== false, q(p.short), q(p.description), j(p.details || []), j(p.images || []), j(p.art || null),
    j(p.variations || []), j(p.personalization || null), ...pack.map((x) => x ?? 'null'), j(p.en ? { en: p.en } : {})].join(', ')})`;
}).join(',\n') + '\non conflict (id) do nothing;', '');
out.push('commit;', '');
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out.join('\n'));
console.log(`seed.sql: ${CATEGORIES.length} categorias, ${COLLECTIONS.length} coleções, ${PRODUCTS.length} produtos`);

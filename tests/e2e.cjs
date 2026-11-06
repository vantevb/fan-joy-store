// Testes de ponta a ponta dos fluxos de compra e de gestão.
// Uso: node tests/e2e.cjs [url]   (padrão: http://localhost:8080)
// Requer Playwright instalado (npm i -D playwright && npx playwright install chromium).
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:8080';
let failures = 0;
const results = [];
async function step(name, fn) {
  try { await fn(); results.push(`  ✓ ${name}`); } catch (e) { failures++; results.push(`  ✗ ${name}\n      ${e.message.split('\n')[0]}`); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE + '/#inicio');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  console.log('Loja');
  await step('página inicial mostra destaques e coleções', async () => {
    await page.waitForSelector('[data-testid="product-card"]');
    expect(await page.locator('[data-testid="product-card"]').count() >= 6, 'menos de 6 destaques');
    expect(await page.locator('.coll').count() === 5, 'esperava 5 coleções');
  });

  await step('catálogo filtra por categoria, busca e ordena', async () => {
    await page.goto(BASE + '/#loja');
    await page.selectOption('#f-cat', 'canecas');
    const names = await page.locator('.card-title').allTextContents();
    expect(names.length === 3 && names.every((n) => n.includes('Caneca')), `canecas: ${names}`);
    await page.selectOption('#f-cat', '');
    await page.fill('#f-q', 'gostoso');
    expect(await page.locator('[data-testid="product-card"]').count() >= 2, 'busca por gostoso');
    await page.fill('#f-q', '');
    await page.selectOption('#f-sort', 'menor');
    const first = await page.locator('.card-price').first().textContent();
    expect(/Grátis/.test(first), `menor preço deveria começar pelos grátis, veio ${first}`);
    await page.check('#f-av-enc');
    const enc = await page.locator('.card-title').allTextContents();
    expect(enc.length >= 2 && enc.some((n) => n.includes('photocards')), `encomenda: ${enc}`);
  });

  await step('página de produto: variação muda o preço e personalização respeita o limite', async () => {
    await page.goto(BASE + '/#p-caneca-ta-bom');
    await page.waitForSelector('#add');
    expect((await page.textContent('#price')).includes('42,90'), 'preço base');
    await page.locator('label.opt', { hasText: 'Mágica' }).click();
    expect((await page.textContent('#price')).includes('54,90'), 'preço com variação');
    await page.fill('#pz', 'Lilian com nome muito longo');
    expect((await page.inputValue('#pz')).length === 12, 'limite de 12 caracteres');
    await page.fill('#pz', 'Lilian');
    await page.click('#q-plus');
    await page.click('#add');
    await page.waitForSelector('#drawer:not([hidden])');
    expect((await page.textContent('[data-testid="bag-count"]')).trim() === '2', 'contador da sacola = 2');
  });

  await step('sacola: adicionar outro item, alterar quantidade e remover', async () => {
    await page.goto(BASE + '/#p-bottons-dupla');
    await page.click('#add');
    await page.goto(BASE + '/#sacola');
    await page.waitForSelector('#view [data-testid="cart-line"]');
    expect(await page.locator('#view [data-testid="cart-line"]').count() === 2, '2 linhas');
    const bottons = page.locator('#view [data-testid="cart-line"]', { hasText: 'bottons' });
    await bottons.locator('[data-act="inc"]').click();
    expect((await page.locator('#view [data-testid="cart-line"]', { hasText: 'bottons' }).locator('[data-testid="line-qty"]').textContent()) === '2', 'qtd bottons = 2');
    await page.locator('#view [data-testid="cart-line"]', { hasText: 'bottons' }).locator('[data-act="rm"]').click();
    expect(await page.locator('#view [data-testid="cart-line"]').count() === 1, 'removeu bottons');
    expect((await page.textContent('[data-testid="bag-total"]')).includes('109,80'), 'subtotal 2 × 54,90');
  });

  await step('frete por CEP e checkout com Pix', async () => {
    await page.fill('#cep', '01310100');
    await page.click('#cep-form button');
    await page.waitForSelector('input[name="ship"]');
    expect(await page.locator('input[name="ship"]').count() === 3, 'SP capital tem retirada, PAC e SEDEX');
    await page.check('input[name="ship"][value="pac"]');
    await page.click('#to-checkout');
    await page.waitForSelector('#co');
    await page.click('#place');
    expect(await page.isVisible('#co-error'), 'deveria pedir campos obrigatórios');
    await page.fill('#c-name', 'Cliente Teste');
    await page.fill('#c-email', 'teste@exemplo.com');
    await page.fill('#c-phone', '11999990000');
    await page.fill('#c-street', 'Av. Paulista');
    await page.fill('#c-num', '1000');
    await page.fill('#c-city', 'São Paulo, SP');
    await page.click('#place');
    await page.waitForSelector('.pix-box');
    expect(/#pedido-FJ\d{4}/.test(page.url()), 'foi para a página do pedido');
    expect((await page.textContent('[data-testid="bag-count"]')).trim() === '0', 'sacola esvaziada');
    await page.click('#sim-pay');
    await page.waitForSelector('.timeline li.is-now');
    expect((await page.textContent('.timeline li.is-now')).includes('Pagamento aprovado'), 'status pago');
  });

  let code = '';
  await step('acompanhamento do pedido por código e e-mail', async () => {
    code = page.url().split('#pedido-')[1];
    await page.goto(BASE + '/#pedidos');
    await page.fill('#lk-code', code);
    await page.fill('#lk-email', 'outro@exemplo.com');
    await page.click('#lookup button');
    expect(await page.isVisible('#lk-err'), 'e-mail errado deve falhar');
    await page.fill('#lk-email', 'teste@exemplo.com');
    await page.click('#lookup button');
    await page.waitForURL(`**/#pedido-${code}`);
  });

  await step('checkout com cartão valida número e aprova', async () => {
    await page.goto(BASE + '/#p-adesivos-boatoat');
    await page.click('#add');
    await page.goto(BASE + '/#sacola');
    await page.fill('#cep', '30130-000');
    await page.click('#cep-form button');
    await page.click('#to-checkout');
    await page.fill('#c-name', 'Cliente Cartão');
    await page.fill('#c-email', 'cartao@exemplo.com');
    await page.fill('#c-phone', '31999990000');
    await page.fill('#c-street', 'Rua A');
    await page.fill('#c-num', '1');
    await page.fill('#c-city', 'Belo Horizonte, MG');
    await page.check('input[name="pay"][value="cartao"]');
    await page.fill('#cc-num', '4111111111111112');
    await page.fill('#cc-name', 'CLIENTE');
    await page.fill('#cc-exp', '12/30');
    await page.fill('#cc-cvv', '123');
    await page.click('#place');
    expect((await page.textContent('#co-error')).includes('número do cartão'), 'cartão inválido recusado');
    await page.fill('#cc-num', '4111111111111111');
    await page.click('#place');
    await page.waitForSelector('.timeline');
    expect(!(await page.isVisible('.pix-box')), 'cartão não mostra Pix');
  });

  await step('pedido de orçamento corporativo exige 20 unidades', async () => {
    await page.goto(BASE + '/#brindes');
    await page.fill('#r-name', 'Paula');
    await page.fill('#r-company', 'Empresa Teste');
    await page.fill('#r-email', 'paula@empresa.com');
    await page.fill('#r-qty', '10');
    await page.fill('#r-msg', 'Kit de fim de ano');
    await page.check('#r-lgpd');
    await page.click('#req button[type="submit"]');
    expect((await page.textContent('#r-err')).includes('20 unidades'), 'mínimo de 20');
    await page.fill('#r-qty', '40');
    await page.click('#req button[type="submit"]');
    await page.waitForSelector('#req-ok:not([hidden])');
  });

  console.log('Gestão');
  await step('painel pede login e mostra indicadores', async () => {
    await page.goto(BASE + '/#painel');
    await page.click('#login button');
    await page.waitForSelector('.kpis');
    expect(await page.locator('.rank').count() >= 3, 'listas de ranking');
    const warn = await page.textContent('.panel-warn');
    expect(warn.includes('Caneca “Gostoso!”'), 'alerta de estoque baixo da caneca Gostoso');
    const stalled = await page.locator('.panel', { hasText: 'Com estoque, sem vendas' }).textContent();
    expect(stalled.includes('marcadores'), 'marcadores sem vendas');
    const bottom = await page.locator('.panel', { hasText: 'Menos vendidos' }).textContent();
    expect(!bottom.includes('Banner do Oat') && !bottom.includes('photocards'), 'novos e sob encomenda fora de menos vendidos');
  });

  await step('filtro por coleção altera os indicadores', async () => {
    const before = await page.textContent('.kpi strong');
    await page.selectOption('#pd-coll', 'boatoat');
    await page.selectOption('#pd-days', '90');
    const after = await page.textContent('.kpi strong');
    expect(before !== after, 'receita mudou com o filtro');
  });

  await step('atualizar status do pedido e cliente ver a mudança', async () => {
    await page.goto(BASE + '/#painel-pedidos');
    await page.selectOption(`#st-${code}`, 'enviado');
    await page.goto(BASE + `/#pedido-${code}`);
    expect((await page.textContent('.timeline li.is-now')).includes('Enviado'), 'cliente vê Enviado');
  });

  await step('editar estoque gera e remove alerta', async () => {
    await page.goto(BASE + '/#painel-produtos');
    const row = page.locator('tr[data-id="bottons-dupla"]');
    await row.locator('[data-f="stock"]').fill('2');
    await row.locator('[data-f="stock"]').dispatchEvent('change');
    await page.goto(BASE + '/#painel');
    expect((await page.textContent('.panel-warn')).includes('bottons'), 'bottons com alerta');
  });

  await step('desativar produto tira ele da loja', async () => {
    await page.goto(BASE + '/#painel-produtos');
    await page.locator('tr[data-id="banner-oat"] [data-f="active"]').uncheck();
    await page.goto(BASE + '/#colecao-boatoat');
    expect(!(await page.textContent('#view')).includes('Banner do Oat'), 'banner sumiu da coleção');
    await page.goto(BASE + '/#painel-produtos');
    await page.locator('tr[data-id="banner-oat"] [data-f="active"]').check();
  });

  await step('relatório mostra receita por produto e exporta CSV', async () => {
    await page.goto(BASE + '/#painel-relatorios');
    await page.waitForSelector('[data-testid="report"] tbody tr');
    await page.selectOption('#pd-coll', '');
    expect(await page.locator('[data-testid="report"] tbody tr').count() >= 10, 'linhas do relatório');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
    const path = await download.path();
    const csv = require('fs').readFileSync(path, 'utf8');
    expect(csv.includes('Quantidade vendida') && csv.includes('Caneca'), 'conteúdo do CSV');
  });

  await step('sem erros de JavaScript', async () => { expect(errors.length === 0, errors.join(' | ')); });

  console.log('Celular');
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await mobile.newPage();
  m.setDefaultTimeout(8000);
  for (const route of ['inicio', 'loja', 'p-caneca-gostoso', 'colecao-boatoat', 'sacola', 'brindes', 'painel']) {
    await step(`sem rolagem lateral em #${route}`, async () => {
      await m.goto(`${BASE}/#${route}`);
      await m.waitForTimeout(300);
      const [sw, iw] = await m.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      expect(sw <= iw, `scrollWidth ${sw} > ${iw}`);
    });
  }
  await step('menu do celular abre', async () => {
    await m.goto(`${BASE}/#inicio`);
    await m.click('#menu-btn');
    expect(await m.isVisible('#main-nav a[href="#loja"]'), 'menu visível');
  });

  await browser.close();
  console.log(results.join('\n'));
  console.log(failures ? `\n${failures} teste(s) falharam.` : '\nTodos os testes passaram.');
  process.exit(failures ? 1 : 0);
})();

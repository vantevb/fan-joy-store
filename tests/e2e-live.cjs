// Testes de ponta a ponta no modo LOJA REAL (banco), usando a ponte de testes no lugar do Supabase.
// Rodar com: bash tools/testar-loja-real.sh
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');

const SITE = process.env.SITE || 'http://localhost:8081';
const BRIDGE = process.env.BRIDGE || 'http://localhost:8099';
const DB = process.env.DB;
const sql = (q) => execFileSync('psql', ['-X', '-q', '-At', '-d', DB, '-c', q], { encoding: 'utf8' }).trim();

let failures = 0;
const results = [];
async function step(name, fn) {
  try { await fn(); results.push(`  ✓ ${name}`); } catch (e) { failures++; results.push(`  ✗ ${name}\n      ${e.message.split('\n')[0]}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

async function livePage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'pt-BR' });
  await ctx.route('**/js/config.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `export const SUPABASE_URL = '${BRIDGE}'; export const SUPABASE_ANON_KEY = 'chave-de-teste';`,
  }));
  await ctx.addInitScript({ content: `window.__FJS_BRIDGE__ = ${JSON.stringify(BRIDGE)};` });
  await ctx.addInitScript({ path: require('path').join(__dirname, 'live/fake-supabase.js') });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  return page;
}

(async () => {
  const browser = await chromium.launch();
  const page = await livePage(browser);

  console.log('Loja real');
  await step('catálogo vem do banco', async () => {
    sql("update public.products set price = 44.90 where id = 'caneca-gostoso'");
    await page.goto(SITE + '/#p-caneca-gostoso');
    await page.waitForSelector('#price');
    expect((await page.textContent('#price')).includes('44,90'), 'preço do banco não apareceu');
    expect((await page.textContent('.demo-bar')).includes('fase de testes'), 'faixa do modo real');
  });

  let code = '';
  await step('pedido com Pix é criado no banco com total recalculado', async () => {
    await page.goto(SITE + '/#p-caneca-ta-bom');
    await page.locator('label.opt', { hasText: 'Mágica' }).click();
    await page.fill('#pz', 'Lilian');
    await page.click('#q-plus');
    await page.click('#add');
    await page.goto(SITE + '/#sacola');
    await page.fill('#cep', '30130-000');
    await page.click('#cep-form button');
    await page.check('input[name="ship"][value="sedex"]');
    await page.click('#to-checkout');
    await page.fill('#c-name', 'Ana Real');
    await page.fill('#c-email', 'ana@exemplo.com');
    await page.fill('#c-phone', '31999990000');
    await page.fill('#c-street', 'Rua A');
    await page.fill('#c-num', '10');
    await page.fill('#c-city', 'Belo Horizonte, MG');
    const shownTotal = await page.textContent('#co-total');
    await page.click('#place');
    await page.waitForSelector('.timeline');
    code = page.url().split('#pedido-')[1];
    expect(/^FJ\d{6}$/.test(code), `código ${code}`);
    const dbTotal = sql(`select total from public.orders where code = '${code}'`);
    expect(shownTotal.replace(/\D/g, '') === dbTotal.replace(/\D/g, ''), `total da tela ${shownTotal} ≠ banco ${dbTotal}`);
    expect(sql("select stock from public.products where id = 'caneca-ta-bom'") === '12', 'estoque não baixou no banco');
    expect(sql(`select personalization from public.order_items i join public.orders o on o.id = i.order_id where o.code = '${code}'`) === 'Lilian', 'personalização salva');
    expect(!(await page.isVisible('#sim-pay')), 'não pode haver botão de simular pagamento');
  });

  await step('cartão no modo real não pede número do cartão', async () => {
    await page.goto(SITE + '/#p-adesivos-boatoat');
    await page.click('#add');
    await page.goto(SITE + '/#sacola');
    await page.fill('#cep', '01310-100');
    await page.click('#cep-form button');
    await page.check('input[name="ship"][value="retirada"]');
    await page.click('#to-checkout');
    await page.check('input[name="pay"][value="cartao"]');
    expect(await page.locator('#cc-num').count() === 0, 'campo de número de cartão existe');
    await page.fill('#c-name', 'Bia Real');
    await page.fill('#c-email', 'bia@exemplo.com');
    await page.fill('#c-phone', '11988887777');
    await page.selectOption('#cc-inst', '2');
    await page.click('#place');
    await page.waitForSelector('.timeline');
    expect(sql("select payment_method || installments from public.orders where customer_email = 'bia@exemplo.com'") === 'cartao2', 'pedido com cartão 2×');
  });

  await step('estoque insuficiente mostra mensagem clara', async () => {
    sql("update public.products set stock = 3 where id = 'caneca-gostoso'");
    await page.reload();
    await page.goto(SITE + '/#p-caneca-gostoso');
    await page.waitForSelector('#add');
    await page.click('#q-plus');
    await page.click('#add');
    // enquanto isso, outra cliente comprou: sobrou 1
    sql("update public.products set stock = 1 where id = 'caneca-gostoso'");
    await page.goto(SITE + '/#sacola');
    await page.fill('#cep', '30130000');
    await page.click('#cep-form button');
    await page.click('#to-checkout');
    for (const [s, v] of [['#c-name', 'Cris'], ['#c-email', 'cris@exemplo.com'], ['#c-phone', '1'], ['#c-street', 'R'], ['#c-num', '1'], ['#c-city', 'BH']]) await page.fill(s, v);
    await page.click('#place');
    await page.waitForSelector('#co-error:not([hidden])');
    const msg = await page.textContent('#co-error');
    expect(msg.includes('Só temos 1 unidade'), msg);
    expect(sql("select count(*) from public.orders where customer_email = 'cris@exemplo.com'") === '0', 'pedido não deveria existir');
  });

  await step('cliente acompanha o pedido em outro aparelho com código e e-mail', async () => {
    const other = await livePage(browser);
    await other.goto(SITE + '/#pedidos');
    await other.fill('#lk-code', code);
    await other.fill('#lk-email', 'errado@exemplo.com');
    await other.click('#lookup button');
    await other.waitForSelector('#lk-err:not([hidden])');
    await other.fill('#lk-email', 'ANA@exemplo.com');
    await other.click('#lookup button');
    await other.waitForSelector('.timeline');
    expect((await other.textContent('h1')).includes('Falta o Pix'), 'página do pedido');
    await other.context().close();
  });

  await step('orçamento de brindes chega ao banco', async () => {
    await page.goto(SITE + '/#brindes');
    await page.fill('#r-name', 'Paula');
    await page.fill('#r-company', 'Empresa Real');
    await page.fill('#r-email', 'paula@empresa.com');
    await page.fill('#r-qty', '50');
    await page.fill('#r-msg', 'Kit de fim de ano');
    await page.check('#r-lgpd');
    await page.click('#req button[type="submit"]');
    await page.waitForSelector('#req-ok:not([hidden])');
    expect(sql("select qty from public.requests where company = 'Empresa Real'") === '50', 'solicitação no banco');
  });

  console.log('Painel real');
  await step('login recusa senha errada e conta sem acesso', async () => {
    await page.goto(SITE + '/#painel');
    await page.waitForSelector('#login');
    await page.fill('#lg-email', 'lilian@fanjoy.test');
    await page.fill('#lg-pass', 'errada');
    await page.click('#login button');
    await page.waitForSelector('#lg-err:not([hidden])');
    expect((await page.textContent('#lg-err')).includes('incorretos'), 'mensagem de senha');
    await page.fill('#lg-email', 'cliente@fanjoy.test');
    await page.fill('#lg-pass', 'senha-cliente');
    await page.click('#login button');
    await page.waitForFunction(() => document.querySelector('#lg-err')?.textContent.includes('não tem acesso'));
  });

  await step('Lilian entra e vê os indicadores do banco', async () => {
    await page.fill('#lg-email', 'lilian@fanjoy.test');
    await page.fill('#lg-pass', 'senha-lilian');
    await page.click('#login button');
    await page.waitForSelector('.kpis');
    expect((await page.textContent('.kpis')).includes('2'), 'deveria contar 2 pedidos');
    expect((await page.textContent('.panel-warn')).includes('Caneca “Gostoso!”'), 'alerta de estoque baixo');
    expect((await page.textContent('.admin-nav')).includes('Encomendas'), 'menu');
  });

  await step('atualiza status com rastreio e a cliente vê', async () => {
    await page.goto(SITE + '/#painel-pedidos');
    await page.waitForSelector(`#st-${code}`);
    await page.selectOption(`#st-${code}`, 'pago');
    await page.waitForFunction((c) => document.querySelector(`#st-${c}`)?.value === 'pago' && !document.querySelector(`#st-${c}`).disabled, code);
    await page.fill(`#tr-${code}`, 'BR123456789BR');
    await page.selectOption(`#st-${code}`, 'enviado');
    await page.waitForFunction((c) => document.querySelector(`#st-${c}`)?.value === 'enviado' && !document.querySelector(`#st-${c}`).disabled, code);
    expect(sql(`select status || ' ' || tracking_code from public.orders where code = '${code}'`) === 'enviado BR123456789BR', 'status no banco');
    await page.goto(SITE + `/#pedido-${code}`);
    await page.waitForSelector('.timeline');
    expect((await page.textContent('#view')).includes('BR123456789BR'), 'rastreio para a cliente');
  });

  await step('ajuste de estoque no painel grava no banco', async () => {
    await page.goto(SITE + '/#painel-produtos');
    await page.waitForSelector('tr[data-id="bottons-dupla"]');
    await page.locator('tr[data-id="bottons-dupla"] [data-f="stock"]').fill('7');
    await page.locator('tr[data-id="bottons-dupla"] [data-f="stock"]').dispatchEvent('change');
    await page.waitForFunction(() => document.querySelector('tr[data-id="bottons-dupla"] [data-f="stock"]')?.value === '7' && !document.querySelector('tr[data-id="bottons-dupla"] [data-f="stock"]').disabled);
    expect(sql("select stock from public.products where id = 'bottons-dupla'") === '7', 'estoque no banco');
    expect(sql("select reason from public.stock_movements where product_id = 'bottons-dupla' order by id desc limit 1") === 'ajuste', 'movimento de ajuste');
  });

  await step('relatório e solicitações do banco', async () => {
    await page.goto(SITE + '/#painel-relatorios');
    await page.waitForSelector('[data-testid="report"] tbody tr');
    expect((await page.textContent('[data-testid="report"]')).includes('Caneca “Tá bom!”'), 'linha do relatório');
    await page.goto(SITE + '/#painel-solicitacoes');
    await page.waitForSelector('.req-card');
    expect((await page.textContent('.req-list')).includes('Empresa Real'), 'orçamento no painel');
  });

  await step('sair do painel encerra a sessão', async () => {
    await page.goto(SITE + '/#painel');
    await page.waitForSelector('#adm-out');
    await page.click('#adm-out');
    await page.goto(SITE + '/#painel-pedidos');
    await page.waitForSelector('#login');
  });

  await step('sem erros de JavaScript', async () => { expect(page.errors.length === 0, page.errors.join(' | ')); });

  await browser.close();
  console.log(results.join('\n'));
  console.log(failures ? `\n${failures} teste(s) falharam.` : '\nTodos os testes passaram.');
  process.exit(failures ? 1 : 0);
})();

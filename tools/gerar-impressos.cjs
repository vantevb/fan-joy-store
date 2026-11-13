// Gera os PDFs e PNGs dos cartões impressos (impressos/cartoes.html) na pasta impressos/.
// Uso: python3 -m http.server 8080 &  e depois  node tools/gerar-impressos.cjs http://localhost:8080
const { chromium } = require('playwright');
const path = require('path');

const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const OUT = path.join(__dirname, '..', 'impressos');
const PDFS = [
  ['a4-agradecimento', 'agradecimento-A4.pdf', '297mm', '210mm'],
  ['a4-cuidados', 'cuidados-caneca-A4.pdf', '297mm', '210mm'],
  ['foto-agradecimento', 'agradecimento-10x15.pdf', '150mm', '100mm'],
  ['foto-cuidados', 'cuidados-caneca-10x15.pdf', '100mm', '150mm'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [folha, file, width, height] of PDFS) {
    await page.goto(`${BASE}/impressos/cartoes.html?folha=${folha}`);
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: path.join(OUT, file), width, height, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    console.log('PDF', file);
  }
  // PNG em 300 dpi de cada cartão sozinho, para mandar à gráfica se preferir.
  const hi = await browser.newPage({ deviceScaleFactor: 300 / 96 });
  for (const [folha, file] of [['agradecimento', 'agradecimento-13x9cm.png'], ['cuidados', 'cuidados-caneca-9x6cm.png']]) {
    await hi.goto(`${BASE}/impressos/cartoes.html?folha=${folha}`);
    await hi.evaluate(() => document.fonts.ready);
    await hi.locator('.card').screenshot({ path: path.join(OUT, file) });
    console.log('PNG', file);
  }
  await browser.close();
})();

// Aplica a marca d'água da Fan Joy Store numa imagem: "© FAN JOY STORE" em diagonal, repetido pela imagem,
// e o endereço da loja no canto. Use sempre a partir do ARQUIVO ORIGINAL (sem marca), guardado fora do site.
// Uso: node tools/marca-dagua.cjs original.png img/saida.webp
// Requer: npm i sharp  (e as fontes Figtree instaladas no computador, para o texto sair na fonte da marca)
const sharp = require('sharp');

(async () => {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) { console.error('Uso: node tools/marca-dagua.cjs <original> <saída.webp>'); process.exit(1); }
  const img = sharp(input);
  const { width: w, height: h } = await img.metadata();
  const size = Math.round(Math.max(w, h) * 0.034);   // tamanho do texto proporcional à imagem
  const stepX = size * 11, stepY = size * 4.2;
  let rows = '';
  for (let y = -h; y < h * 2; y += stepY) {
    for (let x = -w; x < w * 2; x += stepX) {
      const shift = (Math.round(y / stepY) % 2) * stepX / 2;
      rows += `<text x="${x + shift}" y="${y}">© FAN JOY STORE</text>`;
    }
  }
  const pad = Math.round(size * 0.6);
  const tag = Math.round(size * 0.5);
  const tagW = Math.round(tag * 15.5), tagH = Math.round(tag * 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <g transform="rotate(-24 ${w / 2} ${h / 2})" font-family="Figtree, DejaVu Sans, sans-serif" font-weight="700" font-size="${size}" letter-spacing="${size * 0.12}"
       fill="#FFFFFF" fill-opacity="0.42" stroke="#16224F" stroke-opacity="0.22" stroke-width="${Math.max(1, size / 22)}">${rows}</g>
    <g transform="translate(${w - tagW - pad} ${h - tagH - pad})">
      <rect width="${tagW}" height="${tagH}" rx="${tagH / 2}" fill="#16224F" fill-opacity="0.78"/>
      <text x="${tagW / 2}" y="${tagH * 0.66}" text-anchor="middle" font-family="Figtree, DejaVu Sans, sans-serif" font-weight="700" font-size="${tag}" fill="#FFFFFF">© fanjoystore.com.br</text>
    </g>
  </svg>`;
  await img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).webp({ quality: 82 }).toFile(output);
  console.log(`marca d'água aplicada: ${output} (${w} × ${h})`);
})();

#!/usr/bin/env bash
# Monta a pasta dist/ só com o que vai para o ar: a loja (index.html, css, js, img) e os cabeçalhos de segurança.
# Documentos internos, banco de dados, testes e a ferramenta de posts do Instagram ficam de fora.
# Usado pela Cloudflare Pages: comando de build "bash tools/publicar.sh", pasta de saída "dist".
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
cp index.html _headers dist/
cp -R css js img dist/
echo "dist/ pronto: $(find dist -type f | wc -l) arquivos"

# Fan Joy Store — apresentação demonstrativa

Loja virtual da **Fan Joy Store**, marca da Lilian (São Paulo), com criação e desenvolvimento da **VB Studio — Victoria Bellisario**.

Esta versão é uma **apresentação navegável**. Dá para explorar a loja, montar a sacola, simular pedidos com Pix e cartão, acompanhar pedidos e usar o painel de gestão. Nenhum pagamento é cobrado e nada é enviado. Produtos, materiais e preços são ilustrativos.

## O que tem no site

**Loja**
- Página inicial com destaques, coleções, categorias, encomendas, brindes, história e dúvidas frequentes
- Catálogo com categorias, busca, filtros (coleção, disponibilidade, personalizável, preço) e ordenação
- Página de produto com galeria, descrição, preço, variações, disponibilidade, prazo de produção e personalização com limite de caracteres
- Sacola com alteração de quantidade, remoção, cálculo de frete por CEP (simulado) e resumo
- Checkout com Pix (5% de desconto) e cartão em até 3× (validação de número, validade e CVV)
- Página do pedido com andamento, Pix demonstrativo e busca por número + e-mail
- Encomendas personalizadas e orçamento de brindes corporativos (mínimo de 20 unidades)
- Nossa história, atendimento, dúvidas frequentes e políticas de entrega, trocas, cancelamento e privacidade

**Coleção conceitual BoatOat FM Brasil 2026**
Oito produtos criados a partir das artes da Lilian (“Tá bom!” e “Gostoso!”): duas canecas, dupla de bottons, kit de seis photocards, ecobag, cartela de adesivos, banner do Boat “Tá bom” e banner do Oat “Gostoso!”. A página da coleção conta a piada interna “Virou coisa nossa” e deixa claro que não há vínculo oficial com os artistas, a produtora ou o evento.

**Painel de gestão** (`#painel`)
- Receita, pedidos, ticket médio e itens vendidos, com filtros por período, categoria e coleção
- Receita por semana
- Mais vendidos e menos vendidos
- Produtos com estoque e sem vendas no período
- Alertas de estoque baixo
- Pedidos: filtros e atualização de status (a cliente vê a mudança)
- Produtos e estoque: preço, estoque, alerta mínimo, tipo de venda, ativar/desativar e cadastro de produto
- Encomendas e orçamentos recebidos
- Relatório por produto (quantidade, receita, vendas por semana, estoque) com exportação em CSV
- Os indicadores separam produtos **em linha**, **novos** (menos de 30 dias), **sob encomenda** e **indisponíveis**. Só os produtos em linha entram em “menos vendidos”, e “por semana” considera apenas os dias em que o produto existia.

**Sistema opcional** (`#sistema-opcional`)
Apresentação do sistema de gestão integrado (financeiro, custos e margem, produção, notas fiscais, relatórios e acessos), separado da loja, com escopo e contratação próprios.

## Demonstração e loja real

O arquivo `js/config.js` decide o modo:
- **vazio**: modo demonstração, com dados salvos só no navegador;
- **com URL e chave do Supabase**: loja real, com banco de dados, login do painel e regras de segurança.

Veja [docs/backend.md](docs/backend.md) para configurar o Supabase e para o que falta (pagamento, frete real e e-mails).

## Como rodar

O site é estático (HTML, CSS e JavaScript, sem etapa de build). Qualquer servidor de arquivos serve:

```bash
cd fan-joy-store
python3 -m http.server 8080
```

Depois abra http://localhost:8080.

Os dados da demonstração (sacola, pedidos, ajustes do painel) ficam no `localStorage` do navegador. O botão “Restaurar dados de exemplo”, no painel, volta tudo ao estado inicial.

## Posts do Instagram

Com o servidor rodando, abra http://localhost:8080/instagram/ para montar posts do feed no padrão da loja: fundo branco, nome da loja no topo, foto do produto numa moldura à esquerda, descrição e **preço** à direita (com o valor no Pix) e a logo clarinha no rodapé.

- Escolha um produto do catálogo ou “Produto novo” e ajuste os textos só para aquele post.
- Dá para trocar a foto e escolher entre preencher a moldura ou mostrar a foto inteira.
- **Baixar imagem** gera um PNG de 1080 × 1350 (formato retrato 4:5, o que mais aparece no feed).
- Para abrir já com um produto: `instagram/?produto=caneca-gostoso`.

## Testes

```bash
npm i -D playwright && npx playwright install chromium

# Site no modo demonstração: fluxos de compra e de gestão, e celular sem rolagem lateral
python3 -m http.server 8080 &
node tests/e2e.cjs http://localhost:8080

# Banco de dados (requer PostgreSQL 15+ local)
bash tools/testar-banco.sh

# Site no modo loja real, contra o banco local
bash tools/testar-loja-real.sh
```

## Estrutura

```
fan-joy-store/
  index.html          página única
  css/styles.css      identidade visual e layout
  js/config.js        conexão com o Supabase (vazio = demonstração)
  js/api.js           camada de dados: demonstração ou banco real
  js/vendor/          cliente oficial do Supabase (supabase-js 2.45.4, licença MIT)
  js/data.js          catálogo, coleções, categorias, status e perguntas frequentes
  js/state.js         sacola, dados da demonstração, frete simulado e indicadores
  js/ui.js            formatação, ilustrações demonstrativas e ícones
  js/store.js         páginas da loja
  js/admin.js         painel de gestão e sistema opcional
  js/app.js           rotas, cabeçalho, sacola e rodapé
  img/                artes da Lilian e logo em WebP
  instagram/          base de posts do Instagram (fontes Gloock e Figtree, licença OFL; html-to-image 1.11.11, licença MIT)
  supabase/           migração do banco, catálogo inicial (seed) e testes do banco
  tools/              gerador do seed e scripts de teste
  tests/              testes de ponta a ponta (demonstração e loja real)
  docs/               back-end, guia de uso, escopo e checklist de abertura
```

## Documentos

- [Back-end: configuração do Supabase e próximos passos](docs/backend.md)
- [Guia de uso para a Lilian](docs/guia-da-lilian.md)
- [Escopo da loja e sistema opcional](docs/escopo.md)
- [Checklist para abrir as vendas](docs/checklist-abertura.md)

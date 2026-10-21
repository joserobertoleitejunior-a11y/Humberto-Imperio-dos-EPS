# MAPA DO SITE — Império do EPS
> "Onde está cada coisa" pra qualquer alteração futura (humana ou IA) sem varrer o projeto.
> Ler junto com `PADROES-AGENCIA.md` (regras) e `BRIEFING-HUMBERTO.md` (cliente, concorrentes, pendências).
> Para achar um bloco no HTML, busque o comentário-marcador (ex.: `===== CALCULADORA`).

## 1. Alterações mais comuns → onde mexer

| Quero mudar... | Arquivo | Onde |
|---|---|---|
| WhatsApp, Instagram, cidade, endereço, mapa | `assets/js/config.js` | `window.IMPERIO_CONFIG` (único ponto) |
| Medida do bloco (habilita "nº de blocos" na calculadora) | `assets/js/config.js` | `medidaBloco: { largura, altura }` em metros + `perdaPercentual` |
| Ficha técnica dos blocos | `config.js` → `blocos` **e** `index.html` → `===== FICHA TÉCNICA` | o corte em escala usa `style="--c:3.5;--e:8"` |
| Promoção/foto exibida sem banco | `config.js` | `promocoesPadrao`, `galeriaPadrao` |
| Promoções e fotos de obra (dia a dia) | **painel** `admin.html` | abas Promoções e Galeria (sem mexer em código) |
| Ligar o banco | `config.js` → `supabase.url/anonKey` | + rodar `supabase/schema.sql` (ver README) |
| Ligar Sentry | `config.js` → `sentryDsn` | |
| Textos da hero | `index.html` | `===== HERO` |
| Benefícios | `index.html` | `===== O BLOKÃO` |
| Comparativo Blokão × tijolo | `index.html` | `===== COMPARATIVO` |
| Conta da calculadora | `assets/js/calculadora-nucleo.js` | `calcularObra()` (testada em `tests/calculadora.test.js`) |
| Mensagem que vai pro WhatsApp | `calculadora-nucleo.js` | `mensagemWhatsApp()` |
| Linha de produtos EPS | `index.html` | `===== LINHA EPS` (cada item tem a mensagem em `data-whatsapp`) |
| FAQ | `index.html` | `===== DÚVIDAS` |
| Cores, fontes | `assets/css/site.css` / `admin.css` | `:root` |
| Desenho 3D do bloco | `brand/scripts/gerar_bloco_iso.py` | gera o `<svg class="bloco-iso">` colado na hero |
| SEO | `index.html` `<head>` | title, description, OG, JSON-LD; `robots.txt`, `sitemap.xml` |
| Versão de cache | `index.html` e `admin.html` | `?v=AAAAMMDDx` — trocar a cada deploy |

## 2. Arquivos

```
index.html                     Página de vendas (hero, faixa, blokão, ficha, comparativo, calculadora,
                               linha EPS, galeria, promoções, como funciona, FAQ, contato, modal, lightbox)
admin.html                     Painel: login | Visão geral · Orçamentos · Clientes · Promoções · Galeria

assets/css/site.css            Visual do site (mobile-first)
assets/css/admin.css           Visual do painel
assets/js/config.js            ★ Configuração única
assets/js/observabilidade.js   Sentry (só com DSN)
assets/js/supabase-init.js     SDK sob demanda (não bloqueia a abertura)
assets/js/analytics.js         Páginas vistas e cliques → tabelas paginas_vistas/cliques
assets/js/main.js              Links de contato, menu, header, revelar ao rolar, toast
assets/js/cliente.js           Cadastro "Entrar com WhatsApp" → tabela clientes
assets/js/calculadora-nucleo.js  Regra da calculadora (sem DOM, roda no Node)
assets/js/calculadora.js       Interface da calculadora → WhatsApp + tabela orcamentos
assets/js/conteudo.js          Promoções e galeria vindas do banco (skeleton + lightbox)
assets/js/animacoes.js         Hero: camadas do bloco se encaixam (CSS) e abrem ao rolar (GSAP opcional)
assets/js/admin-dados.js       Dados do painel: Supabase ou demonstração
assets/js/admin-metricas.js    Contas do dashboard (testadas)
assets/js/admin-graficos.js    Gráficos em SVG puro (sem biblioteca)
assets/js/admin.js             Interface do painel
assets/img/                    Logo, favicon, og-image, foto provisória de obra

supabase/schema.sql            Tabelas + RLS + bucket de fotos + papel admin
tests/*.test.js                Unitários (npm test) — rodam antes de todo deploy
tests/e2e/fluxo.spec.js        E2E Playwright (npm run test:e2e)
brand/                         Logotipo, kit do Instagram, scripts geradores
```

## 3. Regras de layout
- Sem rolagem lateral de 320 px a 1920 px (coberto pelo E2E).
- `[hidden]` sempre esconde (regra global).
- Ordem dos `<script>` importa: `config` → `observabilidade` → `supabase-init` → `analytics` → `main` → `cliente` → `calculadora-nucleo` → `calculadora` → `conteudo` → `animacoes`.
- Tudo respeita `prefers-reduced-motion`.

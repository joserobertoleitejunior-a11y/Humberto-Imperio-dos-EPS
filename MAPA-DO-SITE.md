# MAPA DO SITE — Império do EPS
> "Onde está cada coisa" pra qualquer alteração futura (humana ou IA) sem varrer o projeto.
> Ler junto com `PADROES-AGENCIA.md` (regras) e `BRIEFING-HUMBERTO.md` (cliente, concorrentes, pendências).
> Para achar um bloco no HTML, busque o comentário-marcador (ex.: `===== CALCULADORA`).

## 1. Alterações mais comuns → onde mexer

| Quero mudar... | Arquivo | Onde |
|---|---|---|
| WhatsApp, Instagram, cidade, endereço, mapa | `assets/js/config.js` | `window.IMPERIO_CONFIG` (único ponto) |
| Medida do bloco (habilita "nº de blocos" na calculadora **e** medidas/peso nas fichas da jornada) | `assets/js/config.js` | `medidaBloco: { largura, altura }` em metros + `perdaPercentual` |
| Peso real de cada bloco | `assets/js/config.js` | `pesos: { b15: 80, ... }` (substitui a estimativa) · estimativa usa `densidades` |
| Ficha técnica dos blocos | `config.js` → `blocos` **e** `index.html` → `===== FICHA TÉCNICA` e painéis da `===== JORNADA` | o corte em escala usa `style="--c:3.5;--e:8"` |
| Promoção/foto exibida sem banco | `config.js` | `promocoesPadrao`, `galeriaPadrao` |
| Promoções e fotos de obra (dia a dia) | **painel** `admin.html` | abas Promoções e Galeria (sem mexer em código) |
| Ligar o banco | `config.js` → `supabase.url/anonKey` | + rodar `supabase/schema.sql` (ver README) |
| Ligar Sentry | `config.js` → `sentryDsn` | |
| Cores e fonte | `assets/css/site.css` / `admin.css` | `:root` (cal, concreto, grafite, azul técnico). Fonte Archivo hospedada em `assets/fonts/` |
| Logo | `assets/img/marca.svg` (claro) e `marca-clara.svg` (fundo escuro) | provisório; ver `brand/LOGO.md` |
| Splash (abertura) | `index.html` `===== SPLASH` + CSS "Splash" em `site.css` | tempo de fechar: `boas-vindas.js` (3,2 s) |
| Tela de boas-vindas com vídeo | `index.html` `===== BOAS-VINDAS` + `boas-vindas.js` | vídeo em `video/como-orcar.mp4` |
| Aparência do bloco 3D (concreto, pérolas do EPS, luz) | `assets/js/bloco3d.js` | `texturasConcreto()`, `texturasEPS()`, luzes em `iniciar()` |
| Roteiro do bloco: vista explodida SÓ DEMONSTRATIVA (o concreto não solta do EPS na vida real) → abre ao meio → fichas na horizontal → monta de novo | `assets/js/cena.js` (`alvoJornada`, comentário com as faixas de rolagem) e `assets/js/motion.js` (`pintarJornada`, curva do "L") | |
| Peças interativas (arrastar, girar, Separar/Juntar/Só EPS/Só concreto, volta ao rolar) | `assets/js/toque.js` (gestos e botões) + `bloco3d.js` → objeto `interacao` | área de toque: `[data-toque]` (hero e `.jornada__toque`) |
| Fichas de cada peça (espessura, comprimento × altura, peso) e botões 10/13/15/20 | `index.html` `===== JORNADA` (`data-espec`/`data-campo`) + `assets/js/especificacoes.js` | testado em `tests/especificacoes.test.js` |
| Letras que se montam na rolagem | qualquer título com `data-letras` (`"h"` = chegam pela direita) | lógica em `motion.js` |
| Faixas de texto que andam na horizontal | `index.html` `===== FAIXAS` (`data-faixa-rolagem="1"` ou `"-1"`) | |
| Conta da calculadora / mensagem do WhatsApp | `assets/js/calculadora-nucleo.js` | testada em `tests/calculadora.test.js` |
| FAQ, benefícios, linha EPS, comparativo | `index.html` | blocos marcados |
| SEO | `index.html` `<head>` | title, description, OG, JSON-LD; `robots.txt`, `sitemap.xml` |
| Versão de cache | `index.html` e `admin.html` | `?v=AAAAMMDDx` — trocar a cada deploy |

## 2. Níveis de aparelho (desempenho)

`assets/js/dispositivo.js` roda no `<head>` e grava `html[data-qualidade]`:

| Nível | Quem | O que muda |
|---|---|---|
| `alta` | PC sem toque, ≥ 8 núcleos, ≥ 8 GB | 3D com sombra real, partículas de EPS, 2× resolução |
| `media` | celular/PC comum | 3D sem sombra real (mancha suave), menos partículas, 1,5× |
| `baixa` | ≤ 4 GB ou ≤ 4 núcleos | 3D em 1×, texturas 512, sem partículas, títulos por palavra, sem desfoque de vidro |
| `estatica` | economia de dados, 2G, ≤ 2 GB, "reduzir movimento" | **sem 3D**: imagens prontas (`bloco-fechado/desmontado.webp`), jornada vira seção normal |

Forçar pra testar: `?qualidade=baixa` (ou `alta`, `media`, `estatica`) na URL.
O que mantém o site leve: Three.js só baixa **depois** do `load` + ociosidade; **um** canvas só (hero + jornada);
o 3D só desenha quando algo muda (parado = 0 % de GPU) e baixa a resolução sozinho se engasgar; fonte própria (90 KB), sem Google Fonts.

## 3. Arquivos

```
index.html                     Página de vendas (splash, hero 3D, faixas, jornada em L, benefícios, ficha,
                               comparativo, calculadora, linha EPS, galeria, promoções, como funciona, FAQ, contato,
                               boas-vindas com vídeo, modal de cadastro, lightbox)
admin.html                     Painel: login | Visão geral · Orçamentos · Clientes · Promoções · Galeria

assets/css/site.css            Visual do site (mobile-first)
assets/css/admin.css           Visual do painel
assets/fonts/archivo-latin.woff2  Fonte Archivo variável (peso + largura), hospedada no próprio site
assets/vendor/three-imperio.min.js  Three.js só com o que a cena usa (gerado: npm run vendor)

assets/js/dispositivo.js       (head) nível de qualidade do aparelho + altura real da tela
assets/js/config.js            ★ Configuração única
assets/js/observabilidade.js   Sentry (só com DSN)
assets/js/boas-vindas.js       Splash (fecha/pula) + tela de boas-vindas com o vídeo (1x por sessão)
assets/js/supabase-init.js     SDK sob demanda (não bloqueia a abertura)
assets/js/analytics.js         Páginas vistas e cliques → tabelas paginas_vistas/cliques
assets/js/main.js              Links de contato, menu, header, revelar ao rolar, toast
assets/js/especificacoes.js    Medidas e peso de cada peça (concreto externo, EPS, concreto interno, montado) + espessura escolhida
assets/js/motion.js            Letras na rolagem, faixas horizontais, jornada em "L" (sticky)
assets/js/cliente.js           Cadastro "Entrar com WhatsApp" → tabela clientes
assets/js/calculadora-nucleo.js  Regra da calculadora (sem DOM, roda no Node)
assets/js/calculadora.js       Interface da calculadora → WhatsApp + tabela orcamentos
assets/js/conteudo.js          Promoções e galeria vindas do banco (skeleton + lightbox)
assets/js/cena.js              Liga a rolagem ao bloco 3D (carrega o Three.js sob demanda)
assets/js/toque.js             Peças interativas: dedo/mouse gira o bloco e puxa cada peça; rolou → volta ao lugar
assets/js/bloco3d.js           (ES module) cena Three.js: texturas procedurais, bloco que abre ao meio
assets/js/admin-*.js, admin.js Painel (dados, métricas testadas, gráficos SVG, interface)
assets/img/                    marca, favicon, og-image, bloco-fechado/desmontado (render do próprio 3D), foto de obra

video/index.html               Vídeo tutorial "Sua obra em 1 minuto" (Stories 1080×1920) — motor da Pizza em Dobro
video/motion.js / motion.css   Motor: celular com o site de verdade, legendas animadas, WhatsApp chegando
video/como-orcar.mp4 (+ capa)  Vídeo pronto, 720p ~2 MB (tela de boas-vindas; liga/desliga em config.boasVindasComVideo)
video/trilha-como-orcar.mp3    Trilha sintetizada (sem direitos autorais, sem locução)
scripts/                       vendor-three.js, exportar-roteiro.js, gerar-trilha-video.py, renderizar-video.js

supabase/schema.sql            Tabelas + RLS + bucket de fotos + papel admin
tests/*.test.js                Unitários (npm test) — rodam antes de todo deploy
tests/e2e/fluxo.spec.js        E2E Playwright (splash → boas-vindas, calculadora, cadastro, 3D/L, peças interativas, nível estático, painel, sem rolagem lateral)
brand/                         LOGO.md (recomendação + briefing), INSTAGRAM.md, capas de destaque, scripts geradores
```

## 4. Regras de layout
- Sem rolagem lateral de 320 px a 1920 px (coberto pelo E2E).
- `[hidden]` sempre esconde (regra global).
- O canvas 3D fica **fixo atrás** do conteúdo: hero e jornada são transparentes; as outras seções têm fundo e cobrem o canvas.
- Ordem dos `<script>` importa: `config` → `observabilidade` → `boas-vindas` → `supabase-init` → `analytics` → `main` → `especificacoes` → `motion` → `cliente` → `calculadora-nucleo` → `calculadora` → `conteudo` → `cena` → `toque`.
- Tudo respeita `prefers-reduced-motion` (vira nível `estatica`).

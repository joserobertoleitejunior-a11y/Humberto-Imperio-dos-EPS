# MAPA DO SITE — Império do EPS
> "Onde está cada coisa" pra qualquer alteração futura (humana ou IA) sem varrer o projeto.
> Ler junto com `PADROES-AGENCIA.md` (regras) e `BRIEFING-HUMBERTO.md` (cliente, concorrentes, pendências).
> Para achar um bloco no HTML, busque o comentário-marcador (ex.: `===== CALCULADORA`).

## 1. Alterações mais comuns → onde mexer

| Quero mudar... | Arquivo | Onde |
|---|---|---|
| WhatsApp, Instagram, cidade, endereço, mapa, link do Google (`googleUrl`), Facebook (`facebookUrl`: vazio = ícone escondido) — alimentam os **atalhos flutuantes** (`index.html` `===== ATALHOS FLUTUANTES`) | `assets/js/config.js` | `window.IMPERIO_CONFIG` (único ponto) |
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

### Casa inteira de Blocão — 3ª fase do "Por dentro", na MESMA tela (`assets/js/casa.js` + `assets/js/casa3d.js`)
Não é uma seção separada: o `#por-dentro` ficou mais longo (1060vh PC / 980vh celular) e tem 2 fases na mesma tela fixa —
o "L" (mesmos 540vh de rolagem de antes, `data-jornada-l="540"`) e, em seguida, a casa. Quando o "L" termina (Blocão inteiro),
as fichas e botões saem, a camada da casa esmaece por cima e o bloco da casa começa **exatamente onde o Blocão estava**
(mesmo ponto, tamanho e ângulo — `ImperioCena.alvoFinal()`); ele vai pro canto da obra e vira o 1º bloco. Depois:
**3 maquetes em tamanho real** (botões "Casa simples / Casa média / Casarão"; a rolagem monta a escolhida):
- Casa simples: térrea 6,5 × 7,5 m, ≈ 49 m², varandinha — 173 Blocões, 5 etapas (sem 2º andar)
- Casa média: sobrado 9 × 7 m, ≈ 125 m², varanda embaixo e em cima — 350 Blocões
- Casarão: 15 × 10 m, ≈ 285 m², panos de vidro, varanda larga, porta pivotante, painel de pedra e piscina — 412 Blocões
Fiada por fiada → laje/varanda → 2º andar → platibanda → vidros, ripado, porta, guarda-corpo → pintura, jardim e bonequinhos.
HD: enquanto rola desenha leve; parado ~0,16 s refaz em alta resolução (PC/celular bom até 2–2,5×, com superamostragem).
"estatica": imagem pronta de cada tipo (`assets/img/casa-simples|media|casarao.webp`), trocada pelos mesmos botões.
**Paredes móveis**: com a casa pronta, tocar numa parede tira ela (desliza pra fora e some) e a câmera entra pela
abertura até o canto cortado — as pontas dos Blocões vizinhos mostram o miolo (concreto + EPS + concreto) com a etiqueta
"Dentro do Blocão". No celular em pé a câmera recua e olha mais pro canto. "↺ Recolocar as paredes" ou rolar a página põe tudo de volta.

**Sem pulo ao parar a rolagem**: no celular a barra de endereço aparece/some quando a rolagem para e mudava a altura
da tela. `dispositivo.js` guarda uma altura estável (`ImperioTela.altura()` e `--vh`, que só mudam ao girar o aparelho ou
numa mudança grande); a seção "Por dentro", a tela fixa e o 3D usam essa medida. A obra também desliza até o ponto da
rolagem com uma "mola" de ~90 ms (fora do voo do Blocão, que segue a rolagem exata).

**Sem zoom**: meta viewport com `user-scalable=no`, `touch-action: pan-x pan-y` no html e `dispositivo.js` barra pinça
(iPhone) e Ctrl + roda/teclas — o site fica sempre no tamanho exato da tela. Campos com letra ≥ 16px (iPhone não amplia ao tocar).
O menu "A casa" leva pra `#casa` (âncora posicionada no começo da fase). `motion.js` publica `fim` (onde o "L" acaba) e
`casa` (0..1 da fase); o vídeo usa `pj` (fração do "L") e `pc` (fração da casa) nas rolagens.
- Tudo é função do progresso da rolagem (rolar pra cima desmonta); só desenha quando a rolagem muda.
- Blocos numa malha instanciada (1 objeto pra 451 peças); topo do bloco mostra o sanduíche concreto | EPS | concreto.
- O 3D só baixa quando a seção chega perto (1,5 tela antes). "estatica"/sem WebGL: imagem `assets/img/casa-blocao.webp` + etapas em lista.
- Bloco ilustrativo 1,00 × 0,50 m (face real a confirmar) — a seção diz "maquete ilustrativa".
- Celular antigo ("baixa"): sem antialias, sem reflexo de ambiente, texturas 128 px, resolução 1×; o 3D é preparado num momento ocioso.

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
assets/js/main.js              Links de contato, atalhos flutuantes (Google, Ligar, Facebook), menu, header, revelar ao rolar, toast
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

video/index.html               Vídeo tutorial "O Blocão em 30 segundos" (Stories 1080×1920) — motor da Pizza em Dobro
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
- PC: o canvas 3D fica **fixo atrás** do conteúdo: hero e jornada são transparentes; as outras seções têm fundo e cobrem o canvas.
- Celular (< 760 px): o canvas **mora dentro do que rola** — no palco da hero e, depois, na parte fixa (sticky) da jornada.
  Quem move o bloco é o navegador, junto com a página (canvas fixo + JS fica 1–2 quadros atrás da rolagem do celular e o bloco "escorrega").
- Ordem dos `<script>` importa: `config` → `observabilidade` → `boas-vindas` → `supabase-init` → `analytics` → `main` → `especificacoes` → `motion` → `cliente` → `calculadora-nucleo` → `calculadora` → `conteudo` → `cena` → `toque`.
- Tudo respeita `prefers-reduced-motion` (vira nível `estatica`).

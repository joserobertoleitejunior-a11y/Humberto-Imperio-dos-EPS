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
- Casa simples: térrea 6,5 × 7,5 m, ≈ 49 m², varandinha, banheiro e garagem — 266 Blocões, 5 etapas (sem 2º andar)
- Casa média: sobrado 9 × 7 m, ≈ 125 m², varanda embaixo e em cima, escada, lavabo e banheiro — 586 Blocões
- Casarão: 15 × 10 m, ≈ 285 m², panos de vidro, varanda larga, porta pivotante, painel de pedra, piscina, escada e 3 banheiros — 745 Blocões
Fiada por fiada → laje/varanda → 2º andar → platibanda → vidros, ripado, porta, guarda-corpo → pintura, jardim e bonequinhos.
HD: enquanto rola desenha leve; parado ~0,16 s refaz em alta resolução (PC/celular bom até 2–2,5×, com superamostragem).
"estatica": imagem pronta de cada tipo (`assets/img/casa-simples|media|casarao.webp`), trocada pelos mesmos botões.
**Paredes internas** (também de Blocão, com vão de porta): `internasA`/`internasB` de cada projeto em `casa3d.js`
— simples: sala/cozinha + 2 quartos; média: cozinha/lavanderia + lavabo, em cima 3 quartos e corredor; casarão:
escritório, sala integrada e cozinha, em cima suítes nos cantos e sala íntima. Não saem com o toque (só as externas).

**Girar com o dedo** (sempre, depois do voo do Blocão): arrastar pro lado gira a casa; na vertical a página rola
normal. No mouse, arrastar também inclina. Dentro da casa, arrastar desliza a câmera ao longo da abertura (cômodo a cômodo).

**Por dentro, por toque (sensação de drone sobrevoando)**: tocar numa parede de fora tira ela e a câmera entra num
ARCO pela abertura. Lá dentro a câmera anda por TOQUE — tocou no chão/num móvel, ela voa (rasante, em curva suave,
acelerando e freando, inclinando na curva) até 1,2 m antes do ponto e PARA mostrando o lugar; tocou numa parede
(interna ou externa), a parede desliza e mostra o Blocão por dentro (aviso "Dentro do Blocão"); tocou na escada ou no
botão de andar, sobe/desce voando. O site continua aparecendo (título, botão, contador) e a página rola normal —
rolar de verdade sai da casa. "↺ Sair da casa" (ou Esc) volta. Motor: `criarVoo`/`posVoo` (Catmull-Rom com
aceleração/frenagem em `casa3d.js`), sem física por quadro (leve no celular).

**Pontos estratégicos** (casa pronta, sem entrar na casa): 6 pontos na frente e na lateral da maquete — Casa mais
fresca, Mais silêncio, Obra rápida, Bem mais leve, Acabamento fácil, Sem mofo. Cada um tem uma etiqueta (HTML) nas
margens, fora do 3D, e uma linha tracejada (svg) até uma bolinha pulsando no ponto da casa. Clicou (etiqueta ou
bolinha): a câmera dá um zoom moderado até perto daquele ponto (na mesma direção em que a pessoa já olha, sem entrar
em varanda nem janela) e o cartão no lugar do texto conta a vantagem; em "Casa mais fresca" a parede da frente
desliza e mostra o Blocão por dentro. Tocar na casa ou rolar a página volta pra vista inteira. Arrastar gira a maquete.
Pontos em `montarPontos()` (calculados pela planta de cada casa); textos em `VANTAGENS` (`casa3d.js`).

**Tour pela casa** (só no VÍDEO — `ImperioCasa3D.tour()`; no site a casa é vista de fora, pelos pontos): sobrevoo automático com legendas de cinema — chega
de longe, a parede da frente sai (o corte mostra o Blocão), voos rasantes pela sala, cozinha e quartos, close no
"Dentro do Blocão", sobe a escada (sobrado e casarão), corredor, varanda com a paisagem, garagem, e volta pra vista
de fora. O cliente só assiste ("■ Parar o tour" ou rolar a página para). Roteiro em `PROJETOS.*.tour`
([x, y, z, olharX, olharY, olharZ, m/s, legenda]).

**Paisagem no fundo** (casa pronta, 90–98% da obra): céu (degradê em CSS, `--paisagem`), gramado até o horizonte,
morros, 40 árvores, casas vizinhas e rua surgem atrás da maquete (o fundo da seção vira o lugar da casa); por dentro é o que se vê pelas janelas.
Desempenho: o Blocão abre com texturas leves (256) e troca pelas nítidas em momentos ociosos; o EPS é um ladrilho
repetido 4× (16× menos pérolas pra desenhar — era o que travava ~2 s a abertura); a casa só é preparada com a página
parada (5 s depois de abrir ou no meio do "L"), em etapas curtas. Móveis e paisagem são montados num momento ocioso e FUNDIDOS por material (`fundirPorMaterial`: centenas
de peças viram ~20 desenhos); resolução fixa 2× nos dois 3D (sem realocar a imagem ao rolar/parar — tirou os trancos).

**Interior de projeto real** (`assets/js/casa-interior.js`, só aparece com a casa aberta): cada casa tem `mobilia`,
`quadros` e `luzes` em `PROJETOS` — salas com sofá, rack e TV, tapete e mesa de centro; mesa de jantar com cadeiras;
cozinha com bancada, pia, cooktop, micro-ondas, armários, geladeira inox (ilha no casarão), lavanderia; quartos com
cama, criados com abajur, guarda-roupa, escrivaninha; banheiros com vaso, pia com espelho e box de vidro; estantes,
poltronas, plantas, quadros pintados na hora (canvas) e luminárias de teto. Portas internas com batente e folha aberta.
Piso de madeira em cada andar e paredes internas com tinta areia.
**Escada** (sobrado e casarão): degraus de concreto com piso de madeira e guarda-corpo de vidro; a laje e o piso de
cima têm o vão da escada (`furo`) com guarda-corpo em volta (`guarda`).
**Garagem coberta com carro** em cada casa (aparece na maquete também).
**Maquete completa na tela** (`casa--maquete`, a partir de 97% da obra): o dedo na maquete só gira e inclina ela —
a página não rola por cima (rola pelo texto); antes disso a rolagem continua montando a casa.
**Zoom só no 3D**: por fora, a pinça (ou Ctrl + roda / pinça do touchpad) aproxima e afasta a maquete; o giro por fora também tem inércia.

**Paredes móveis**: com a casa de pé (a partir de 88% da obra), tocar numa parede externa tira ela (desliza pra fora e
some) e a câmera entra pela abertura de frente pra uma parede interna cortada — a ponta dela mostra o miolo do Blocão
(concreto + EPS + concreto) com a etiqueta "Dentro do Blocão". "↺ Recolocar as paredes" ou rolar de verdade (mais de 3%
da obra; um tremido do dedo não conta) põe tudo de volta.

**Sem pulo ao parar a rolagem**: no celular a barra de endereço aparece/some quando a rolagem para e mudava a altura
da tela. `dispositivo.js` guarda uma altura estável (`ImperioTela.altura()` e `--vh`, que só mudam ao girar o aparelho ou
numa mudança grande); a seção "Por dentro", a tela fixa e o 3D usam essa medida. A obra também desliza até o ponto da
rolagem com uma "mola" de ~90 ms (fora do voo do Blocão, que segue a rolagem exata).

**Abertura**: na 1ª visita o site abre DIRETO na tela do vídeo (o html já nasce com `.abre-video`: capa no 1º quadro,
botões na hora, o vídeo toca quando carregar). A splash clara só aparece ao recarregar na mesma sessão.
Toda mudança em JS/CSS troca o `?v=` no index.html (senão o celular continua com a versão antiga no cache).

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

## Pendências (próxima sessão)
- Tour (só no vídeo): mais rápido e com foco em mostrar o Blocão (cortes da parede, concreto + EPS + concreto).
- Vídeo: locução contínua (`FALA_CONTINUA=1`) gerada; o corte das cenas ainda escorrega até 1 palavra em algumas
  cenas (conferido com reconhecimento de voz) — ajustar e então regravar o vídeo com a transformação do Blocão
  em casa (mais lenta) + o tour (cenas tour1–tour8 em `video/blocao.html`).

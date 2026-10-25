# Próxima sessão — onde estamos (Humberto Império dos EPS)

Leia isto primeiro. Depois, `MAPA-DO-SITE.md` explica o site inteiro.

**Regras do projeto (José — VIBE CODING PROCESS):**
- Mexer **só** neste repositório. Os outros (remop-retifica, San-comercio, Pizzaria) servem só de consulta.
- Branch: `claude/humberto-imperios-site-branding-ja9yt8`. Não abrir PR sem pedido.
- Antes de enviar: `npm run lint`, `npm test` e os testes E2E do Playwright com `--workers=1`.
- Depois de mudar JS/CSS, trocar o `?v=` (cache) em todos os arquivos: hoje está `20261104e`.
- Publicar também no artifact de prévia: https://claude.ai/artifact/3g6zDghHqHzAwY4pWKVG79

## Feito no último commit (testado: lint, 10 unitários e 15 E2E passando)

1. **Arte do Gemini nos quadros**
   - Arquivo: `assets/img/quadros-vantagens.webp` (2700×1520, 3×2 painéis de 900×760).
   - Configurada em `config.js`, na chave `quadrosVantagens`.
   - O site recorta os 6 painéis em `carregarArteQuadros()`, no `casa3d.js`.
2. **Drone mais lento, como um drone de verdade** (`casa3d.js`)
   - Dentro da casa: `VEL_DENTRO` 2,6 m/s.
   - Fora da casa: `VEL_FORA` 4,5 m/s.
   - Leitura de cada quadro: `TOUR_LER` 2 s.
   - O caminho pega **atalhos** (bloco "atalho" em `iniciarTour`) para o tour não ficar longo. Só vale dentro da casa e no mesmo andar, e nunca corta janela nem laje.
3. **Trava e casa sumindo no começo da obra**
   - Os móveis e a paisagem agora são montados em duas etapas (`prepararExtrasOcioso`), só com a tela parada e fora de voo. Antes eram forçados de uma vez em até 4 s.
   - O aquecimento inicial (`aquecer()`) desenha num único pixel, para a casa pela metade não piscar na tela.

4. **Tela preta na entrada do drone**
   - O 1º ponto do voo é a câmera da maquete, lá no alto e longe. A curva (catmull) "embalava" nessa distância e o drone mergulhava abaixo do piso ao entrar na casa.
   - Agora `vizinho()` limita cada ponto vizinho a 1,5× o trecho atual, e a entrada ficou suave.
5. **Tour sem quadros (0 em vez de 6)**
   - A esfera de colisão dos blocos era medida com a casa ainda no chão.
   - Agora `montarPlacas()` recalcula `blocosMesh.computeBoundingSphere()` antes de procurar paredes.

## Casarão para todos + tour na hora + testes todos verdes (feito)

- **Casa padrão é o casarão:** obra e tour para todo mundo.
  - `tipoAtual = "casarao"` no `casa3d.js`; no `index.html`, `aria-pressed`, ficha, `aria-label` e a imagem do modo sem 3D.
  - Simples e média continuam nos botões, e clicar nelas recomeça o tour.
  - O tour do casarão dura 37,2 s (relógio controlado).
- **Rolagem rápida que termina parada na maquete:** o tour começa na hora (`mostrarTour` em `casa.js`), mesmo para quem já viu.
  - Detecta assim: a rolagem para a ≤ 6 px do ponto da maquete, logo depois de um embalo rápido.
- **Os 2 testes que falhavam desde antes agora passam** (15 de 15):
  - a imagem do modo sem 3D tem largura fixa no CSS: o espaço fica reservado antes de carregar, e antes ela tinha tamanho 0 até carregar;
  - o teste da calculadora espera a janela do WhatsApp navegar (`waitForURL`). O site sempre gerou o link certo.

## Tour sem abrir parede + casa clicável + parada na maquete (feito)

- **Tour:** nenhuma parede abre. Só a da frente sai, para o drone entrar. Em cada quadro o drone chega e desliza 2 s lendo (`TOUR_LER`). Saíram o recuo, a abertura ao lado do quadro e a tinta saindo no "Acabamento".
- **Depois do tour, na vista de cima** (a câmera não entra na casa, a pedido do cliente): tocar numa parede de fora tira a parede e mostra os cômodos mobiliados (`tocar` → `alternarParedeFora`).
  - Tocar de novo na mesma parede, ela volta. Rolar recoloca todas.
  - Tocar no telhado, na varanda ou no deck usa a parede de fora mais perto do toque e virada para a câmera.
  - `ImperioCasa3D.paredesFora()` conta as paredes abertas (testes).
  - `removerParede` (que entrava na casa) ficou sem uso, só reservado. Com isso, o passeio por dentro também ficou inalcançável.
  - A chamada do fim diz "Toque numa parede e veja a casa por dentro".
- **Rolagem rápida para baixo para na maquete pronta** (`ligarParadaNaMaquete` em `casa.js`):
  - a 1ª versão (só JavaScript) não segurou a inércia num celular de verdade;
  - agora a parada é **nativa**: marcador `.jornada__parada` com `scroll-snap-stop: always`. Testado com gesto do Chromium: 2.600 px cruzando a maquete pararam exatamente nela, e depois dá para continuar descendo;
  - o JavaScript ficou como reforço: a página fica sem rolagem por 0,3 s;
  - o Chromium de teste não simula a inércia do dedo: **conferir num celular real**, principalmente iPhone.
- **Trocar de casa recomeça o tour** com a maquete pronta: o tour atual acaba sem a chamada do fim e o da casa nova começa 0,9 s depois.
  - Os botões de tipo ficam visíveis durante o tour.
  - O CSS do tour esconde os filhos de `.casa__txt`, menos `.casa__tipos`.
- **Duração do tour:** voltou a ser só leitura, como antes (31 s na casa média, medido com relógio controlado).

## Texturas em todo celular (corrigido de verdade)

- **Por que não apareciam no celular:**
  - as fotos só eram aplicadas com a tela parada e sem voo do drone. No celular elas chegam com o tour já rodando, então esperavam o tour acabar;
  - uma foto que falhasse derrubava todas.
- **Agora** (`texturas.js`):
  - o material já nasce com os mapas, numa imagem provisória de 4 px com a cor média da foto (`MEDIA`). O shader compila uma vez só;
  - quando a foto chega, só a imagem é trocada, uma por quadro, sem recompilar. Funciona com tour, rolagem ou voo;
  - foto que falha fica na cor média e não afeta as outras;
  - as fotos começam a baixar assim que o 3D fica pronto.
- **Memória:**
  - celular: cor 512 e relevo/rugosidade 256;
  - PC forte: 1024 / 512 / 256;
  - "baixa": só a cor.
- **Teste:** `ImperioCasa3D.texturas()` conta os mapas já na GPU. Com 4G lento emulado, as 51 chegaram em cerca de 20 s, durante o tour.

## Rolagem fluida (feito)

- **Nada prende a rolagem:**
  - saiu a trava de rolagem do tour (`travarRolagem`);
  - saiu o `touch-action: none` da maquete pronta: no celular ela ocupa a tela e prendia o dedo.
- **Tour:**
  - só começa com a página parada (0,7 s);
  - para se a casa sair da tela;
  - interrompido, volta à maquete em 0,9 s (antes, ~3 s sem responder).
- **Medidas forçadas a cada quadro, removidas:**
  - `motion.js` lê a posição dos títulos ANTES de escrever os transforms da jornada;
  - `cena.js` guarda o fundo do palco da abertura em cache;
  - `casa3d.js` e `bloco3d.js` guardam o tamanho do canvas (`telaW`/`telaH`).
- **Shaders pré-compilados num pixel, em momento ocioso:**
  - `aquecerShaders()` no bloco: antes, pular para a casa pelo menu e subir compilava no meio da rolagem;
  - `aquecerExtras()` nos móveis e na paisagem: o tour não engasga ao entrar.
- **Medição (perfil da CPU, rolagem rápida para cima no celular):** a compilação no meio da rolagem caiu de 3,8 s para 0. Os testes rodam com WebGL por software, então o tempo de GPU daqui não vale para um aparelho real.
- **Ainda dá para melhorar:** no celular, o canvas do bloco muda de tamanho ao entrar e sair da fase da casa (`conferirFaseCasa` em `cena.js`). Isso realoca a imagem uma vez a cada passagem.

## Decisão pendente com o cliente: duração do tour

**Hoje (só leitura, sem abrir parede):** 31 s na casa média. O teste E2E espera até 80 s.

Medido antes dessa mudança, com o drone "de verdade":
- simples: 28,4 s
- média: 30,8 s
- casarão: 37,5 s

O cliente pediu antes um tour de no máximo 20 s, mas depois pediu o drone mais lento. Para chegar perto de 20 s, as opções são:
- subir `VEL_DENTRO` (~3,5 m/s);
- baixar `TOUR_LER` (~1,5 s);
- mostrar menos quadros por casa.

Perguntar qual ele prefere. O atalho já está ligado: sem ele o drone atravessava mesa e janela.

Script de medição: rolar até `#por-dentro`, esperar `ImperioCasa3D.emTourPontos()` virar true e medir até virar false.

## Texturas realistas em tudo — FEITO

- **Fotos:** CC0 da Poly Haven, em WebP, na pasta `assets/img/texturas/`. São 17 fotos com 3 mapas cada (`-cor`, `-normal` e `-rugosidade`): 51 arquivos, ≈ 2,2 MB.
- **Código:** fica em `assets/js/texturas.js`, usado pela casa (`casa3d.js`) e pelos móveis e paisagem (`casa-interior.js`).
  - `comFoto(material, nome, opções)` marca o material para receber a foto.
  - `uvNaCaixa()` põe a foto no tamanho real (UV em metros) em qualquer caixa.
  - `carregarTexturas()` baixa tudo quando a obra começa e troca as fotos só com a tela parada.
  - Nos blocos e na pintura, a foto corre contínua de bloco para bloco.
  - O lado real de cada foto fica em `LADO`.

| Foto | Onde vai | Original |
|---|---|---|
| `concreto` | Blocão por fora e laje | concrete_floor_worn_001 |
| `reboco` | pintura, branco (platibanda, base, garagem, móveis brancos) e casas vizinhas | painted_plaster_wall |
| `madeira` | piso de cima e escada | laminate_floor_02 |
| `porcelanato` | térreo | marble_01 |
| `telha` | cobertura e telhado dos vizinhos | clay_roof_tiles_02 |
| `grama` | base, gramado em volta (degradê vira só a transparência) e morros | leafy_grass |
| `calcada` | alicerce, caminho, entrada do carro e calçada | concrete_pavement |
| `teca` | portas e ripado | teak_veneer |
| `deck` | deck da varanda e da piscina | wood_floor_deck, menos saturada |
| `madeira-clara` | móveis (clara, escura e moldura) | oak_veneer_01 |
| `tecido` | sofás, camas e colchão; cinza, tingido pela cor do material | rough_linen |
| `tapete` | tapetes; cinza, tingido | dirty_carpet |
| `granito` | bancadas | granite_tile |
| `pedra-fachada` | painel de pedra do casarão | stacked_stone_wall |
| `casca` | troncos | bark_brown_02 |
| `folhagem` | copas e cerca viva; cinza, tingida | forest_leaves_02 |
| `asfalto` | rua | asphalt_02 |

- **Sem foto, de propósito:**
  - vidro, água, inox, grafite (metal pintado), cerâmica do banheiro, TV, espelho, carro, pneu e luzes. São superfícies lisas, que já ficam realistas com a cor e o brilho;
  - bonequinhos de escala (maquete);
  - corte do Blocão e bloco-guia (desenhados por código).
- **Aparelho fraco** (`data-qualidade="baixa"`): nada muda.
- **Tons:** cada `comFoto` tem os campos `cor` e `relevo`. Exemplos: telha menos laranja, deck mais claro.

**Testes:**
- Os E2E precisam de `CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --workers=1`: o navegador fixado pelo projeto não existe no ambiente novo.
- Os 15 testes E2E passam (os 2 que falhavam foram corrigidos; ver acima).

## Outros pendentes

- **Vídeo para o Instagram (vender sites da VIBE CODING PROCESS):** aguardando o cliente escolher a voz (dele, uma voz de IA genérica ou um locutor contratado).
  - Não clonar a voz do Chris Rock nem do dublador: isso envolve direito de imagem e voz e é propaganda enganosa.
- **PR para o Netlify atualizar:** só abrir se o cliente pedir.

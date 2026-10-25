# Próxima sessão — onde estamos (Humberto Império dos EPS)

Leia isto primeiro. Depois, `MAPA-DO-SITE.md` explica o site inteiro.

**Regras do projeto (José — VIBE CODING PROCESS):**
- Mexer **só** neste repositório. Os outros (remop-retifica, San-comercio, Pizzaria) servem só de consulta.
- Branch: `claude/humberto-imperios-site-branding-ja9yt8`. Não abrir PR sem pedido.
- Antes de enviar: `npm run lint`, `npm test` e os testes E2E do Playwright com `--workers=1`.
- Depois de mudar JS/CSS, trocar o `?v=` (cache) em todos os arquivos: hoje está `20261103c`.
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

## Tour: a parede só abre depois de ler o quadro (feito)

- Em cada quadro, o drone passa por 3 pontos (`ver[0..2]` em `montarPlacas`):
  1. chega no quadro;
  2. desliza devagar com a parede **fechada** por `TOUR_LER` (2 s), o tempo de ler;
  3. só então a parede abre (ou a casa perde a tinta, no quadro "Acabamento") e o drone recua devagar mostrando o miolo, por `TOUR_VER` (1,8 s).
- A parede fecha quando o drone sai do quadro (`tourAcoes.mostra`).
- Isso aumentou o tour em cerca de 1,8 s por quadro (6 quadros, perto de +11 s). Entra na decisão de duração abaixo: dá para baixar `TOUR_VER`.

## Decisão pendente com o cliente: duração do tour

Medido com o drone "de verdade":
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
- Dois testes falham **antes e depois** das texturas: o número do WhatsApp na calculadora e a imagem estática do "aparelho fraco". Investigar à parte.

## Outros pendentes

- **Vídeo para o Instagram (vender sites da VIBE CODING PROCESS):** aguardando o cliente escolher a voz (dele, uma voz de IA genérica ou um locutor contratado).
  - Não clonar a voz do Chris Rock nem do dublador: isso envolve direito de imagem e voz e é propaganda enganosa.
- **PR para o Netlify atualizar:** só abrir se o cliente pedir.

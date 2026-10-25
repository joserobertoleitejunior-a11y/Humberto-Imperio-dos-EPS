# Próxima sessão — onde estamos (Humberto Império dos EPS)

Leia isto primeiro. Depois, `MAPA-DO-SITE.md` explica o site inteiro.

**Regras do projeto (José — VIBE CODING PROCESS):**
- Mexer **só** neste repositório. Os outros (remop-retifica, San-comercio, Pizzaria) servem só de consulta.
- Branch: `claude/humberto-imperios-site-branding-ja9yt8`. Não abrir PR sem pedido.
- Antes de enviar: `npm run lint`, `npm test` e os testes E2E do Playwright com `--workers=1`.
- Depois de mudar JS/CSS, trocar o `?v=` (cache) em todos os arquivos: hoje está `20261103a`.
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

## Texturas realistas — FEITO (1ª versão)

- **Fotos:** CC0 da Poly Haven, 1K, convertidas para WebP em `assets/img/texturas/`. São 21 arquivos (≈ 0,9 MB), três por superfície: `-cor`, `-normal` e `-rugosidade`.

| Superfície | Arquivo | Foto original | Lado real |
|---|---|---|---|
| Blocão por fora e laje | `concreto` | concrete_floor_worn_001, clareada | 3 m |
| Paredes pintadas | `reboco` | painted_plaster_wall, clareada | 2 m |
| Piso de cima e escada | `madeira` | laminate_floor_02 | 1,7 m |
| Térreo (piso novo) | `porcelanato` | marble_01 | 1,5 m |
| Cobertura dentro da platibanda | `telha` | clay_roof_tiles_02 | 2,5 m |
| Base da maquete | `grama` | leafy_grass, puxada pro verde | 2 m |
| Alicerce, caminho e entrada do carro | `calcada` | concrete_pavement | 1,8 m |

- **Código** (`casa3d.js`, bloco "texturas realistas"):
  - `TEX_REAIS` guarda o lado real de cada foto.
  - `uvMetros()` põe a foto no tamanho real em qualquer peça.
  - `uvPorPosicao()` deixa a foto contínua de um bloco para o outro nos blocos e na pintura instanciados.
  - `carregarTexturasReais()` baixa as fotos quando a obra começa (`progresso > 0`).
  - `aplicarTexturasReais()` troca as fotos nos materiais, só com a tela parada.
- **Materiais novos:** `mats.porcelanato`, `mats.laje` e `mats.telha`. Até as fotos chegarem, ficam com a aparência antiga.
- **Aparelho fraco** (`data-qualidade="baixa"`): nada muda, ficam as texturas de canvas.
- **Corte do Blocão** (concreto | EPS | concreto, faces `ponta`/`topo`) e **bloco-guia:** continuam desenhados por código.
- **Ajuste fino com o cliente:** os tons ficam em `aplicarTexturasReais()` (campo `cor`) e a força do relevo no campo `relevo`. Exemplos: telha mais ou menos laranja, grama mais escura.
- **Ainda dá pra melhorar:** os móveis e o gramado em degradê em volta da casa (`casa-interior.js`) ainda são cor lisa.

**Testes:**
- Os E2E precisam de `CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --workers=1`: o navegador fixado pelo projeto não existe no ambiente novo.
- Dois testes falham **antes e depois** das texturas: o número do WhatsApp na calculadora e a imagem estática do "aparelho fraco". Investigar à parte.

## Outros pendentes

- **Vídeo para o Instagram (vender sites da VIBE CODING PROCESS):** aguardando o cliente escolher a voz (dele, uma voz de IA genérica ou um locutor contratado).
  - Não clonar a voz do Chris Rock nem do dublador: isso envolve direito de imagem e voz e é propaganda enganosa.
- **PR para o Netlify atualizar:** só abrir se o cliente pedir.

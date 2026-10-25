# Próxima sessão — onde estamos (Humberto Império dos EPS)

Leia isto primeiro. Depois, `MAPA-DO-SITE.md` explica o site inteiro.

**Regras do projeto (José — VIBE CODING PROCESS):**
- Mexer **só** neste repositório. Os outros (remop-retifica, San-comercio, Pizzaria) servem só de consulta.
- Branch: `claude/humberto-imperios-site-branding-ja9yt8`. Não abrir PR sem pedido.
- Antes de enviar: `npm run lint`, `npm test` e os testes E2E do Playwright com `--workers=1`.
- Depois de mudar JS/CSS, trocar o `?v=` (cache) em todos os arquivos: hoje está `20261102b`.
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

## Próximo pedido: texturas realistas

O cliente quer a maquete com aparência realista. Hoje as texturas são desenhadas por código (canvas) em `casa3d.js`: `texConcreto`, `texMadeira`, `texPonta` e `texSanduiche`. A grama e os móveis ficam em `casa-interior.js`.

Plano:
- Usar texturas CC0 de Poly Haven ou ambientCG, em 1K. De cada uma: cor, NormalGL e Roughness.
- Converter para WebP e salvar em `assets/img/texturas/`.
- Superfícies:
  - concreto (Blocão por fora e laje);
  - reboco pintado (paredes);
  - piso de madeira e porcelanato;
  - telha cerâmica;
  - grama;
  - calçada.
- Carregar só depois que a obra começar.
- Aparelho fraco (`data-qualidade="baixa"`) continua com as texturas de canvas.
- O corte do Blocão (concreto | EPS | concreto) continua desenhado por código.

O cliente já baixou as texturas e pode enviá-las no chat. O ambiente novo da sessão libera polyhaven/ambientcg na rede.

## Outros pendentes

- **Vídeo para o Instagram (vender sites da VIBE CODING PROCESS):** aguardando o cliente escolher a voz (dele, uma voz de IA genérica ou um locutor contratado).
  - Não clonar a voz do Chris Rock nem do dublador: isso envolve direito de imagem e voz e é propaganda enganosa.
- **PR para o Netlify atualizar:** só abrir se o cliente pedir.

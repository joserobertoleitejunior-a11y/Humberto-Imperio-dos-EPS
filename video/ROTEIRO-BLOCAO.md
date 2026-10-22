# Roteiro do vídeo — "Por que comprar o Blocão" (vídeo de PRODUTO / venda)

Formato Stories 1080×1920 · **~46 s, animado, tom de venda** · o celular mostra o **site de verdade rolando** e o Blocão 3D
se monta, se afasta e abre na própria rolagem. Diferente do tutorial (`index.html`, "Como orçar"): aqui o assunto
é o **produto e os motivos pra comprar**: o 3D mostra o que é, depois a pergunta "E por que comprar?" e os motivos numerados (os mesmos benefícios já publicados no site), espessuras e WhatsApp.
É o vídeo da tela de boas-vindas do site (`video/blocao.mp4`).

**Voz:** a mesma da Pizza em Dobro (Kokoro pt-BR "pm_santa", conferida na gravação da Pizza) no modo **animado**
(`ESTILO=animado`): velocidade 1,24, tom +4 %, presença 2–4 kHz e compressão firme; música a 100 bpm com bumbo.

> Regra de comunicação: o concreto **não descola** do EPS. As peças só se afastam **pra demonstrar**, e o vídeo diz isso.
> Benefícios = os mesmos textos já publicados no site/Instagram (nenhuma promessa técnica nova).

| # | Cena (o que o site mostra) | Legenda | Locução (escrita pra voz) |
|---|---|---|---|
| 1 | Abertura (splash) | Por que comprar o **Blocão?** | "Por que comprar o Blocão? Vem ver!" |
| 2 | Topo: o Blocão 3D | Concreto por fora, **miolo de EPS** | "Concreto por fora, com miolo de é, pê, ésse!" |
| 3 | Rola pro "Por dentro": as peças se afastam | Três camadas, **um bloco só** | "Três camadas, um bloco só!" |
| 4 | Etiquetas com as medidas | É só demonstração: na obra é **peça única** | "É só demonstração! Na obra, é peça única!" |
| 5 | Abre ao meio | EPS de **ponta a ponta** | "O é, pê, ésse vai de ponta a ponta!" |
| 6 | Seção "Por que Blocão" | E por que **comprar?** | "E por que comprar o Blocão?" |
| 7 | Benefício 01 | 1. Casa **mais fresca** | "Primeiro: casa mais fresca no verão!" |
| 8 | Benefício 02 | 2. Muito **menos barulho** | "Segundo: muito menos barulho!" |
| 9 | Benefício 03 | 3. A parede sobe **rapidinho** | "Terceiro: a parede sobe rapidinho!" |
| 10 | Benefício 04 | 4. Menos massa, sujeira e **mão de obra** | "Quarto: menos massa, menos sujeira e menos mão de obra!" |
| 11 | Benefício 05 | 5. Nada de **mofo** na parede | "Quinto: parede sem mofo!" |
| 12 | Benefício 06 | E ainda: leve e **resistente** | "E ainda por cima: leve e resistente!" |
| 13 | Ficha técnica: 10, 13, 15, 20 cm | **4 espessuras**: 10, 13, 15 e 20 cm | "Tem em quatro espessuras: dez, treze, quinze e vinte centímetros!" |
| 14 | WhatsApp: "quero um orçamento do Blocão" | Orçamento no **WhatsApp**! | "Orçamento direto no Uótsap!" |
| 15 | Cartão final | Construa com o Império | "Império do é, pê, ésse: a fábrica do Blocão!" |

Todas as falas foram geradas e transcritas de volta (Whisper) **com a música por baixo**; as que saíam erradas foram
trocadas ("São três camadas" → "Três camadas, um bloco só"; "Quatro espessuras" → "Tem em quatro espessuras";
"Concreto por fora, EPS por dentro" → "com miolo de é, pê, ésse"; "Sexto" (saía "cesto") → "E ainda por cima";
"Parede seca, sem mofo" → "Parede sem mofo"; "Peça/Faça seu orçamento" → "Orçamento direto no Uótsap"). Tabela de pronúncia completa: `ROTEIRO.md`.

## Como gerar de novo
```bash
npm run dev &                                                     # servidor na porta 8765
node scripts/exportar-roteiro.js blocao.html /tmp/rot-blocao.json
ESTILO=animado KOKORO_DIR=/tmp/tts/kokoro-multi-lang-v1_0 python3 scripts/gerar-audio-video.py /tmp/rot-blocao.json video/trilha-blocao.mp3
node scripts/renderizar-video.js blocao.html /tmp/bruto.mp4 <duração> video/trilha-blocao.mp3     # ~40 min
ffmpeg -i /tmp/bruto.mp4 -vf scale=720:1280 -c:v libx264 -crf 27 -movflags +faststart -c:a aac -b:a 96k video/blocao.mp4
```

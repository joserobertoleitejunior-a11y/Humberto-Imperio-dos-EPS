# Roteiro do vídeo — "Conheça o Blocão" (vídeo de PRODUTO)

Formato Stories 1080×1920 · **~42 s, animado** · o celular mostra o **site de verdade rolando** e o Blocão 3D
se monta, se afasta e abre na própria rolagem. Diferente do tutorial (`index.html`, "Como orçar"): aqui o assunto
é o **produto** (o que é, como é por dentro, benefícios, espessuras), não o uso do site.
É o vídeo da tela de boas-vindas do site (`video/blocao.mp4`).

**Voz:** a mesma da Pizza em Dobro (Kokoro pt-BR "pm_santa", conferida na gravação da Pizza) no modo **animado**
(`ESTILO=animado`): velocidade 1,24, tom +4 %, presença 2–4 kHz e compressão firme; música a 100 bpm com bumbo.

> Regra de comunicação: o concreto **não descola** do EPS. As peças só se afastam **pra demonstrar**, e o vídeo diz isso.
> Benefícios = os mesmos textos já publicados no site/Instagram (nenhuma promessa técnica nova).

| # | Cena (o que o site mostra) | Legenda | Locução (escrita pra voz) |
|---|---|---|---|
| 1 | Abertura (splash) | Já conhece o **Blocão?** | "Você já conhece o Blocão? Vem ver!" |
| 2 | Topo: o Blocão 3D | Concreto por fora, **miolo de EPS** | "Concreto por fora, com miolo de é, pê, ésse!" |
| 3 | Rola pro "Por dentro": as peças se afastam | Três camadas, **um bloco só** | "Olha só: três camadas num bloco só!" |
| 4 | Etiquetas com as medidas | É só demonstração: na obra é **peça única** | "É só demonstração! Na obra, é peça única!" |
| 5 | Abre ao meio | EPS de **ponta a ponta** | "O é, pê, ésse vai de ponta a ponta!" |
| 6 | Fichas na horizontal (curva do "L") | Cada camada, **sua medida** | "Cada camada com a sua medida!" |
| 7 | Benefício 01 (conforto térmico) | Casa **mais fresca** | "Casa mais fresca no verão!" |
| 8 | Benefício 02 (acústico) | Muito **menos barulho** | "E muito menos barulho!" |
| 9 | Benefício 03 (obra rápida) | A parede sobe **rapidinho** | "A parede sobe rapidinho!" |
| 10 | Benefício 04 (menos etapas) | Menos massa, **menos sujeira** | "Menos massa e menos sujeira!" |
| 11 | Benefício 06 (leve e resistente) | Leve e **resistente** | "Ele é leve e resistente!" |
| 12 | Ficha técnica: 10, 13, 15, 20 cm | **4 espessuras**: 10, 13, 15 e 20 cm | "Tem em quatro espessuras: dez, treze, quinze e vinte centímetros!" |
| 13 | WhatsApp: "quero um orçamento do Blocão" | Orçamento no **WhatsApp**! | "Peça seu orçamento no Uótsap!" |
| 14 | Cartão final | Construa com o Império | "Império do é, pê, ésse: a fábrica do Blocão!" |

Todas as falas foram geradas e transcritas de volta (Whisper) **com a música por baixo**; as que saíam erradas foram
trocadas ("São três camadas" → "Olha só: três camadas"; "Quatro espessuras" → "Tem em quatro espessuras";
"Concreto por fora, EPS por dentro" → "com miolo de é, pê, ésse"). Tabela de pronúncia completa: `ROTEIRO.md`.

## Como gerar de novo
```bash
npm run dev &                                                     # servidor na porta 8765
node scripts/exportar-roteiro.js blocao.html /tmp/rot-blocao.json
ESTILO=animado KOKORO_DIR=/tmp/tts/kokoro-multi-lang-v1_0 python3 scripts/gerar-audio-video.py /tmp/rot-blocao.json video/trilha-blocao.mp3
node scripts/renderizar-video.js blocao.html /tmp/bruto.mp4 <duração> video/trilha-blocao.mp3     # ~40 min
ffmpeg -i /tmp/bruto.mp4 -vf scale=720:1280 -c:v libx264 -crf 27 -movflags +faststart -c:a aac -b:a 96k video/blocao.mp4
```

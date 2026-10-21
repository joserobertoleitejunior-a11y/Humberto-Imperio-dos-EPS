# Roteiro do vídeo — "Sua obra em 1 minuto" (Império do EPS)

Formato Stories 1080×1920 · ~40 s · celular mostrando o **site de verdade** · música de fundo + locução.
Voz: **a mesma da Pizza em Dobro** (Kokoro pt-BR masculina "pm_santa", velocidade 1,15, mesmo tratamento: EQ leve, compressão e sala curta, música abaixa quando a voz fala).
Tom: animado, simples, de vizinho que entende de obra. Frases curtas. Nenhuma promessa técnica sem comprovação.

> Regra de comunicação: o concreto **não descola** do EPS. As peças só se afastam **pra demonstrar**, e o vídeo diz isso.

| # | Cena (tela) | Legenda na tela | Locução (como é lida) | Texto normal |
|---|---|---|---|---|
| 1 | Abertura (splash: bloco se monta + botões redondos) | Sua obra em **1 minuto** | "Sua obra em um minuto! Vem ver!" | Sua obra em um minuto! Vem ver! |
| 2 | Topo do site, bloco 3D girando | Conheça o **Blocão** | "Conheça o Blocão! Concreto por fora, **Épê-ésse** por dentro." | …EPS por dentro. |
| 3 | Rola: peças se afastam (vista demonstrativa) | Pra mostrar, **afastamos as peças** | "Pra você ver, a gente afasta as peças. Mas na obra, é um bloco só!" | (igual) |
| 4 | Bloco abre ao meio | Agora abre **ao meio** | "Agora, abre ao meio." | (igual) |
| 5 | Fichas andam na horizontal (espessura, medida, peso) | Cada peça com a **sua medida** | "Cada peça com a sua medida." | (igual) |
| 6 | Ficha do bloco real, peças se juntam | Na obra, é **um bloco só** | "Na obra, é um bloco só. Leve e forte!" | (igual) |
| 7 | Seção da calculadora | Agora, **calcule** sua obra | "Agora, calcule a sua obra!" | (igual) |
| 8 | Digitando 52 m × 2,80 m | Digite as **medidas** | "Digite as medidas da parede." | (igual) |
| 9 | WhatsApp recebendo a simulação | Chegou no **WhatsApp**! | "E o orçamento chega no **Uótsap** da fábrica!" | …no WhatsApp da fábrica! |
| 10 | Cartão final (marca + contato) | Construa com o Império | "Império do **Épê-ésse**. Construa com o Império!" | Império do EPS. Construa com o Império! |

## Grafia fonética (a voz neural lê "como escrito")
| Escreve | Pra soar |
|---|---|
| EPS | **Épê-ésse** |
| WhatsApp | **Uótsap** |
| Blocão | Blocão (lê certo) |
| números | por extenso ("um minuto"); nunca "52 m²" na fala |

## Como gerar de novo
```bash
# 1) baixar o modelo de voz uma vez (350 MB) e instalar o motor
curl -L -o k.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2
mkdir -p /tmp/tts && tar xjf k.tar.bz2 -C /tmp/tts && pip install sherpa-onnx scipy imageio-ffmpeg
# 2) roteiro → locução + música + tempos das cenas
npm run dev &                                              # servidor na porta 8765
node scripts/exportar-roteiro.js index.html /tmp/roteiro.json
KOKORO_DIR=/tmp/tts/kokoro-multi-lang-v1_0 python3 scripts/gerar-audio-video.py /tmp/roteiro.json video/trilha-como-orcar.mp3
# 3) gravar o vídeo quadro a quadro (~40 min) e comprimir pra 720p
node scripts/renderizar-video.js index.html /tmp/bruto.mp4 <duração> video/trilha-como-orcar.mp3
ffmpeg -i /tmp/bruto.mp4 -vf scale=720:1280 -c:v libx264 -crf 27 -movflags +faststart -c:a aac -b:a 96k video/como-orcar.mp4
```
Trocar a voz: `VOZ_SID=43` (pm_alex, masculina) ou `42` (pf_dora, feminina) · mais rápida/lenta: `VOZ_VEL=1.0`.
Trocar a música: `MUSICA=arquivo.mp3` (qualquer trilha livre de direitos).

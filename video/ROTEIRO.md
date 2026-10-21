# Roteiro do vídeo — "O Blocão em 30 segundos" (Império do EPS)

Formato Stories 1080×1920 · **~38 s, rápido e explicativo** · celular mostrando o **site de verdade rolando sem parar**
(igual ao "Como pedir" da Pizza em Dobro): a rolagem é o que monta, afasta e abre o Blocão 3D na tela.
Voz: **a mesma da Pizza em Dobro** (Kokoro pt-BR masculina "pm_santa", velocidade 1,15, EQ leve, compressão e sala curta; a música abaixa quando a voz fala).
Tom: animado, frases de 2 a 4 palavras (uma ideia por cena), nenhuma promessa técnica sem comprovação.

> Regra de comunicação: o concreto **não descola** do EPS. As peças só se afastam **pra demonstrar**, e o vídeo diz isso.

| # | Cena (o que o site faz) | Legenda | Locução (como é lida) | ~s |
|---|---|---|---|---|
| 1 | Abertura (splash: bloco se monta + botões redondos) | Parede pronta **rapidinho?** | "Parede pronta rapidinho? Vem ver!" | 3,5 |
| 2 | Topo: o Blocão 3D girando, leve rolagem | Esse é o **Blocão** | "Esse é o Blocão!" | 2,2 |
| 3 | Rola direto pro "Por dentro": as peças se afastam NA rolagem | Role e veja **por dentro** | "Role e veja por dentro!" | 2,5 |
| 4 | Continua rolando devagar, etiquetas com as medidas | Só demonstração: na obra é **peça única** | "Só demonstração! Na obra, é peça única." | 3,6 |
| 5 | O bloco abre ao meio | Abre **ao meio** | "Abre ao meio!" | 2,2 |
| 6 | Curva do "L": as fichas andam na horizontal | Cada peça, **sua medida** | "Cada peça, sua medida!" | 2,6 |
| 7 | Ficha do bloco real: as peças se juntam | Concreto + EPS: **um bloco só** | "Concreto e Épê-ésse: um bloco só!" | 2,7 |
| 8 | Rola até a calculadora | Calcule a **sua obra** | "Calcule a sua obra!" | 3,6 |
| 9 | Digita 52 m × 2,80 m e desce pro resultado | Digite as **medidas** | "Digite as medidas!" | 3,0 |
| 10 | WhatsApp recebendo a simulação | Orçamento no **WhatsApp**! | "Orçamento direto no **Uótsap**!" | 3,0 |
| 11 | Rola até o rodapé | Site por **Vibe Coding Process** | "Site feito pela **Váib Côudim Prócess**!" | 3,3 |
| 12 | Cartão final (marca + contato) | Construa com o Império | "Império do **Épê-ésse**. Construa com o Império!" | 5,5 |

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

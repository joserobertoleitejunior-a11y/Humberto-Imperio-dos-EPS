# Roteiro do vídeo — "Como orçar em 30 segundos" (Império do EPS)

Formato Stories 1080×1920 · **~38 s, rápido e explicativo** · celular mostrando o **site de verdade rolando sem parar**
(igual ao "Como pedir" da Pizza em Dobro): a rolagem é o que monta, afasta e abre o Blocão 3D na tela.
Voz: **a mesma da Pizza em Dobro** (Kokoro pt-BR masculina "pm_santa", velocidade 1,15, EQ leve, compressão e sala curta; a música abaixa quando a voz fala).
Tom: animado, frases de 2 a 4 palavras (uma ideia por cena), nenhuma promessa técnica sem comprovação.

> Regra de comunicação: o concreto **não descola** do EPS. As peças só se afastam **pra demonstrar**, e o vídeo diz isso.

| # | Cena (o que o site faz) | Legenda | Locução (como é escrita pra voz) | ~s |
|---|---|---|---|---|
| 1 | Abertura (splash: bloco se monta + botões redondos) | Parede pronta **rapidinho?** | "Quer parede pronta rapidinho? Vem ver!" | 3,9 |
| 2 | Topo: o Blocão 3D, leve rolagem | Conheça o nosso **Blocão** | "Conheça o nosso Blocão!" | 2,2 |
| 3 | Rola direto pro "Por dentro": as peças se afastam NA rolagem | Role e veja **por dentro** | "Role e veja por dentro!" | 2,5 |
| 4 | Continua rolando, etiquetas com as medidas | É só demonstração: na obra é **peça única** | "É só demonstração! Na obra, é peça única." | 3,8 |
| 5 | O bloco abre ao meio | Abre **ao meio** | "Abre ao meio!" | 2,2 |
| 6 | Curva do "L": as fichas andam na horizontal | Cada peça, **sua medida** | "Cada peça, sua medida!" | 2,6 |
| 7 | Ficha do bloco real: as peças se juntam | Concreto + EPS: **um bloco só** | "Concreto e é, pê, ésse: um bloco só!" | 2,7 |
| 8 | Rola até os campos da calculadora | Calcule a **sua obra** | "Calcule a sua obra!" | 3,6 |
| 9 | Digita 52 m × 2,80 m e desce pro resultado | Digite as **medidas** | "Agora, digite as medidas!" | 3,0 |
| 10 | WhatsApp recebendo a simulação | Orçamento no **WhatsApp**! | "Orçamento direto no Uótsap!" | 3,0 |
| 11 | Rola até o rodapé | Site por **Vibe Coding Process** | "Site feito pela Váib Côudim Prócess!" | 3,3 |
| 12 | Cartão final (marca + contato) | Construa com o Império | "Império do é, pê, ésse: a fábrica do Blocão!" | 4,9 |

## Pronúncia — testada com reconhecimento de voz (Whisper), com a música por baixo
A voz neural lê "como está escrito". Cada fala foi gerada e transcrita de volta; só ficou o que voltou certo.
| Escreve | Resultado | Por quê |
|---|---|---|
| **é, pê, ésse** (com vírgulas) | "EPS" ✅ | "Épê-ésse" e "EPS" saíam "APS" / "rapéia-se" |
| "Império do EPS" **no fim da frase** | "APS" ❌ | por isso o fecho é "Império do é, pê, ésse: **a fábrica do Blocão!**" |
| **Uótsap** | "WhatsApp" ✅ | |
| **Váib Côudim Prócess** | "Vibe Coding Process" ✅ | |
| "Esse é o Blocão!" / "Este é o Blocão!" | "e se o bloco" ❌ | trocado por **"Conheça o nosso Blocão!"** ✅ |
| "Só demonstração!" | "sua demonstração" ❌ | trocado por **"É só demonstração!"** ✅ |
| "Parede pronta rapidinho?" | "Parei de pronta…" ❌ | trocado por **"Quer parede pronta rapidinho?"** ✅ |

Voz confirmada pela gravação da Pizza em Dobro (comparação do envelope da fala): **pm_santa (VOZ_SID=44), velocidade 1,15**.

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

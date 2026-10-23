#!/usr/bin/env bash
# Grava um vídeo da pasta /video em trechos de 10 s (3 ao mesmo tempo) e junta com a música no fim.
# Trechos já prontos são pulados: se a máquina reiniciar, é só rodar de novo que continua de onde parou.
# Uso: scripts/gravar-por-trechos.sh blocao.html video/tempos-blocao.json video/trilha-blocao.mp3 PASTA SAIDA.mp4
set -u
PAG=$1; TEMPOS=$2; MUSICA=$3; DIR=$4; SAIDA=$5
PARALELO=${PARALELO:-3}; TAM=${TAM:-300}
mkdir -p "$DIR"
DUR=$(python3 -c "import json;print(json.load(open('$TEMPOS'))['dur'])")
TOTAL=$(python3 -c "print(round($DUR*30))")
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
n=0
for ((de=0; de<TOTAL; de+=TAM)); do
  ate=$((de+TAM)); nome=$(printf "%s/t%05d.mp4" "$DIR" "$de")
  [ -s "$nome.ok" ] && continue
  ( DE=$de ATE=$ate node scripts/renderizar-video.js "$PAG" "$nome" "$DUR" "" > "$nome.log" 2>&1 && echo ok > "$nome.ok"; echo "trecho $de-$ate $( [ -s "$nome.ok" ] && echo pronto || echo FALHOU)" ) &
  n=$((n+1)); if (( n % PARALELO == 0 )); then wait; fi
done
wait
for ((de=0; de<TOTAL; de+=TAM)); do nome=$(printf "%s/t%05d.mp4" "$DIR" "$de"); [ -s "$nome.ok" ] || { echo "FALTA $nome"; exit 1; }; echo "file '$(realpath "$nome")'"; done > "$DIR/lista.txt"
"$FF" -y -loglevel error -f concat -safe 0 -i "$DIR/lista.txt" -i "$MUSICA" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t "$DUR" -movflags +faststart "$SAIDA" && echo "FIM ok $SAIDA" || echo "FIM erro"

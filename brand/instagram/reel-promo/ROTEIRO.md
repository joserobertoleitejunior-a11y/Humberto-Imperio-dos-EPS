# Reel promocional "mini aula" — Império do EPS (29,5 s · 1080x1920 · sem áudio · legendas grandes)

## Roteiro (fala e legenda iguais)
| Tempo | Na tela | Fala |
|---|---|---|
| 0 - 2 s | Tijolos caem e a pilha some | Esquece o tijolo. |
| 2 - 4,5 s | O Blocão 3D aparece | A parede do futuro já existe. |
| 4,5 - 9 s | Foto real do corte da peça (1 · 2 · 3) | Se chama Blocão: concreto com isopor no meio. |
| 9 - 13 s | As 3 camadas separadas, com os nomes | Concreto, isopor, concreto. Um sanduíche de parede. |
| 13 - 18 s | Cartões: Concreto "dá a força" · Isopor "segura calor e barulho" | O concreto dá força. O isopor segura calor e barulho. |
| 18 - 22,5 s | Tour 3D da casa (quadro "Obra rápida") | E o bloco é leve: a parede sobe rápido. |
| 22,5 - 25,5 s | Peça real na fábrica | Feito aqui, em Itapetininga. |
| 25,5 - 29,5 s | Cartão final azul + WhatsApp | Quer na sua obra? Chama no WhatsApp. Império do É-Pê-Ésse. |

**Confirmar com o Vinicius:** "o isopor segura calor e barulho" e "o bloco é leve". Nenhum número de % ou °C.
**Não usar a voz do Chris nem de pessoa real.**

## Voz (ElevenLabs, Voice Design)
```
Homem brasileiro de uns 40 anos, locutor, voz natural de conversa, como alguém explicando algo para um amigo. Grave e calma, sem tom de propaganda, sem empostar a voz, sem exagerar na emoção. Respiração e pausas naturais, pequenas variações de ritmo, sorriso leve na voz. Sotaque do interior de São Paulo, suave.
```
Modelo Eleven v3 · Stability 30-40 · Similarity 70-75 · Style 0-15 · Speed 1.0. Gere uma linha por vez, 3 versões de cada, e escolha a mais natural:
```
Esquece o tijolo.

A parede do futuro... já existe.

Se chama Blocão: concreto, com isopor no meio.

Concreto, isopor, concreto. Um sanduíche de parede.

O concreto dá força. O isopor segura calor e barulho.

E o bloco é leve: a parede sobe rápido.

Feito aqui, em Itapetininga.

Quer na sua obra? Chama no WhatsApp. Império do É-Pê-Ésse.
```

## Música (Gemini, Criar música)
```
Crie uma música instrumental de 30 segundos para um Reels de construção civil. Groove funk animado e bem-humorado, 104 BPM, baixo marcado, guitarra curta, metais, bateria leve e palmas. Médios abertos, para a voz ficar por cima. Sem vocal. Começa com um impacto seco, termina numa batida final, sem fade.
```

Gerar o vídeo: node brand/scripts/gerar_reel_promo.js <quadros-3d> <video-da-peca-real.mp4> <saida.mp4>


## Versão "drone" (reel-drone-com-voz.mp4 · 54,5 s · com a voz)
Mesma narração e mesmas legendas, com o **tour do drone pela maquete** no miolo do vídeo e **tudo animado** (nada de foto parada):
- 0–3,6 s: **maquete de tijolo × maquete de Blocão**, casas de verdade montadas peça por peça em 3D (paredes com vãos, varanda com colunas, telhado de 4 águas, janelas com caixilho, porta, jardim). O tijolo sobe devagar (peça pequena), o Blocão sobe rápido.
- 3,6–10,6 s: o bloco gira e as 3 camadas se afastam nas palavras "concreto · isopor · concreto".
- 10,6–50,5 s: **tour do drone** pela casa pronta (capturado do próprio site, sem móveis: só paredes, janelas e portas), com cartões animados em SVG por cima: pesos caindo (força), raios de calor e ondas de som parando no isopor, gotas escorrendo (sem mofo), parede subindo + relógio girando (leve), tubo elétrico se desenhando e prateleira entrando (fixação), barras das 4 espessuras.
- 50,5–54,5 s: cartão final azul com o WhatsApp.
Fundo da página: verde-acinzentado `#C8D2C8` (escolha do cliente).

Gerar: `node brand/scripts/gerar_reel_drone.js <tempos.json> <audio.mp3> <pasta-quadros-do-tour> <saida.mp4>` (precisa do site servido em http://localhost:8765).
Capturar os quadros do tour: `node cap3dB.cjs <pasta> media 24 0.79 600 654 1.5 <k0> <k1>` com o site aberto em `?qualidade=media&semmoveis=1` (958 quadros ≈ 40 s de tour).

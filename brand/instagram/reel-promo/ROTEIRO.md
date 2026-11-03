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

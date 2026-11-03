# Reel promocional — Império do EPS (20,5 s · 1080×1920 · sem áudio, legendas grandes)

## Roteiro (fala e legenda iguais)
| Tempo | Na tela | Fala |
|---|---|---|
| 0 – 2 s | Tijolos caem e a pilha some | Esquece o tijolo. |
| 2 – 4,5 s | O Blocão 3D aparece e se abre | A parede do futuro já existe. |
| 4,5 – 8,5 s | Foto real do corte da peça (1 · 2 · 3) | Se chama Blocão. Concreto, isopor, concreto. |
| 8,5 – 13,5 s | Tour 3D da casa de Blocão | Obra rápida, casa que esquenta menos, e o barulho da rua fica lá fora. |
| 13,5 – 16,5 s | Peça real na fábrica | Feito aqui, em Itapetininga. |
| 16,5 – 20,5 s | Cartão final azul + WhatsApp | Quer na sua obra? Chama no WhatsApp. Império do É-Pê-Ésse. |

**Confirmar com o Vinicius:** "casa que esquenta menos" e "o barulho da rua fica lá fora". Nenhum número de % ou °C.
**Não usar a voz do Chris nem de pessoa real** (direito de voz e propaganda enganosa).

## Voz (ElevenLabs → Voice Design)
```
Homem brasileiro de uns 40 anos, locutor do interior de São Paulo, sotaque caipira suave e natural, sem caricatura. Voz grave e calma, séria e ao mesmo tempo descontraída, com um sorriso leve. Ritmo médio-rápido, dicção clara, sem tom de rádio e sem gritar.
```
Gere **uma linha por vez** (Stability 35–45, Speed 1.0, idioma Português do Brasil) e escolha a melhor de 2–3 versões:
```
Esquece o tijolo.

A parede do futuro já existe.

Se chama Blocão. Concreto, isopor, concreto.

Obra rápida, casa que esquenta menos, e o barulho da rua fica lá fora.

Feito aqui, em Itapetininga.

Quer na sua obra? Chama no WhatsApp. Império do É-Pê-Ésse.
```

## Música (Gemini → Criar música)
```
Crie uma música instrumental de 20 segundos para um Reels de construção civil. Groove funk animado e bem-humorado, 104 BPM, baixo marcado, guitarra curta, metais, bateria leve e palmas. Médios abertos, para a voz ficar por cima. Sem vocal. Começa com um impacto seco, termina numa batida final, sem fade.
```

Gerar o vídeo: `node brand/scripts/gerar_reel_promo.js <quadros-3d> <video-da-peca-real.mp4> <saida.mp4>`

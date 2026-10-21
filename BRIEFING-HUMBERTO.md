# BRIEFING — HUMBERTO IMPÉRIO DOS EPS
> Levantamento feito a partir dos prints do Instagram oficial (@humbertoimperioeps) enviados pelo José em 2026-10-21.
> Ler junto com `PADROES-AGENCIA.md`. Fase 1 = diagnóstico. Prints de concorrentes ainda vão chegar (fase 2).

---

## 1. Dados do negócio (o que já sabemos)

| Campo | Valor | Fonte |
|---|---|---|
| Dono | Vinicius | José |
| Nome no perfil | Humberto Império dos Eps | Instagram |
| Usuário | @humbertoimperioeps | Instagram |
| Nome nas artes | "Império do EPS" / "Império do EPS Soluções em EPS" / "Fábrica do Blokão" | posts |
| WhatsApp | (15) 99121-2917 | bio + artes |
| Cidade | Itapetininga-SP e região — "De BH para Itapetininga" | bio + artes |
| Facebook linkado | "Humberto Ribeiro" (perfil pessoal) | Instagram |
| Números do perfil | 9 posts · 1.052 seguidores · 2.069 seguindo | Instagram (09:46, 21/10) |
| Parceiros vistos | Alex Martins (arquitetura / design 3D), @arq.yasminallm, @arquitetura.alex | posts |
| Endereço, CNPJ, horário, e-mail | **não encontrados** | — |

## 2. O que vendem (pelos posts)

**Produto-âncora: BLOKÃO SANDUÍCHE** — bloco de concreto com miolo de EPS (isopor):

| Bloco | Composição (espessura final) |
|---|---|
| 10 cm | 2,5 cm concreto + 5 cm EPS + 2,5 cm concreto |
| 13 cm | 3,5 cm concreto + 6 cm EPS + 3,5 cm concreto |
| 15 cm | 3,5 cm concreto + 8 cm EPS + 3,5 cm concreto |
| 20 cm | 3,5 cm concreto + 13 cm EPS + 3,5 cm concreto |

**Linha de soluções em EPS:** fachadas · molduras · sancas · revestimentos de parede · forros · bancadas · laje · contrapiso · acabamento · isolamento térmico de laje e telhado (placas 5 cm).

**Promessas usadas hoje (validar com o Vinicius antes de publicar no site):**
- Casas 60% mais rápidas e econômicas
- Térmica · acústica · sem infiltração · não mofa
- Reduz até 8 °C dentro da casa · dispensa reboco · leve e rápido de instalar

**Leitura do negócio:** o cliente final troca uma montanha de tijolo + reboco por um bloco leve, resistente e isolante. O site vende **a obra mais rápida e mais fresca**, não "isopor". Público: quem vai construir/reformar (pessoa física), mestres de obra, arquitetos/engenheiros parceiros e loteamentos (ex.: Pacaembu).

## 3. Diagnóstico do Instagram atual (o que reformar)

1. **Nome em 4 versões** (Humberto Império dos Eps · Império do EPS · Império dos EPS · Fábrica do Blokão) → confunde busca e lembrança. Unificar.
2. **Duas identidades visuais brigando**: preto + dourado com coroa (catálogo) × azul-marinho + vermelho (catálogo técnico) × bege (capa/foto de perfil). Sem padrão de grade.
3. **Foto de perfil ilegível** — é um banner horizontal inteiro espremido no círculo.
4. **Bio sem endereço, sem área de atendimento clara e sem link de site** (só WhatsApp).
5. **Facebook aponta pra perfil pessoal**; botão "Meu Barco" (música) não vende nada.
6. **Seguindo (2.069) > seguidores (1.052)** — passa sensação de perfil "follow pra seguir de volta".
7. **Só 9 posts**, nenhum depoimento de cliente, nenhum antes/depois, nenhuma obra entregue com endereço/cidade.
8. Destaques bons mas sem capa padronizada (Blokão sanduíche · Molduras · Chegamos Itape).
9. Texto escrito em cima da foto torto/sem padrão; artes com texto cortado nas bordas.

## 4. Engenharia reversa dos repositórios da agência (só leitura — nada foi alterado neles)

| Vem de | O que reaproveitar | Adaptação pro Humberto |
|---|---|---|
| **San-comercio** (base principal) | Estrutura estática sem build, `config.js` único, lista de orçamento → WhatsApp, "Entrar com WhatsApp" (cadastro leve), `analytics.js` (páginas/cliques/buscas), Supabase com RLS "site só insere / painel lê", `admin.html` com Visão geral · Clientes · Orçamentos · Pesquisas · Tráfego + modo demonstração, splash em CSS puro, regras de desempenho e "sem rolagem lateral" | Lista de orçamento vira **Calculadora de obra** (m² de parede → nº de blocos por espessura → WhatsApp). Catálogo vira **Linha de produtos EPS** |
| **remop-retifica** | Ícones flutuantes de contato, página institucional + localização, texto institucional "lapidado", ideia do assistente (personagem) | Mascote opcional depois (ex.: "Blokão") |
| **Pizzaria-pizza-em-dobro** | Promoções/cupom gerenciados pelo painel (sem mexer em código), cadastro/ranking de clientes, testes `node --test`, Biome, Sentry | **Promoções e galeria editáveis pelo painel** (Supabase Storage) — item que ficou no backlog da San |
| Não trazer | Bot de WhatsApp/Evolution, Caixa/PDV, impressora, Firebase | Fora do escopo agora |

## 5. Escopo do site (proposta fase 1)

1. **Home / página de vendas** — hero com o Blokão em corte (camadas concreto/EPS/concreto animadas), promessa principal, CTA WhatsApp.
2. **Comparativo Blokão × tijolo comum** — tempo, peso, térmica, reboco (números só após validação).
3. **Calculadora de obra** — metragem → blocos por espessura → envia pedido de orçamento formatado pro WhatsApp (sem preço).
4. **Linha de produtos EPS** — blocos, sancas, molduras, fachadas, forros, laje, contrapiso, isolamento.
5. **Galeria de obras** (filtrável: obra / fachada / moldura / laje) — alimentada pelo painel.
6. **Promoções** (ex.: Loteamento Pacaembu) — com validade, alimentadas pelo painel.
7. **Parceiros** (arquitetos) + depoimentos.
8. **FAQ técnico** (é resistente? pega fogo? aguenta laje? precisa de reboco?).
9. **Cadastro do cliente** ("Entrar com WhatsApp") + **painel admin** (dashboard, clientes, orçamentos, promoções, galeria, tráfego).

## 6. Instagram — plano de reforma (proposta)

- **Nome de exibição:** `Império do EPS | Blokão Sanduíche` (palavra-chave pesquisável no nome).
- **@:** manter `@humbertoimperioeps` até o Vinicius decidir (trocar @ quebra links antigos) — sugestão: `@imperiodoeps`.
- **Bio (rascunho):**
  ```
  👑 Fábrica do Blokão Sanduíche em EPS
  🧱 Concreto + EPS: obra até 60% mais rápida
  ❄️ Térmico · acústico · sem reboco
  📍 Itapetininga-SP e região
  👇 Orçamento grátis no WhatsApp
  ```
- **Link:** site (com botão WhatsApp dentro) em vez de só WhatsApp. Facebook → página da empresa, não perfil pessoal.
- **Foto de perfil:** só o símbolo do novo logo (coroa + bloco), legível em 110 px.
- **Destaques padronizados:** Blokão · Obras · Fachadas & Molduras · Clientes · Promoções · Como funciona.
- **Grade:** 1 identidade (template de post, reels e stories) + calendário de 3 posts/semana (obra real · técnico · prova social).

## 7. Logotipo — direção (rascunho, fechar após ver concorrentes)

- Manter o que já tem reconhecimento: **coroa + "IMPÉRIO"**.
- Símbolo novo: coroa formada pelo **bloco em corte** (faixa clara EPS entre duas faixas de concreto) — conta o produto sem texto.
- Paleta proposta: grafite/concreto + dourado (realeza já usada) + branco EPS. Abandonar o azul+vermelho do catálogo técnico.
- Entregas: versão horizontal, vertical, símbolo isolado (avatar), monocromática, SVG vetorial.

## 8. Pendências com o cliente (Vinicius)

- [ ] **Nome oficial** da marca: "Império do EPS" ou "Império dos EPS"? Onde entra "Humberto"? (quem é Humberto Ribeiro na empresa?)
- [ ] Endereço da fábrica/showroom, CNPJ, horário, e-mail
- [ ] Confirmar números técnicos: "60% mais rápida", "reduz até 8 °C", resistência (MPa), peso por bloco, medidas (comprimento × altura)
- [ ] Faixa de preço / mínimo de pedido / se entrega e raio de entrega
- [ ] Fotos e vídeos originais em alta (obras, fábrica, equipe)
- [ ] Depoimentos de clientes (nome + cidade + foto da obra)
- [ ] Logo atual em arquivo (se existir) e acesso ao Instagram/Facebook pra reforma
- [ ] Domínio próprio (ex.: `imperiodoeps.com.br`)
- [ ] Prints dos concorrentes (fase 2 — José vai enviar)

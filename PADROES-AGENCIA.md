# PADRÕES-AGENCIA.md
### VIBE CODING PROCESS — arquivo mestre de padrões
> Criado por José. Define as regras fixas que **todo projeto novo** da agência segue, independente do cliente, do stack específico ou de qual agente/modelo de IA está executando o código.
>
> **Como usar**: cole este arquivo na raiz de todo projeto novo (`PADROES-AGENCIA.md`) e referencie ele no início de qualquer sessão de execução — humana ou de IA. É o "contrato" que qualquer agente deve respeitar sem precisar ser lembrado toda vez. Se um agente de IA sugerir algo que contradiz este arquivo, este arquivo vence.

---

## 0. Contexto do projeto (preencher a cada novo projeto)

```
Nome do projeto: HUMBERTO IMPÉRIO DOS EPS
Cliente: Vinicius (dono) — marca "Império do EPS" / perfil @humbertoimperioeps
Segmento: fábrica de blocos sanduíche (concreto + EPS + concreto) e soluções em EPS para construção civil
Cidade: Itapetininga-SP e região ("De BH para Itapetininga")
Tipo de projeto: página de vendas → WhatsApp + galeria + promoções + cadastro de cliente + dashboard/painel admin
Projeto-base: engenharia reversa de San-comercio (principal), Remop e Pizza em Dobro — SOMENTE LEITURA
Stack principal: site estático (HTML/CSS/JS puro, sem build) + Supabase (banco + auth do painel, RLS) + Netlify
Repositório: github.com/joserobertoleitejunior-a11y/Humberto-Imperio-dos-EPS
Ambiente de produção: Netlify (domínio próprio a definir)
Responsável técnico: José (VIBE CODING PROCESS)
Data de início: 2026-10-21
Briefing: BRIEFING-HUMBERTO.md
```

---

## 1. Governança de tarefa e versionamento

**Regra fixa**: toda tarefa — correção, melhoria ou funcionalidade nova — nasce como **Issue** antes de virar código. Nada é "só um ajuste rápido" sem rastro.

- Toda Issue é categorizada como `bug`, `melhoria` ou `feature`, com uma frase descrevendo o critério de pronto (o que precisa ser verdade pra Issue fechar).
- Todo Pull Request (ou commit, se o projeto não usar PR) **menciona a Issue correspondente** na descrição (ex: `Resolve #12`).
- **Padrão de commit**: `tipo(escopo): descrição curta` — ex: `fix(pedidos): corrige cálculo de frete no checkout`, `feat(whatsapp): adiciona webhook de status de mensagem`. Tipos aceitos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.
- Nenhum código entra na branch principal (`main`/`master`) direto — sempre via branch de trabalho (`feature/nome`, `fix/nome`) e PR, mesmo trabalhando sozinho. É o que permite reverter um erro sem reescrever tudo.
- **Definição de Pronto (Definition of Done)** de qualquer tarefa: código revisado (por você ou pela IA em modo crítico) + testado manualmente no mínimo + sem erro novo no Sentry + Issue referenciada e fechada.

**Por quê**: sem isso, cada bot/site vira um projeto órfão sem histórico — o padrão exato que fazia os bots anteriores não durarem: ninguém sabia o que tinha mudado da última vez que funcionava.

---

## 2. Padrão de motion e loading (toda interface, sem exceção)

**Regra fixa**: todo elemento de interface que muda de estado precisa comunicar isso visualmente. Não é decoração — é requisito de qualidade, igual "o botão precisa funcionar".

Aplicar em 100% das telas:
- **Skeleton loading** em qualquer conteúdo que carrega de uma API/banco (nunca tela em branco ou spinner genérico solto).
- **Lazy loading** de imagens e componentes fora da viewport inicial.
- **Animação suave de entrada/saída** em modais, listas, trocas de tela (respeitando `prefers-reduced-motion` do usuário — acessibilidade também é padrão, não exceção).
- **Feedback de progresso** em qualquer ação que leva mais de ~300ms (enviar pedido, salvar, upload) — botão precisa mostrar estado de carregando e ficar desabilitado, pra evitar duplo clique/pedido duplicado.
- **Estado de erro visível**: toda ação que pode falhar (rede, validação) tem um estado visual de erro, não só um console.log silencioso.

**Divisão de responsabilidade das libs** (padrão já validado):
- **GSAP + ScrollTrigger** → narrativa de scroll, transições de seção.
- **Anime.js** → microinterações leves (contadores, ícones reativos, feedback de clique).
- **Motion.dev** → interações com física real (swipe, inércia, modais com spring).
- **3D (Three.js, se aplicável)** → restrito a 1–2 momentos de destaque (hero), nunca espalhado pela interface inteira.

**Por quê**: restrição no visual pesado (3D/hero) + consistência no feedback leve (loading/transição) é o que separa um produto "profissional" de um "protótipo".

---

## 3. Observabilidade, qualidade de código e testes (requisito de nascença)

### 3.1 Observabilidade
- Erro em produção precisa ser visível **antes** do cliente reclamar.
- Ferramenta padrão: **Sentry** (captura de erro em tempo real, front e back).
- Se o stack usar Supabase Edge Functions: logar exceções explicitamente e conectar ao Sentry via SDK compatível — Edge Functions não capturam erro automaticamente como um servidor tradicional.
- Alerta configurado (e-mail ou similar) pra erro crítico — não adianta o erro estar no painel se ninguém olha o painel todo dia.
- Alternativas aceitáveis conforme o projeto: Datadog, New Relic, OpenTelemetry.

### 3.2 Qualidade e lint de código
- Lint automático rodando antes de qualquer merge (Biome é o padrão da agência para JS/TS).
- **Proibido por padrão**: `!important` em excesso, inline style descontrolado, função com mais de ~80 linhas sem quebrar em partes menores, event handler inline no HTML (`onclick="..."`).
- **Estrutura de arquivo**: nunca um único HTML/JS de milhares de linhas — separar por componente/módulo desde o primeiro commit, mesmo em projeto pequeno. Isso já foi identificado como dívida técnica grave em projeto anterior da agência — não repetir.

### 3.3 Testes
- Testes unitários nas funções críticas (cálculo de pedido, autenticação, regras de negócio).
- Teste de integração no que toca banco de dados (RLS, multi-tenant — crítico em qualquer projeto com `company_id`).
- Teste end-to-end no fluxo principal de conversão (ex: fazer um pedido do início ao fim). Ferramenta padrão: **Playwright**.
- Meta mínima: fluxo de pagamento/pedido nunca vai pra produção sem pelo menos um teste E2E cobrindo o caminho feliz.

**Por quê**: é a diferença entre descobrir que o bot caiu porque o cliente ligou reclamando, e descobrir porque o Sentry mandou um alerta 2 minutos antes.

---

## 4. Segurança (não negociável, checado antes de todo deploy)

- **Nenhuma chave de API, senha ou token no código-fonte.** Tudo em variável de ambiente (`.env`, nunca commitado — `.env` sempre no `.gitignore` desde o primeiro commit).
- Toda chave de API pública usada no frontend (ex: Google Maps) precisa ter **restrição de domínio** configurada no provedor — uma chave solta sem restrição é convite a abuso e custo inesperado.
- Todo banco multi-tenant (Supabase/Postgres) tem **Row Level Security (RLS) ativada em toda tabela**, sem exceção — nunca confiar só na lógica do frontend pra isolar dado de cliente.
- Toda tabela nova criada já nasce com política de RLS escrita junto, na mesma migration — nunca "depois eu configuro a segurança".
- Autenticação de rota administrativa (`/owner`, painel interno) separada da autenticação do cliente final, com verificação de papel (role) no backend, não só escondendo o link no frontend.
- Webhooks (Meta, Asaas, etc.) validam assinatura/origem da requisição antes de processar — nunca aceitar payload sem checar que veio de onde diz que veio.

**Por quê**: chave de API exposta e regra de banco não verificada já foram apontadas como falha real em projeto anterior da agência — isso é o item que mais rápido vira prejuízo financeiro ou vazamento de dado de cliente.

---

## 5. Acessibilidade e responsividade (requisito, não capricho)

- HTML semântico (`<header>`, `<nav>`, `<main>`, `<button>`) em vez de `<div>` genérica pra tudo — impacta SEO e acessibilidade ao mesmo tempo.
- Toda imagem com `alt` descritivo; todo ícone clicável sem texto visível tem `aria-label`.
- Todo formulário e fluxo interativo navegável por teclado, não só por toque/mouse.
- Media queries desde o primeiro layout — nunca desenhar só pra desktop e "depois adaptar pro celular". A maioria dos clientes finais (donos de loja) e dos usuários finais (quem compra) está no celular.
- Contraste de cor testado (mínimo AA de WCAG) — texto claro sobre fundo claro já foi problema real em projeto anterior.

**Por quê**: acessibilidade malfeita também é SEO malfeito e experiência ruim no celular — que é onde a agência e os clientes dela vivem.

---

## 6. Arquitetura multi-tenant (quando o projeto for SaaS interno da agência)

- Núcleo fixo (motor, lógica, automações) é construído **uma vez** e nunca reescrito por cliente.
- Camada de configuração por cliente (identidade visual, catálogo, número de WhatsApp, textos) é **dado**, não código novo.
- Todo módulo pago (ex: bot de WhatsApp, totem, NF-e) é ativável/desativável por cliente via flag (`company_modules` ou equivalente) — nunca um fork do projeto.
- Todo dado sensível de um cliente (WABA, credenciais externas) é dele — se ele sair da agência, ele sai com o histórico e os ativos dele. Isso é requisito de confiança, não só técnico.

*Não se aplica a este projeto (projeto único de cliente, não SaaS da agência).*

---

## 7. Deploy e rollback

- Deploy de produção nunca é manual "na mão" — passa por um pipeline (mesmo simples) que roda lint + teste antes de subir.
- Toda mudança em produção pode ser revertida em minutos: branch/tag da última versão estável sempre identificável.
- Migration de banco é sempre reversível ou testada em ambiente de staging antes de rodar em produção — nunca alterar schema direto na base de produção sem testar antes.
- Backup de banco configurado e testado (não só "existe backup", mas "já restauramos um backup pra confirmar que funciona") antes do primeiro cliente real usar o sistema.

**Status neste projeto**: pendente — pipeline (lint + teste) entra junto com o primeiro código.

---

## 8. Checklist de início de projeto

Antes de escrever a primeira linha de funcionalidade:

- [x] Repositório Git criado
- [x] Este arquivo copiado pra raiz, seção 0 preenchida
- [ ] `.env` / variáveis de ambiente (Netlify) — sem segredo no código
- [ ] Sentry plugado (front) — DSN a criar
- [ ] Lint (Biome) configurado
- [ ] RLS ativa em toda tabela do Supabase (schema nasce com as políticas)
- [ ] Testes iniciais (unitários das regras + E2E Playwright do fluxo "orçamento → WhatsApp")
- [x] Definido: projeto único de cliente (não SaaS)
- [ ] Painel admin com login próprio (Supabase Auth), separado do cadastro do cliente final
- [ ] Definido: quem tem acesso a produção (José / Vinicius)

---

## 9. SEO e crescimento orgânico (checklist por projeto com página pública)

Todo projeto com página voltada ao cliente final (não só ferramenta interna) passa por isso antes de considerar o SEO "pronto":

**Técnico (código — parte da entrega, não opcional):**
- [ ] `robots.txt` na raiz, bloqueando toda rota interna/administrativa (`Disallow`) e apontando pro `Sitemap:`
- [ ] `sitemap.xml` na raiz, listando só as URLs que fazem sentido pro Google indexar (não lista área interna nem página que exige login)
- [ ] `<title>` e `<meta name="description">` únicos e reais em toda página pública (nunca copiar o mesmo texto genérico em várias páginas)
- [ ] Open Graph completo (`og:title`, `og:description`, `og:type`, `og:url`, `og:image` com URL absoluta) + `twitter:card` — sem isso o link compartilhado no WhatsApp/Instagram aparece sem preview, o que pesa muito pra um negócio que vende por WhatsApp
- [ ] Dados estruturados Schema.org (`application/ld+json`) do tipo certo pro negócio (`Restaurant`, `LocalBusiness`, `Store`, etc.) — telefone, endereço, tipo de cozinha/produto, faixa de preço. Conecta com o Google Meu Negócio e habilita resultado rico na busca
- [ ] `rel="canonical"` e `<html lang="...">` corretos
- [ ] Nenhuma imagem grande embutida como base64 direto no HTML — sempre arquivo externo (cacheável, não infla o HTML a cada carregamento; se a mesma imagem aparece em várias páginas, extrair pra um arquivo só é ganho automático em todas)
- [ ] Vídeo/imagem de fundo pesado (>1MB) comprimido antes de ir pro ar

**Contas externas (ação do cliente/agência, não é código):**
- [ ] Google Search Console — conta criada, propriedade verificada, sitemap enviado
- [ ] Google Meu Negócio (Perfil da Empresa) — cadastrado e verificado (endereço, horário, fotos, categoria certa)
- [ ] Google Analytics (GA4) instalado — sem isso o cliente não sabe quantas pessoas visitam nem de onde vêm
- [ ] Domínio próprio (não subdomínio de plataforma tipo `.netlify.app`/`.vercel.app`) — pesa pra confiança do cliente final e pra ranqueamento
- [ ] Palavra-chave principal do negócio definida (com o cliente, não advinhada) — título, descrição e conteúdo da home devem mirar nela

**Status neste projeto**: tudo pendente — entra no primeiro deploy.

---

*Este arquivo é vivo — atualize conforme o VIBE CODING PROCESS evoluir. Toda mudança aqui deve refletir em todos os projetos ativos da agência, não só nos novos.*

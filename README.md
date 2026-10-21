# HUMBERTO IMPÉRIO DOS EPS — Página de vendas + painel

Projeto da agência **VIBE CODING PROCESS** para o Império do EPS (Itapetininga-SP),
fábrica do Blokão Sanduíche (concreto + EPS + concreto).
Construído por engenharia reversa da San Comércio (base), Remop e Pizza em Dobro.

- **Onde está cada coisa:** `MAPA-DO-SITE.md` ← comece por aqui
- **Regras da agência:** `PADROES-AGENCIA.md`
- **Cliente, concorrentes e pendências:** `BRIEFING-HUMBERTO.md`
- **Marca e reforma do Instagram:** `brand/INSTAGRAM.md` + `brand/logo/` + `brand/instagram/`

## Rodar localmente

```bash
npm run dev          # http://localhost:8765  (painel: /admin.html → "Ver demonstração")
npm test             # testes unitários (calculadora + métricas do painel)
npm run test:e2e     # Playwright: calculadora → WhatsApp, cadastro, painel, sem rolagem lateral
npm run lint         # Biome
```

## Publicação (Netlify)

Conectar o repositório na Netlify (publica a raiz). O `netlify.toml` roda `npm test`
antes de publicar: teste quebrado = deploy não sobe.
Ao ter domínio próprio, trocar a URL em `canonical`, `og:*`, JSON-LD, `robots.txt` e `sitemap.xml`.

## Ligar o banco (Supabase) — pendente

1. Criar projeto no Supabase (região `sa-east-1`).
2. SQL Editor → rodar `supabase/schema.sql` inteiro (tabelas, RLS, bucket `fotos`, papel admin).
3. Authentication → Users → criar o usuário do Vinicius (e-mail + senha forte).
4. Rodar a última linha do schema trocando `EMAIL_DO_VINICIUS` (dá o papel de admin).
5. Colar `url` e `anonKey` em `assets/js/config.js` → `supabase`.

Segurança: o site só **insere** cadastros/orçamentos/analytics e só **lê** promoções e fotos ativas.
Todo o resto é lido apenas por quem está na tabela `admins` (checado no banco por `is_admin()`).
Dados de clientes nunca ficam públicos (LGPD).

Enquanto o banco não estiver ligado: o site funciona 100% pelo WhatsApp e o painel abre em demonstração.

## Regenerar a marca

```bash
pip install fonttools
python3 brand/scripts/gerar_marca.py <pasta-com-Cinzel-e-Archivo-ttf>   # SVGs com texto em curvas
NODE_PATH=$(npm root -g) node brand/scripts/svg_para_png.js brand/instagram   # PNGs 1080
```

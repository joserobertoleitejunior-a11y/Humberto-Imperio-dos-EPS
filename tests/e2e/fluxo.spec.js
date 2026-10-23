// Fluxos principais (PADROES-AGENCIA.md §3.3). Rodar: npm run test:e2e
const { test, expect } = require("@playwright/test");

/** Abre a página já sem a tela de boas-vindas e pulando a splash com um toque. */
async function abrir(page, url = "/") {
  await page.addInitScript(() => { try { sessionStorage.setItem("imperio_bv", "1"); } catch (e) {} });
  await page.goto(url);
  await page.waitForFunction(() => window.ImperioAbertura);
  await page.evaluate(() => window.ImperioAbertura.fecharSplash());
  await expect(page.locator("#splash")).toBeHidden({ timeout: 10000 });
}

test("vídeo não carrega: a boas-vindas não aparece e o site abre direto", async ({ page }) => {
  await page.route("**/video/blocao.mp4", (rota) => rota.abort());
  await page.goto("/");
  await page.waitForFunction(() => window.ImperioAbertura);
  await page.evaluate(() => window.ImperioAbertura.fecharSplash());
  await expect(page.locator("#splash")).toBeHidden({ timeout: 10000 });
  await page.waitForTimeout(3000);
  await expect(page.locator("#boas-vindas")).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/travado/);
});

test("vídeo pronto: boas-vindas aparece e 'Calcular minha obra' leva pra calculadora", async ({ page }) => {
  // simula um vídeo que carrega (o Chromium do teste não decodifica H.264). O "preload" fica travado em "none":
  // senão o navegador tenta baixar o MP4 de verdade, dá erro antes da simulação e o site (certo) pula a boas-vindas
  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "preload", { get: () => "none", set: () => {}, configurable: true });
    HTMLMediaElement.prototype.load = function () { setTimeout(() => this.dispatchEvent(new Event("loadeddata")), 50); };
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  });
  await page.goto("/");
  await page.waitForFunction(() => window.ImperioAbertura);
  await page.evaluate(() => window.ImperioAbertura.fecharSplash());
  await expect(page.locator("#boas-vindas")).toBeVisible({ timeout: 10000 });
  await page.click('#boas-vindas [data-ir="#calculadora"]');
  await expect(page.locator("#boas-vindas")).toBeHidden();
  await expect(page.locator("#calculadora")).toBeInViewport({ timeout: 5000 });
});

test("splash: botão redondo 'Orçamento' fecha a splash e vai pra calculadora; 'Conhecer nosso produto' vai pro bloco", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('#splash [data-ir="#calculadora"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator("#splash .btn-redondo")).toHaveCount(2);
  const raio = await page.locator('#splash [data-ir="#calculadora"]').evaluate((e) => getComputedStyle(e).borderRadius);
  expect(parseFloat(raio)).toBeGreaterThan(30);
  await page.click('#splash [data-ir="#calculadora"]');
  await expect(page.locator("#splash")).toBeHidden({ timeout: 5000 });
  await expect(page.locator("#calculadora")).toBeInViewport({ timeout: 6000 });
  await expect(page.locator("#boas-vindas")).toBeHidden();
});

test("celular: botões ficam fora da área do bloco 3D", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await abrir(page, "/?qualidade=media");
  await page.waitForFunction(() => window.ImperioCena && window.ImperioCena.pronto(), null, { timeout: 30000 });
  await page.evaluate(() => {
    const j = document.querySelector("#por-dentro");
    const r = j.getBoundingClientRect();
    window.scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * 0.2 * window.ImperioMotion.jornada().fim, behavior: "instant" });
  });
  await expect.poll(async () => {
    const toque = await page.locator(".jornada__toque").boundingBox();
    const botoes = await page.locator(".ferramentas").boundingBox();
    return botoes.y - (toque.y + toque.height);
  }, { timeout: 10000 }).toBeGreaterThanOrEqual(-2);
});

test("calculadora monta a mensagem e abre o WhatsApp", async ({ page, context }) => {
  await context.route("https://wa.me/**", (rota) => rota.fulfill({ body: "ok" }));
  await abrir(page);
  await page.fill("[name=comprimento]", "40");
  await page.fill("[name=altura]", "2,8");
  await expect(page.locator("[data-calc-area]")).toHaveText("102,16", { timeout: 8000 });
  const [popup] = await Promise.all([context.waitForEvent("page"), page.click("[data-calc-enviar]")]);
  const url = decodeURIComponent(popup.url());
  expect(url).toContain("5515991212917");
  expect(url).toContain("102,16 m²");
  expect(url).toContain("Paredes: 40 m × 2,8 m");
});

test("cadastro do cliente valida WhatsApp e lembra o nome", async ({ page }) => {
  await abrir(page);
  await page.click(".botao-entrar");
  await page.fill("#entrar-nome", "Maria Teste");
  await page.fill("#entrar-whatsapp", "1599");
  await page.check("#entrar-aceite");
  await page.click("[data-form-entrar] button[type=submit]");
  await expect(page.locator("[data-entrar-status]")).toContainText("DDD");
  await page.fill("#entrar-whatsapp", "15999998888");
  await page.click("[data-form-entrar] button[type=submit]");
  await expect(page.locator(".botao-entrar")).toHaveAttribute("data-logado", "true");
});

test("bloco 3D carrega e a jornada em L anda na horizontal", async ({ page }) => {
  await abrir(page, "/?qualidade=media");
  await page.waitForFunction(() => window.ImperioCena && window.ImperioCena.pronto(), null, { timeout: 30000 });
  await expect(page.locator("canvas.palco3d")).toHaveCount(1);
  const x = await page.evaluate(() => {
    const j = document.querySelector("#por-dentro");
    const r = j.getBoundingClientRect();
    window.scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * 0.9 * window.ImperioMotion.jornada().fim, behavior: "instant" });
    window.ImperioMotion.atualizarAgora();
    return new DOMMatrix(getComputedStyle(document.querySelector("[data-jornada-h]")).transform).m41;
  });
  expect(x).toBeLessThan(-100);
});

test("cliente mexe nas peças com o dedo e a rolagem põe tudo no lugar", async ({ page }) => {
  await abrir(page, "/?qualidade=media");
  await page.waitForFunction(() => window.ImperioCena && window.ImperioCena.pronto(), null, { timeout: 30000 });
  await page.evaluate(() => {
    const j = document.querySelector("#por-dentro");
    const r = j.getBoundingClientRect();
    window.scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * 0.2 * window.ImperioMotion.jornada().fim, behavior: "instant" });
  });
  await page.waitForTimeout(800);
  const box = await page.locator(".jornada__toque").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.click('[data-filtro-peca="eps"]');
  await expect(page.locator('[data-filtro-peca="eps"]')).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.ImperioBloco3D.interacao.mexido())).toBe(true);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.ImperioBloco3D.interacao.mexido())).toBe(false);
  await expect(page.locator('[data-filtro-peca="tudo"]')).toHaveAttribute("aria-pressed", "true");
});

test("fichas andam na horizontal com o gesto lateral (trackpad) e o aviso 'arraste' não existe mais", async ({ page }) => {
  await abrir(page, "/?qualidade=baixa");
  await page.waitForFunction(() => window.ImperioMotion);
  await expect(page.locator(".dica-toque")).toHaveCount(0);
  await page.evaluate(() => {
    const j = document.querySelector("#por-dentro");
    const r = j.getBoundingClientRect();
    window.scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * 0.55 * window.ImperioMotion.jornada().fim, behavior: "instant" });
  });
  await page.waitForTimeout(600);
  const x = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("[data-jornada-h]")).transform).m41);
  const antes = await x();
  await page.mouse.move(700, 700);
  await page.mouse.wheel(200, 0);
  await expect.poll(x).toBeLessThan(antes - 100);
});

test("atalhos flutuantes: WhatsApp, Instagram, Local, Google e Ligar com links certos; Facebook some sem página", async ({ page }) => {
  await abrir(page);
  const href = (nome) => page.locator(`.atalho[aria-label="${nome}"]`).getAttribute("href");
  expect(await href("WhatsApp")).toContain("wa.me/5515991212917");
  expect(await href("Instagram")).toContain("instagram.com/humbertoimperioeps");
  expect(await href("Local no mapa")).toContain("google.com/maps");
  expect(await href("Google")).toContain("google.com/search");
  expect(await href("Ligar")).toBe("tel:+5515991212917");
  await expect(page.locator('.atalho[aria-label="Facebook"]')).toBeHidden();
});

test("aparelho fraco / economia de dados: sem 3D, imagens prontas", async ({ page }) => {
  await abrir(page, "/?qualidade=estatica");
  await page.waitForTimeout(1500);
  await expect(page.locator("canvas.palco3d")).toHaveCount(0);
  await expect(page.locator(".jornada__estatico")).toBeVisible();
});

test("painel abre em demonstração", async ({ page }) => {
  await page.goto("/admin.html");
  await page.click("[data-entrar-demo]");
  await expect(page.locator("[data-kpis] .kpi")).toHaveCount(6);
});

test("sem rolagem lateral no celular", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const url of ["/", "/admin.html"]) {
    await page.goto(url);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
});

test("casa de Blocão: na mesma tela do bloco, a rolagem assenta os blocos e no fim aparece o botão", async ({ page }) => {
  await abrir(page);
  await page.evaluate(() => { const j = document.querySelector("#por-dentro"); scrollTo({ top: j.offsetTop, behavior: "instant" }); });
  await expect(page.locator("[data-casa]")).toHaveClass(/casa--3d/, { timeout: 60000 });
  // fração da fase da casa (depois do "L"), dentro da MESMA seção
  const rolar = (f) => page.evaluate((f) => {
    const el = document.querySelector("#por-dentro"); const j = window.ImperioMotion.jornada();
    scrollTo({ top: el.offsetTop + (j.fim + f * (1 - j.fim)) * (el.offsetHeight - innerHeight), behavior: "instant" });
  }, f);
  await rolar(0.3);
  await expect(page.locator("html")).toHaveClass(/fase-casa/);
  await expect(page.locator(".jornada__h")).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.ImperioCasa3D.blocos().assentados), { timeout: 15000 }).toBeGreaterThan(0);
  await rolar(1);
  await expect.poll(() => page.evaluate(() => { const b = window.ImperioCasa3D.blocos(); return b.assentados === b.total; }), { timeout: 15000 }).toBe(true);
  await expect(page.locator(".casa__cta")).toBeVisible();
  await expect(page.locator("[data-casa-contador]")).not.toHaveText("0");
  // voltar pro "L": as fichas reaparecem
  await page.evaluate(() => { const el = document.querySelector("#por-dentro"); const j = window.ImperioMotion.jornada(); scrollTo({ top: el.offsetTop + 0.9 * j.fim * (el.offsetHeight - innerHeight), behavior: "instant" }); });
  await expect(page.locator("html")).not.toHaveClass(/fase-casa/);
});

test("casa de Blocão sem 3D (estatica): imagem pronta e etapas em lista", async ({ page }) => {
  await abrir(page, "/?qualidade=estatica");
  await expect(page.locator("[data-casa]")).toHaveClass(/casa--sem3d/);
  await expect(page.locator(".casa__estatica")).toBeVisible();
  await expect(page.locator("[data-casa] [data-etapa]")).toHaveCount(6);
});

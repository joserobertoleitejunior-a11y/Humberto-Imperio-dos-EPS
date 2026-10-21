// Fluxos principais (PADROES-AGENCIA.md §3.3). Rodar: npm run test:e2e
const { test, expect } = require("@playwright/test");

/** Abre a página já sem a tela de boas-vindas e pulando a splash com um toque. */
async function abrir(page, url = "/") {
  await page.addInitScript(() => { try { sessionStorage.setItem("imperio_bv", "1"); } catch (e) {} });
  await page.goto(url);
  const splash = page.locator("#splash");
  if (await splash.isVisible()) await splash.click();
  await expect(splash).toBeHidden();
}

test("splash fecha sozinha e a boas-vindas leva pra calculadora", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#boas-vindas")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#splash")).toBeHidden();
  await page.click("[data-bv-calcular]");
  await expect(page.locator("#boas-vindas")).toBeHidden();
  await expect(page.locator("#calculadora")).toBeInViewport({ timeout: 4000 });
});

test("calculadora monta a mensagem e abre o WhatsApp", async ({ page, context }) => {
  await context.route("https://wa.me/**", (rota) => rota.fulfill({ body: "ok" }));
  await abrir(page);
  await page.fill("[name=comprimento]", "40");
  await page.fill("[name=altura]", "2,8");
  await expect(page.locator("[data-calc-area]")).toHaveText("102,16", { timeout: 3000 });
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
    window.scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * 0.9, behavior: "instant" });
    window.ImperioMotion.atualizarAgora();
    return new DOMMatrix(getComputedStyle(document.querySelector("[data-jornada-h]")).transform).m41;
  });
  expect(x).toBeLessThan(-100);
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

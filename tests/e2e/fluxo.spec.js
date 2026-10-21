// Fluxo principal de conversão (PADROES-AGENCIA.md §3.3): calculadora → WhatsApp.
// Rodar: npm run test:e2e  (sobe um servidor estático na porta 8765)
const { test, expect } = require("@playwright/test");

test("calculadora monta a mensagem e abre o WhatsApp", async ({ page, context }) => {
  await context.route("https://wa.me/**", (rota) => rota.fulfill({ body: "ok" }));
  await page.goto("/");
  await page.fill("[name=comprimento]", "40");
  await page.fill("[name=altura]", "2,8");
  await expect(page.locator("[data-calc-area]")).toHaveText("102,16", { timeout: 3000 });
  const [popup] = await Promise.all([context.waitForEvent("page"), page.click("[data-calc-enviar]")]);
  const url = decodeURIComponent(popup.url());
  expect(url).toContain("5515991212917");
  expect(url).toContain("102,16 m²");
});

test("cadastro do cliente valida WhatsApp e lembra o nome", async ({ page }) => {
  await page.goto("/");
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

test("painel abre em demonstração", async ({ page }) => {
  await page.goto("/admin.html");
  await page.click("[data-entrar-demo]");
  await expect(page.locator("[data-kpis] .kpi")).toHaveCount(6);
});

test("sem rolagem lateral no celular", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const url of ["/", "/admin.html"]) {
    await page.goto(url);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
});

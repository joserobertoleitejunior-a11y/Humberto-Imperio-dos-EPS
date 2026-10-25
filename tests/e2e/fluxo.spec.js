// Fluxos principais (PADROES-AGENCIA.md §3.3). Rodar: npm run test:e2e
const { test, expect } = require("@playwright/test");

/** Abre a página (o site abre direto: sem splash e sem tela de vídeo antes). */
async function abrir(page, url = "/") {
  await page.goto(url);
}

test("abre direto no site: sem splash e sem tela de vídeo, já no topo", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#splash")).toHaveCount(0);
  await expect(page.locator("#boas-vindas")).toHaveCount(0);
  await expect(page.locator(".hero__titulo")).toBeInViewport({ timeout: 5000 });
  await expect(page.locator("body")).not.toHaveClass(/travado/);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(80);
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

test("celular: sem zoom (pinça/toque duplo) e o site no tamanho exato da tela", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.getAttribute('meta[name="viewport"]', "content")).toContain("user-scalable=no");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)).toBe("pan-x pan-y");
  // Ctrl + roda (pinça no touchpad) é barrada
  expect(await page.evaluate(() => !window.dispatchEvent(new WheelEvent("wheel", { ctrlKey: true, cancelable: true, deltaY: -10 })))).toBe(true);
  // pinça com 2 dedos (touchstart/touchmove) e o gesto do iPhone são barrados — também no painel
  for (const url of ["/", "/admin.html"]) {
    await page.goto(url);
    const barrados = await page.evaluate(() => {
      const t = (id, x) => new Touch({ identifier: id, target: document.body, clientX: x, clientY: 300 });
      const dois = [t(1, 100), t(2, 200)];
      const ini = !document.body.dispatchEvent(new TouchEvent("touchstart", { touches: dois, cancelable: true, bubbles: true }));
      const mov = !document.body.dispatchEvent(new TouchEvent("touchmove", { touches: dois, cancelable: true, bubbles: true }));
      const ges = !document.dispatchEvent(new Event("gesturestart", { cancelable: true }));
      return [ini, mov, ges, getComputedStyle(document.documentElement).touchAction, document.querySelector('meta[name="viewport"]').content.includes("user-scalable=no")];
    });
    expect(barrados).toEqual([true, true, true, "pan-x pan-y", true]);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("celular: barra de endereço aparecendo/sumindo não mexe na altura da tela fixa (a casa não pula quando a rolagem para)", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto("/");
  const antes = await page.evaluate(() => [getComputedStyle(document.documentElement).getPropertyValue("--vh"), document.querySelector("#por-dentro").offsetHeight]);
  await page.setViewportSize({ width: 390, height: 744 }); // a barra some: +80 px
  await page.waitForTimeout(200);
  const depois = await page.evaluate(() => [getComputedStyle(document.documentElement).getPropertyValue("--vh"), document.querySelector("#por-dentro").offsetHeight]);
  expect(depois).toEqual(antes);
  await page.setViewportSize({ width: 664, height: 390 }); // girou o aparelho: aí sim recalcula
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--vh"))).not.toBe(antes[0]);
  await ctx.close();
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
  test.setTimeout(200000); // monta 3 casas, entra e sai de uma (WebGL por software nos testes)
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
  const caixaP = await page.locator("[data-casa-palco]").boundingBox();
  const cx = { x: caixaP.x + caixaP.width * 0.6, y: caixaP.y + caixaP.height * 0.55 };
  // maquete pronta = o tour do drone começa SOZINHO (sem clique): entra na casa e as 6 vantagens estão em quadros nas paredes
  await expect.poll(() => page.evaluate(() => window.ImperioCasa3D.emTourPontos()), { timeout: 15000 }).toBe(true);
  expect(await page.evaluate(() => window.ImperioCasa3D.placasTour())).toBe(6);
  await expect(page.locator("[data-casa] button:not([data-casa-tipo])")).toHaveCount(0); // nenhum botão na maquete
  // o dedo gira a vista sem parar o drone
  await page.mouse.move(cx.x, cx.y);
  await page.mouse.down();
  await page.mouse.move(cx.x - 140, cx.y, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.ImperioCasa3D.olharTour())).not.toBe(0);
  expect(await page.evaluate(() => window.ImperioCasa3D.corteAberto())).toBe(0); // o tour não abre parede
  expect(await page.evaluate(() => window.ImperioCasa3D.emTourPontos())).toBe(true);
  // termina sozinho com a chamada pra comprar, e o site continua (tour ≈ 31 s: duração em decisão com o cliente)
  await expect.poll(() => page.evaluate(() => window.ImperioCasa3D.emTourPontos()), { timeout: 80000 }).toBe(false);
  await expect(page.locator("[data-casa-vantagem]")).toContainText("Gostou?");
  await expect(page.locator(".casa__cta")).toBeVisible();
  await expect(page.locator("[data-casa-contador]")).not.toHaveText("0");
  // tocar na maquete depois do tour: a chamada sai e voltam os tipos de casa
  await page.mouse.click(cx.x, cx.y);
  await expect(page.locator("[data-casa]")).not.toHaveClass(/casa--fimtour/);
  await expect(page.locator('[data-casa-tipo="simples"]')).toBeInViewport();
  // os 3 tipos: casa simples (térrea, 5 etapas), casa média e casarão — cada um com o seu total de blocos
  const totais = {};
  for (const tipo of ["simples", "media", "casarao"]) {
    await page.click(`[data-casa-tipo="${tipo}"]`);
    await expect(page.locator(`[data-casa-tipo="${tipo}"]`)).toHaveAttribute("aria-pressed", "true");
    totais[tipo] = await page.evaluate(() => window.ImperioCasa3D.blocos().total);
  }
  expect(totais.simples).toBeLessThan(totais.media);
  expect(totais.media).toBeLessThan(totais.casarao);
  await expect(page.locator("[data-casa] [data-etapa]")).toHaveCount(6);
  await page.click('[data-casa-tipo="simples"]');
  await expect(page.locator("[data-casa] [data-etapa]")).toHaveCount(5);
  await expect(page.locator("[data-casa-ficha]")).toContainText("49 m²");
  // casa completa na tela: o dedo na vertical continua rolando a página (nada prende a rolagem)
  await expect(page.locator("[data-casa]")).toHaveClass(/casa--maquete/);
  expect(await page.locator("[data-casa-palco]").evaluate((e) => getComputedStyle(e).touchAction)).toBe("pan-y");
  // rolar durante o tour: a página rola (não trava) e o drone para
  expect(await page.evaluate(() => window.ImperioCasa3D.tourPontos())).toBe(true);
  const yTour = await page.evaluate(() => scrollY);
  await page.mouse.move(cx.x, cx.y);
  await page.mouse.wheel(0, -900);
  await expect.poll(() => page.evaluate(() => scrollY)).not.toBe(yTour);
  await expect.poll(() => page.evaluate(() => window.ImperioCasa3D.emTourPontos())).toBe(false);
  await rolar(1);
  await page.waitForTimeout(1500); // a câmera termina de voltar pra maquete
  // texturas realistas (fotos) chegaram
  expect(await page.evaluate(() => window.ImperioCasa3D.texturas())).toBeGreaterThan(0);
  // paredes internas (também de Blocão) em todas as casas
  expect(await page.evaluate(() => window.ImperioCasa3D.internas())).toBeGreaterThan(0);
  // arrastar pro lado gira a casa (e não tira parede)
  const antesGiro = await page.evaluate(() => window.ImperioCasa3D.giro());
  await page.mouse.move(cx.x, cx.y);
  await page.mouse.down();
  await page.mouse.move(cx.x - 160, cx.y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.ImperioCasa3D.giro())).not.toBe(antesGiro);
  await expect(page.locator("[data-casa]")).not.toHaveClass(/casa--dentro/);
  await expect(page.locator("[data-casa] button:not([data-casa-tipo])")).toHaveCount(0);
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

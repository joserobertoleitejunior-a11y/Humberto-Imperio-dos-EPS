#!/usr/bin/env node
/**
 * Gera as peças do Facebook em brand/facebook/ a partir dos modelos HTML (mesmo estilo do site):
 *   capa.png (1640 × 624) · perfil.png (720 × 720) · moldura-<formato>.png (transparente no lugar da foto)
 *   · exemplo-<formato>.jpg (a moldura com uma foto de obra, pra ver como fica)
 *   node brand/scripts/gerar_facebook.js
 */
const path = require("node:path");
const { RAIZ, servir, abrirNavegador } = require("./navegador.js");

const PASTA = path.join(RAIZ, "brand/facebook");
const FORMATOS = ["quadrado", "retrato", "vertical", "paisagem"];

(async () => {
  const srv = await servir();
  const base = `http://127.0.0.1:${srv.address().port}/brand/facebook`;
  const navegador = await abrirNavegador();
  const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1920 } });
  try {
    for (const peca of ["capa", "perfil"]) {
      await pagina.goto(`${base}/capa.html?peca=${peca}`);
      await pagina.evaluate(() => window.pecaPronta);
      await pagina.locator(`#${peca}`).screenshot({ path: path.join(PASTA, `${peca}.png`) });
      console.log(`✔ ${peca}.png`);
    }
    for (const formato of FORMATOS) {
      await pagina.goto(`${base}/moldura.html?formato=${formato}`);
      await pagina.evaluate(() => window.molduraPronta);
      await pagina.locator("#arte").screenshot({ path: path.join(PASTA, `moldura-${formato}.png`), omitBackground: true });
      const titulo = formato === "paisagem" ? "" : "&sobre=Obra%20real&titulo=" + encodeURIComponent("Parede de Blocão *subindo* na obra");
      await pagina.goto(`${base}/moldura.html?formato=${formato}&exemplo=1${titulo}`);
      await pagina.evaluate(() => window.molduraPronta);
      await pagina.locator("#arte").screenshot({ path: path.join(PASTA, `exemplo-${formato}.jpg`), type: "jpeg", quality: 88 });
      console.log(`✔ moldura-${formato}.png · exemplo-${formato}.jpg`);
    }
  } finally {
    await navegador.close();
    srv.close();
  }
})().catch((e) => { console.error(`✘ ${e.message}`); process.exit(1); });

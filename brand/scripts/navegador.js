/** Peças comuns dos scripts de arte (emoldurar.js, gerar_facebook.js): servidor local do site + Chromium. */
const { chromium } = require("playwright");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "../.."); // raiz do site (as artes usam a fonte e a marca do site)

/** servidor local da pasta do site (a fonte não carrega por file://) */
function servir() {
  const tipos = { ".html": "text/html", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".js": "text/javascript" };
  const srv = http.createServer((req, res) => {
    const alvo = path.join(RAIZ, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!alvo.startsWith(RAIZ) || !fs.existsSync(alvo)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": tipos[path.extname(alvo)] || "application/octet-stream" });
    fs.createReadStream(alvo).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

/** Chromium do Playwright; sem ele, o do CHROMIUM_PATH (igual aos testes) ou o já instalado na máquina */
async function abrirNavegador() {
  const caminhos = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].filter(Boolean);
  if (!process.env.CHROMIUM_PATH) {
    try { return await chromium.launch(); } catch (e) { if (!caminhos.length) throw e; }
  }
  return chromium.launch({ executablePath: caminhos[0] });
}

module.exports = { RAIZ, servir, abrirNavegador };

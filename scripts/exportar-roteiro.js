// Lê a configuração de um vídeo (video/*.html) e grava o roteiro (cenas e falas) em JSON para scripts/gerar-audio-video.py.
// Uso: node scripts/exportar-roteiro.js promocoes.html roteiro.json [porta]
const { chromium } = require('playwright');
const [, , pagina, saida, porta = '8765'] = process.argv;
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto(`http://localhost:${porta}/video/${pagina}?gravar`);
  await p.waitForFunction('window.__cfg');
  const cfg = await p.evaluate('window.__cfg');
  const cenas = cfg.cenas.map(c => ({ id: c.id, fala: c.fala, min: c.min || 0, fim: !!c.fim }));
  require('fs').writeFileSync(saida, JSON.stringify({ tempos: cfg.tempos, cenas }, null, 1));
  console.log(cenas.length, 'cenas →', saida);
  await b.close();
})();

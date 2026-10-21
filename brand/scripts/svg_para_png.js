const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
(async () => {
  const b = await chromium.launch();
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    let w = +vb[1], h = +vb[2]; const k = Math.max(1, 1080 / Math.min(w, h)); w = Math.round(w*k); h = Math.round(h*k);
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<body style="margin:0"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:${w}px;height:${h}px;display:block"></body>`);
    await p.screenshot({ path: path.join(dir, f.replace('.svg', '.png')), omitBackground: true });
    await p.close();
  }
  await b.close();
})();

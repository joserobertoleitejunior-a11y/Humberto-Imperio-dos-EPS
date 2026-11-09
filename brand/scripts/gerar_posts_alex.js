/* Peças do parceiro (Alex Martins Arquitetura) refeitas no NOSSO padrão: fundo cal, grafite e azul técnico, Archivo.
 * Só o logotipo do Alex foi mantido (brand/instagram/alex/logo-alex-martins.png); a marca do Império é a nossa.
 * Números de marketing da arte original (até 60 %, até 70 %, "menor custo") ficaram de fora até o Vinicius confirmar.
 * Uso: node brand/scripts/gerar_posts_alex.js */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const RAIZ = path.resolve(__dirname, "../..");
const OUT = path.join(RAIZ, "brand/instagram/alex");
const SRC = path.join(OUT, "src");
fs.mkdirSync(SRC, { recursive: true });
const A = (p) => path.relative(SRC, path.join(RAIZ, p));
const WHATS = "(15) 99121-2917";

const BASE = `
@font-face { font-family: Archivo; src: url("${A("assets/fonts/archivo-latin.woff2")}") format("woff2"); font-weight: 400 900; font-stretch: 62% 125%; }
:root { --cal:#F3F1EC; --cal2:#EAE6DE; --conc:#A8A39A; --graf:#1E2023; --azul:#1F4BD8; --azulc:#DFE6FB; --suave:#57554F; --linha:#D9D4CA; }
* { box-sizing: border-box; margin: 0; }
body { font-family: Archivo, system-ui, sans-serif; color: var(--graf); background: var(--cal); position: relative; overflow: hidden; -webkit-font-smoothing: antialiased; }
.exp { font-stretch: 125%; font-weight: 900; text-transform: uppercase; letter-spacing: -.01em; line-height: 1.02; }
.az { color: var(--azul); }
.topo { position: absolute; left: 72px; right: 72px; top: 60px; display: flex; justify-content: space-between; align-items: center; }
.topo img { height: 42px; }
.topo span { font-size: 24px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; opacity: .85; }
.pe { position: absolute; left: 72px; right: 72px; bottom: 56px; display: flex; justify-content: space-between; align-items: center; font-size: 25px; font-weight: 600; }
.chip { display: inline-flex; align-items: center; gap: 12px; padding: 12px 22px; border-radius: 999px; background: var(--azul); color: #fff; font-size: 24px; font-weight: 700; }
.vant { display: flex; align-items: center; gap: 16px; }
.vant i { flex: none; width: 66px; height: 66px; border-radius: 50%; background: var(--graf); color: #fff; display: grid; place-items: center; }
.vant b { display: block; font-size: 26px; line-height: 1.1; } .vant small { display: block; font-size: 21px; color: var(--suave); margin-top: 3px; line-height: 1.2; }
.card { background: #fff; border-radius: 22px; box-shadow: 0 18px 40px -26px rgba(30,32,35,.5); }
`;
const IC = {
  term: '<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3"><circle cx="24" cy="34" r="7"/><path d="M24 8v20"/></svg>',
  som: '<svg viewBox="0 0 48 48" width="34" height="34" fill="currentColor"><path d="M8 20h8l10-8v28l-10-8H8z"/><path d="M32 16q6 8 0 16M37 11q10 13 0 26" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  forca: '<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3"><path d="M24 6l15 6v12c0 9-6 15-15 18C15 39 9 33 9 24V12z"/><path d="M17 24l5 5 9-10"/></svg>',
  rapido: '<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3"><circle cx="24" cy="24" r="15"/><path d="M24 14v11l7 5"/></svg>',
  leve: '<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3"><path d="M10 38C10 20 22 10 40 8 40 26 28 38 10 38z"/><path d="M10 38L28 20"/></svg>',
  casa: '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M6 24L24 8l18 16"/><path d="M12 22v18h24V22"/><path d="M20 40V28h8v12"/></svg>',
  moldura: '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><rect x="6" y="10" width="36" height="28" rx="2"/><rect x="13" y="17" width="22" height="14"/></svg>',
  revest: '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3"><rect x="6" y="8" width="36" height="32"/><path d="M6 19h36M6 30h36M18 8v11M32 19v11M18 30v10"/></svg>',
  forro: '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M6 14l18-6 18 6-18 6z"/><path d="M6 14v6l18 6 18-6v-6"/></svg>',
  sanca: '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M6 12h36v6c-10 0-14 6-14 14H6z"/></svg>',
};
const marca = `<img src="${A("assets/img/marca.svg")}" alt="">`;
/* muro de Blocão (5 × 3 m = 5 blocos × 6 fiadas) e de tijolo, em SVG */
const muroBlocao = (w, h) => {
  const pil = w * 0.07, cw = (w - pil * 2) / 5, ch = h / 6; let r = "";
  for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) r += `<rect x="${pil + i * cw + 1.5}" y="${j * ch + 1.5}" width="${cw - 3}" height="${ch - 3}" fill="${(i + j) % 2 ? "#ADA89F" : "#B4AFA6"}"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#8F8A81"/>${r}<rect width="${pil}" height="${h}" fill="#8A857C"/><rect x="${w - pil}" width="${pil}" height="${h}" fill="#8A857C"/></svg>`;
};
const muroTijolo = (w, h) => {
  const pil = w * 0.07, bw = 26, bh = 12;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><pattern id="tj" width="${bw * 2}" height="${bh * 2}" patternUnits="userSpaceOnUse"><rect width="${bw * 2}" height="${bh * 2}" fill="#D9D1C4"/><rect x="1" y="1" width="${bw - 2}" height="${bh - 2}" fill="#C46A4A"/><rect x="${bw + 1}" y="1" width="${bw - 2}" height="${bh - 2}" fill="#B65C3F"/><rect x="${-bw / 2 + 1}" y="${bh + 1}" width="${bw - 2}" height="${bh - 2}" fill="#BE6344"/><rect x="${bw / 2 + 1}" y="${bh + 1}" width="${bw - 2}" height="${bh - 2}" fill="#C46A4A"/><rect x="${bw * 1.5 + 1}" y="${bh + 1}" width="${bw - 2}" height="${bh - 2}" fill="#B65C3F"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#tj)"/><rect width="${pil}" height="${h}" fill="#8A857C"/><rect x="${w - pil}" width="${pil}" height="${h}" fill="#8A857C"/></svg>`;
};
const chao = (w) => `<div style="height:22px;width:${w}px;background:#8FA97C;border-radius:0 0 8px 8px"></div>`;

const PECAS = {
  /* 1 — comparativo de muro */
  "A-comparativo-muro": { w: 1080, h: 1350, html: `
    <div class="topo">${marca}<span>Comparativo</span></div>
    <div style="position:absolute;left:72px;right:72px;top:150px">
      <h1 class="exp" style="font-size:78px">Muro de 5 × 3 m:<br><span class="az">tijolo ou Blocão?</span></h1>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:440px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div>
        <div class="chip" style="background:var(--graf)">Alvenaria · tijolo 9 × 14 × 19 cm</div>
        <div style="margin-top:18px;border-radius:14px;overflow:hidden">${muroTijolo(462, 276)}${chao(462)}</div>
        <div class="card" style="margin-top:22px;padding:26px 28px"><div style="font-size:23px;color:var(--suave);font-weight:600">Para 15 m² de muro</div><div class="exp" style="font-size:66px;margin-top:6px">≈ 495</div><div style="font-size:30px;font-weight:700">tijolos</div><div style="font-size:21px;color:var(--suave);margin-top:10px">≈ 33 por m², com juntas de 1 cm</div></div>
      </div>
      <div>
        <div class="chip">Blocão 13 cm · 100 × 50 cm</div>
        <div style="margin-top:18px;border-radius:14px;overflow:hidden">${muroBlocao(462, 276)}${chao(462)}</div>
        <div class="card" style="margin-top:22px;padding:26px 28px;border:3px solid var(--azul)"><div style="font-size:23px;color:var(--suave);font-weight:600">Para 15 m² de muro</div><div class="exp az" style="font-size:66px;margin-top:6px">≈ 30</div><div style="font-size:30px;font-weight:700">blocos</div><div style="font-size:21px;color:var(--suave);margin-top:10px">2 blocos por m²</div></div>
      </div>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:1125px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px">
      <div class="vant"><i>${IC.rapido}</i><div><b>Obra mais rápida</b></div></div>
      <div class="vant"><i>${IC.term}</i><div><b>Isolamento térmico</b></div></div>
      <div class="vant"><i>${IC.som}</i><div><b>Isolamento acústico</b></div></div>
    </div>
    <div class="pe" style="bottom:50px"><span style="font-size:19px;font-weight:500;opacity:.7;max-width:520px;line-height:1.3">Quantidades estimadas, sem perdas. A fábrica confirma a medida do seu projeto.</span><span style="font-size:23px">WhatsApp ${WHATS}</span></div>` },

  /* 2 — parceria Alex Martins × Império do EPS */
  "B-parceria-alex": { w: 1080, h: 1350, html: `
    <div style="position:absolute;left:72px;right:72px;top:60px;display:flex;align-items:center;gap:30px">
      <div style="background:var(--graf);border-radius:22px;padding:20px 30px;display:flex;align-items:center"><img src="${A("brand/instagram/alex/logo-alex-martins.png")}" style="height:128px" alt="Alex Martins · Arquitetura | Designer 3D"></div>
      <span class="exp" style="font-size:64px;color:var(--conc)">×</span>
      <div style="display:flex;align-items:center">${marca.replace("<img", '<img style="height:60px"')}</div>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:290px">
      <div class="chip" style="background:var(--graf)">Parceria</div>
      <h1 class="exp" style="font-size:60px;margin-top:24px;max-width:640px">Parceria que <span class="az">transforma seu projeto</span> em realidade</h1>
    </div>
    <img src="${A("assets/img/bloco-fechado.webp")}" style="position:absolute;right:-90px;top:610px;width:520px;filter:drop-shadow(0 26px 30px rgba(30,32,35,.2))" alt="">
    <p style="position:absolute;left:72px;top:660px;width:480px;font-size:29px;line-height:1.35">A experiência em <b>arquitetura e design 3D</b> com a tecnologia dos <b>blocos EPS</b>: projetos mais <b class="az">rápidos, modernos e sustentáveis</b>.</p>
    <div class="card" style="position:absolute;left:72px;right:72px;top:870px;padding:26px 34px">
      <div style="font-size:23px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--suave);margin-bottom:22px">Soluções completas para o seu projeto</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;text-align:center">
        ${[["Fachadas", IC.casa], ["Molduras", IC.moldura], ["Revestimentos", IC.revest], ["Forros", IC.forro], ["Sancas", IC.sanca]].map(([t, i]) => `<div><div style="width:84px;height:84px;margin:0 auto;border-radius:50%;background:var(--azulc);color:var(--azul);display:grid;place-items:center">${i}</div><div style="font-size:22px;font-weight:700;margin-top:10px">${t}</div></div>`).join("")}
      </div>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:1130px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
      <div class="vant"><i style="width:56px;height:56px">${IC.term}</i><div><b style="font-size:23px">Isolamento térmico</b></div></div>
      <div class="vant"><i style="width:56px;height:56px">${IC.som}</i><div><b style="font-size:23px">Isolamento acústico</b></div></div>
      <div class="vant"><i style="width:56px;height:56px">${IC.forca}</i><div><b style="font-size:23px">Alta resistência</b></div></div>
    </div>
    <div class="pe" style="bottom:42px;font-size:23px"><span>Itapetininga-SP · @arquitetura.alex</span><span>WhatsApp ${WHATS}</span></div>` },

  /* 3 — muro em Blocão 13 cm */
  "C-muro-bloco-13cm": { w: 1080, h: 1350, html: `
    <div class="topo">${marca}<span>Ficha do muro</span></div>
    <div style="position:absolute;left:72px;right:72px;top:150px"><h1 class="exp" style="font-size:72px">Muro em Blocão<br><span class="az">13 cm</span> sanduíche</h1></div>
    <div style="position:absolute;left:72px;top:400px;border-radius:16px;overflow:hidden;width:936px">${muroBlocao(936, 340)}${chao(936)}</div>
    <div class="card" style="position:absolute;left:72px;width:470px;top:790px;padding:28px 30px;height:410px">
      <div style="font-size:23px;font-weight:700;color:var(--suave)">O bloco</div>
      <img src="${A("assets/img/bloco-fechado.webp")}" style="width:430px;margin:-6px 0 -22px -16px" alt="">
      <div class="exp" style="font-size:42px">100 × 50 cm</div><div style="font-size:24px;color:var(--suave);margin-top:6px">13 cm de espessura final</div>
    </div>
    <div class="card" style="position:absolute;right:72px;width:440px;top:790px;padding:28px 30px;height:410px">
      <div style="font-size:23px;font-weight:700;color:var(--suave)">Corte do bloco</div>
      <div style="display:flex;height:150px;margin-top:22px;border-radius:8px;overflow:hidden"><i style="flex:3.5;background:#A8A39A"></i><i style="flex:6;background:#fff;box-shadow:inset 0 0 0 2px #cfcac0"></i><i style="flex:3.5;background:#A8A39A"></i></div>
      <div style="display:flex;margin-top:14px;font-size:22px;font-weight:700;line-height:1.2"><span style="flex:3.5">3,5 cm<br><small style="font-weight:500;color:var(--suave)">concreto</small></span><span style="flex:6;text-align:center">6 cm<br><small style="font-weight:500;color:var(--suave)">EPS</small></span><span style="flex:3.5;text-align:right">3,5 cm<br><small style="font-weight:500;color:var(--suave)">concreto</small></span></div>
      <div style="margin-top:22px;font-size:22px;line-height:1.35;color:var(--suave)">Acabamento em concreto aparente: o EPS fica todo por dentro.</div>
    </div>
    <div class="pe" style="bottom:40px"><div style="display:flex;gap:18px">
      <div class="vant"><i style="width:50px;height:50px">${IC.term}</i><b style="font-size:20px">Térmico</b></div>
      <div class="vant"><i style="width:50px;height:50px">${IC.som}</i><b style="font-size:20px">Acústico</b></div>
      <div class="vant"><i style="width:50px;height:50px">${IC.forca}</i><b style="font-size:20px">Resistente</b></div></div><span style="font-size:22px">WhatsApp ${WHATS}</span></div>` },

  /* 4 — ficha técnica do muro (paisagem, para site, slides e WhatsApp) */
  "D-ficha-muro-paisagem": { w: 1920, h: 1080, html: `
    <div style="position:absolute;left:70px;right:70px;top:46px;display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:36px">${marca.replace("<img", '<img style="height:52px"')}<h1 class="exp" style="font-size:44px;white-space:nowrap">Muro 5 × 3 m <span class="az">em Blocão 13 cm</span></h1></div><span style="font-size:26px;font-weight:600;white-space:nowrap">WhatsApp ${WHATS}</span></div>
    <div style="position:absolute;left:70px;top:150px;border-radius:18px;overflow:hidden;width:1780px">${muroBlocao(1780, 520)}${chao(1780)}</div>
    <div style="position:absolute;left:70px;right:70px;top:720px;display:grid;grid-template-columns:1.05fr 1fr 1.1fr;gap:26px;height:300px">
      <div class="card" style="padding:22px 28px;display:flex;align-items:center;gap:20px"><img src="${A("assets/img/bloco-fechado.webp")}" style="width:300px" alt=""><div><div style="font-size:22px;font-weight:700;color:var(--suave)">Bloco sanduíche EPS</div><div class="exp" style="font-size:30px;margin-top:6px;white-space:nowrap">100 × 50 cm</div><div style="font-size:22px;margin-top:8px">13 cm de espessura</div></div></div>
      <div class="card" style="padding:24px 30px"><div style="font-size:22px;font-weight:700;color:var(--suave)">Corte do bloco</div><div style="display:flex;height:120px;margin-top:16px;border-radius:8px;overflow:hidden"><i style="flex:3.5;background:#A8A39A"></i><i style="flex:6;background:#fff;box-shadow:inset 0 0 0 2px #cfcac0"></i><i style="flex:3.5;background:#A8A39A"></i></div><div style="display:flex;margin-top:12px;font-size:21px;font-weight:700;line-height:1.2"><span style="flex:3.5">3,5 cm<br><small style="font-weight:500;color:var(--suave)">concreto</small></span><span style="flex:6;text-align:center">6 cm<br><small style="font-weight:500;color:var(--suave)">EPS</small></span><span style="flex:3.5;text-align:right">3,5 cm<br><small style="font-weight:500;color:var(--suave)">concreto</small></span></div></div>
      <div class="card" style="padding:24px 30px"><div style="font-size:22px;font-weight:700;color:var(--suave);margin-bottom:16px">Vantagens do sistema</div><div style="display:grid;gap:14px">
        <div class="vant"><i style="width:54px;height:54px">${IC.term}</i><b style="font-size:24px">Isolamento térmico</b></div>
        <div class="vant"><i style="width:54px;height:54px">${IC.som}</i><b style="font-size:24px">Isolamento acústico</b></div>
        <div class="vant"><i style="width:54px;height:54px">${IC.forca}</i><b style="font-size:24px">Alta resistência</b></div></div></div>
    </div>` },
};

(async () => {
  const b = await chromium.launch();
  for (const [nome, { w, h, html }] of Object.entries(PECAS)) {
    const doc = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${nome}</title><style>${BASE} body{width:${w}px;height:${h}px}</style><body>${html}</body></html>`;
    const f = path.join(SRC, `${nome}.html`);
    fs.writeFileSync(f, doc);
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto("file://" + f);
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => (i.onload = i.onerror = r))))));
    await p.screenshot({ path: path.join(OUT, `${nome}.png`) });
    await p.close();
  }
  await b.close();
  console.log("ok:", Object.keys(PECAS).length, "peças em", OUT);
})();

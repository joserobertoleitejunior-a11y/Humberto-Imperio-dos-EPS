/* Gera os posts do Instagram (1080×1350, formato 4:5 do feed) em brand/instagram/posts/.
 * Uso: node brand/scripts/gerar_posts.js   (precisa do playwright do projeto)
 * Edite os textos em POSTS e rode de novo. O HTML-fonte de cada post fica em posts/src/. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "../..");
const OUT = path.join(RAIZ, "brand/instagram/posts");
const SRC = path.join(OUT, "src");
fs.mkdirSync(SRC, { recursive: true });
const A = (p) => path.relative(SRC, path.join(RAIZ, p)); // caminho relativo ao HTML-fonte

const WHATS = "(15) 99121-2917";
const BASE = `
@font-face { font-family: Archivo; src: url("${A("assets/fonts/archivo-latin.woff2")}") format("woff2"); font-weight: 400 900; font-stretch: 62% 125%; }
:root { --cal:#F3F1EC; --cal2:#EAE6DE; --conc:#A8A39A; --graf:#1E2023; --azul:#1F4BD8; --azulc:#DFE6FB; --azul-esc:#1638A8; --suave:#57554F; --linha:#D9D4CA; }
* { box-sizing: border-box; margin: 0; }
body { width: 1080px; height: 1350px; font-family: Archivo, system-ui, sans-serif; color: var(--graf); background: var(--cal); position: relative; overflow: hidden; -webkit-font-smoothing: antialiased; }
.exp { font-stretch: 125%; font-weight: 900; text-transform: uppercase; letter-spacing: -.01em; line-height: 1.02; }
.topo { position: absolute; left: 72px; right: 72px; top: 64px; display: flex; justify-content: space-between; align-items: center; font-size: 24px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; opacity: .85; }
.topo img { height: 40px; }
.pe { position: absolute; left: 72px; right: 72px; bottom: 60px; display: flex; justify-content: space-between; align-items: center; font-size: 25px; font-weight: 600; }
.pe small { font-size: 22px; font-weight: 500; opacity: .7; }
.escuro { background: var(--graf); color: #fff; }
.azul { background: var(--azul); color: #fff; }
.az { color: var(--azul); }
.escuro .az { color: #9DB6FF; }
.tag { display: inline-block; padding: 10px 22px; border: 2px solid currentColor; border-radius: 999px; font-size: 22px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
`;
const marca = (clara) => `<img src="${A(clara ? "assets/img/marca-clara.svg" : "assets/img/marca.svg")}" alt="">`;
const topo = (clara, dir = "Fábrica do Blocão") => `<div class="topo">${marca(clara)}<span>${dir}</span></div>`;
const pe = (txt = "Itapetininga-SP e região") => `<div class="pe"><span>${txt}</span><span>WhatsApp ${WHATS}</span></div>`;

/* camadas do Blocão em corte: concreto | EPS | concreto (proporções reais em cm) */
const corte = (c, e, alto, esc = false) => {
  const tot = c * 2 + e;
  const k = 100 / tot;
  return `<div style="display:flex;height:${alto}px;border-radius:6px;overflow:hidden;width:100%">
    <i style="flex:${c * k};background:#A8A39A"></i><i style="flex:${e * k};background:${esc ? "#F3F1EC" : "#fff"};box-shadow:inset 0 0 0 1.5px #cfcac0"></i><i style="flex:${c * k};background:#A8A39A"></i></div>`;
};

const POSTS = {
  "01-nova-fase": `
    <body>${topo(false, "Nova fase")}
    <div style="position:absolute;left:72px;right:72px;top:150px">
      <h1 class="exp" style="font-size:92px">O Império mudou.<br><span class="az">O bloco continua o mesmo.</span></h1>
    </div>
    <img src="${A("assets/img/bloco-fechado.webp")}" style="position:absolute;left:30px;top:650px;width:1020px;filter:drop-shadow(0 30px 40px rgba(30,32,35,.18))" alt="">
    ${pe("Fábrica do Blocão · Itapetininga-SP")}</body>`,

  "02-o-que-e-o-blocao": `
    <body class="escuro">${topo(true, "O que é")}
    <div style="position:absolute;left:72px;right:72px;top:160px">
      <h1 class="exp" style="font-size:96px">Concreto.<br><span class="az">EPS.</span><br>Concreto.</h1>
      <p style="font-size:36px;line-height:1.35;margin-top:34px;max-width:880px;opacity:.9">O Blocão é um sanduíche: o miolo de EPS isola, as duas faces de concreto dão a resistência.</p>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:780px">
      ${corte(3.5, 8, 240, true)}
      <div style="display:flex;margin-top:26px;font-size:26px;font-weight:600">
        <span style="flex:3.5">concreto<br><b style="font-size:34px">3,5 cm</b></span>
        <span style="flex:8;text-align:center">EPS<br><b style="font-size:34px">8 cm</b></span>
        <span style="flex:3.5;text-align:right">concreto<br><b style="font-size:34px">3,5 cm</b></span>
      </div>
      <p style="margin-top:34px;font-size:26px;opacity:.65">Exemplo: Blocão de 15 cm</p>
    </div>
    ${pe()}</body>`,

  "03-ficha-tecnica": `
    <body>${topo(false, "Ficha técnica")}
    <div style="position:absolute;left:72px;right:72px;top:150px">
      <h1 class="exp" style="font-size:84px">4 espessuras.<br><span class="az">1 sistema.</span></h1>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:470px;display:grid;gap:44px">
      ${[[10, 2.5, 5], [13, 3.5, 6], [15, 3.5, 8], [20, 3.5, 13]].map(([t, c, e]) => `
        <div style="display:grid;grid-template-columns:230px 1fr;align-items:center;gap:30px">
          <div class="exp" style="font-size:78px">${t}<span style="font-size:36px"> cm</span></div>
          <div>${corte(c, e, 70)}<p style="margin-top:12px;font-size:25px;font-weight:600;color:var(--suave)">${String(c).replace(".", ",")} concreto · ${e} EPS · ${String(c).replace(".", ",")} concreto</p></div>
        </div>`).join("")}
    </div>
    ${pe("Qual serve pra sua obra? Chama a gente")}</body>`,

  "04-blocao-x-tijolo": `
    <body>${topo(false, "Comparativo")}
    <div style="position:absolute;left:72px;right:72px;top:150px">
      <h1 class="exp" style="font-size:88px">Tijolo e reboco<br><span class="az">ou Blocão?</span></h1>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:470px;display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:34px">
      <div style="background:var(--cal2);border-radius:18px;padding:34px 34px 38px">
        <div class="exp" style="font-size:34px;color:var(--suave);margin-bottom:26px">Tijolo + reboco</div>
        ${["Pesado de carregar", "Precisa de reboco", "Isola pouco", "Obra mais demorada"].map((t) => `<p style="padding:44px 0;border-top:2px solid var(--linha);font-weight:600;color:var(--suave)">${t}</p>`).join("")}
      </div>
      <div style="background:var(--azul);color:#fff;border-radius:18px;padding:34px 34px 38px">
        <div class="exp" style="font-size:34px;margin-bottom:26px">Blocão</div>
        ${["Leve de assentar", "Dispensa reboco", "Térmico e acústico", "Obra mais rápida"].map((t) => `<p style="padding:44px 0;border-top:2px solid rgba(255,255,255,.35);font-weight:700">✓ ${t}</p>`).join("")}
      </div>
    </div>
    ${pe("Peça seu orçamento · Itapetininga-SP")}</body>`,

  "05a-isopor-pega-fogo": `
    <body class="escuro">${topo(true, "Mitos da obra")}
    <div style="position:absolute;left:72px;right:72px;top:330px">
      <span class="tag" style="color:#9DB6FF">Dúvida de quem vai construir</span>
      <h1 class="exp" style="font-size:150px;margin-top:40px">Isopor<br>pega<br><span class="az">fogo?</span></h1>
    </div>
    <p style="position:absolute;left:72px;bottom:150px;font-size:34px;font-weight:600">Arraste e veja → </p>
    ${pe()}</body>`,

  "05b-isopor-pega-fogo": `
    <body>${topo(false, "Mitos da obra")}
    <div style="position:absolute;left:72px;right:72px;top:170px">
      <h1 class="exp" style="font-size:80px">No Blocão o EPS fica <span class="az">protegido por concreto</span> dos dois lados.</h1>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:720px">
      ${corte(3.5, 8, 300)}
      <div style="display:flex;margin-top:26px;font-size:28px;font-weight:700">
        <span style="flex:3.5">concreto</span><span style="flex:8;text-align:center" class="az">EPS</span><span style="flex:3.5;text-align:right">concreto</span>
      </div>
    </div>
    ${pe()}</body>`,

  "05c-isopor-pega-fogo": `
    <body class="azul">${topo(true, "Mitos da obra")}
    <div style="position:absolute;left:72px;right:72px;top:300px">
      <h1 class="exp" style="font-size:96px">Ainda tem dúvida?</h1>
      <p style="font-size:44px;line-height:1.3;margin-top:40px;max-width:860px">Chama no WhatsApp e a gente responde com a ficha técnica do Blocão.</p>
      <p class="exp" style="font-size:58px;margin-top:70px">${WHATS}</p>
    </div>
    ${pe()}</body>`,

  "08-o-blocao-por-dentro": `
    <body>${topo(false, "Foto real · nossa fábrica")}
    <div style="position:absolute;left:72px;top:150px;width:500px;height:790px;border-radius:22px;overflow:hidden;box-shadow:0 24px 50px rgba(30,32,35,.22)">
      <img src="${A("brand/instagram/midia/corte-peca.jpg")}" style="width:100%;height:100%;object-fit:cover" alt="">
      ${[[157, "1"], [256, "2"], [343, "3"]].map(([x, n]) => `<i style="position:absolute;left:${x - 22}px;top:98px;width:44px;height:44px;border-radius:50%;background:var(--azul);color:#fff;display:grid;place-items:center;font:700 24px Archivo;font-style:normal;box-shadow:0 0 0 4px #fff">${n}</i>`).join("")}
    </div>
    <div style="position:absolute;left:620px;right:72px;top:150px">
      <h1 class="exp" style="font-size:62px">O Blocão<br>por dentro.</h1>
      <div style="margin-top:56px;display:grid;gap:34px">
        ${[["1", "Concreto", "Face externa: resistência e acabamento."], ["2", "EPS", "O miolo que isola o calor e o barulho."], ["3", "Concreto", "Face interna: parede lisa, pronta pra receber acabamento."]].map(([n, t, d]) => `
          <div style="display:grid;grid-template-columns:52px 1fr;gap:18px;align-items:start">
            <i style="width:44px;height:44px;border-radius:50%;background:var(--azul);color:#fff;display:grid;place-items:center;font:700 24px Archivo;font-style:normal">${n}</i>
            <div><b class="exp" style="font-size:30px">${t}</b><p style="font-size:25px;line-height:1.35;color:var(--suave);margin-top:6px">${d}</p></div>
          </div>`).join("")}
      </div>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:1000px;background:var(--graf);color:#fff;border-radius:20px;padding:38px 44px;display:flex;justify-content:space-between;align-items:center">
      <span class="exp" style="font-size:38px;line-height:1.1">Peça real,<br><span style="color:#9DB6FF">da nossa fábrica.</span></span>
      <span style="font-size:27px;line-height:1.4;text-align:right">Fabricado em Itapetininga-SP<br><b>Peça seu orçamento</b></span>
    </div>
    ${pe("Fábrica do Blocão · Itapetininga-SP")}</body>`,

  "09-fabricado-em-itapetininga": `
    <body>${topo(false, "Direto da fábrica")}
    <div style="position:absolute;left:72px;right:72px;top:140px">
      <h1 class="exp" style="font-size:78px">Fabricado em<br><span class="az">Itapetininga.</span></h1>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:420px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div style="height:430px;border-radius:20px;overflow:hidden;box-shadow:0 18px 40px rgba(30,32,35,.18)"><img src="${A("brand/instagram/midia/camadas-peca.jpg")}" style="width:100%;height:100%;object-fit:cover;object-position:60% 50%" alt=""></div>
      <div style="height:430px;border-radius:20px;overflow:hidden;box-shadow:0 18px 40px rgba(30,32,35,.18)"><img src="${A("brand/instagram/midia/face-peca.jpg")}" style="width:100%;height:100%;object-fit:cover" alt=""></div>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:890px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
      ${[["Térmico", "<circle cx='24' cy='14' r='7' fill='none' stroke='currentColor' stroke-width='3'/><path d='M24 21v18' stroke='currentColor' stroke-width='3'/>"],
         ["Acústico", "<path d='M8 20h8l10-8v28l-10-8H8z' fill='currentColor'/><path d='M32 16q6 8 0 16M37 11q10 13 0 26' fill='none' stroke='currentColor' stroke-width='3'/>"],
         ["Obra mais rápida", "<circle cx='24' cy='24' r='15' fill='none' stroke='currentColor' stroke-width='3'/><path d='M24 14v11l7 5' fill='none' stroke='currentColor' stroke-width='3'/>"],
         ["Sem reboco", "<rect x='6' y='10' width='36' height='8' fill='currentColor'/><rect x='6' y='20' width='36' height='8' fill='none' stroke='currentColor' stroke-width='3'/><rect x='6' y='30' width='36' height='8' fill='currentColor'/>"]]
        .map(([t, svg]) => `<div style="background:var(--azul);color:#fff;border-radius:16px;padding:24px 12px 22px;text-align:center"><svg viewBox="0 0 48 48" width="62" height="62">${svg}</svg><p class="exp" style="font-size:21px;margin-top:12px;line-height:1.1">${t}</p></div>`).join("")}
    </div>
    <div style="position:absolute;left:72px;right:72px;top:1110px;background:var(--graf);color:#fff;border-radius:18px;padding:26px 36px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:27px;line-height:1.35"><b class="exp" style="font-size:25px;color:#9DB6FF">Espessuras</b><br>10 · 13 · 15 · 20 cm</span>
      <span class="exp" style="font-size:36px;text-align:right;line-height:1.1">Faça seu<br>orçamento</span>
    </div>
    <div class="pe"><span>Itapetininga-SP e região</span><span>WhatsApp ${WHATS}</span></div></body>`,

  "07-calcule-sua-obra": `
    <body class="azul">${topo(true, "No site")}
    <div style="position:absolute;left:72px;right:72px;top:160px">
      <h1 class="exp" style="font-size:100px">Calcule<br>a sua obra<br>em 1 minuto.</h1>
    </div>
    <div style="position:absolute;left:72px;right:72px;top:640px;background:var(--cal);border-radius:28px;padding:30px;height:430px;display:flex;align-items:center;justify-content:center">
      <img src="${A("assets/img/casa-media.webp")}" style="height:100%;mix-blend-mode:multiply" alt="">
    </div>
    <div style="position:absolute;left:72px;right:72px;bottom:60px;display:flex;justify-content:space-between;align-items:center">
      <span class="exp" style="font-size:44px">Link na bio ↗</span><span style="font-size:25px;font-weight:600">WhatsApp ${WHATS}</span>
    </div></body>`,
};

(async () => {
  const b = await chromium.launch();
  for (const [nome, corpo] of Object.entries(POSTS)) {
    const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${nome}</title><style>${BASE}</style>${corpo}</html>`;
    const f = path.join(SRC, `${nome}.html`);
    fs.writeFileSync(f, html);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto("file://" + f);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, `${nome}.png`) });
    await p.close();
  }
  await b.close();
  console.log("ok:", Object.keys(POSTS).length, "posts em", OUT);
})();

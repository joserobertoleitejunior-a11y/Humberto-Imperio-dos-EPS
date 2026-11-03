/* Reel "drone": tour da maquete (capturado do próprio site, em PNG) + cenas em HTML com Three.js (maquete de tijolo × maquete de
 * Blocão, camadas do bloco se movendo) + animações em SVG, tudo sincronizado com a VOZ (tempos.json, de alinhar_voz.py).
 * Uso: node gerar_reel_drone.js <tempos.json> <audio.mp3> <pasta-quadros-tour> <saida.mp4> [so-um-quadro-em-segundos]
 * (precisa de ffmpeg, do playwright do projeto e do servidor local do site em http://localhost:8765) */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const [temposJson, audio, dirTour, saida, soUm] = process.argv.slice(2);
const RAIZ = path.resolve(__dirname, "../..");
const FPS = 24;
const W = 900, H = 980, Y0 = 410;
const BASE = process.env.BASE || "http://localhost:8765";

const dados = JSON.parse(fs.readFileSync(temposJson, "utf8"));
const P = dados.palavras;
const DUR = Math.ceil((dados.duracao + 0.25) * FPS) / FPS;
const norm = (s) => s.toLowerCase().replace(/[^a-záéíóúâêôãõç-]/g, "");
const idx = (w, depois = 0) => { const i = P.findIndex((p, k) => k >= depois && norm(p.w) === w); if (i < 0) throw new Error("palavra não achada: " + w); return i; };
const ini = (i) => P[i].ini;
const b = (i) => Math.max(0, ini(i) - 0.05);

const iA = idx("a"), iJa = idx("já"), iEla = idx("ela"), iSand = idx("sanduíche"), iC1 = idx("concreto", iSand), iIso1 = idx("isopor", iC1), iC2 = idx("concreto", idx("meio")), iFora = idx("fora"), iNovo = idx("novo");
const iCada = idx("cada"), iConc = idx("concreto", idx("função")), iIso = idx("isopor", iConc), iCalor = idx("calor"), iBarulho = idx("barulho"), iEle = idx("ele", iBarulho), iMofo = idx("mofo");
const iMais = idx("mais", iMofo), iComo = idx("como", iMais), iElet = idx("elétrica"), iFixar = idx("fixar"), iBloc = idx("blocão", iFixar), iDez = idx("dez"), iTreze = idx("treze"), iQuinze = idx("quinze"), iVinte = idx("vinte");
const iTudo = idx("tudo"), iQuer = idx("quer"), iChama = idx("chama", iQuer), iImp = idx("império");
const T = {
  s: [0, b(iA), b(iEla), b(iCada), b(iConc - 1), b(iIso - 1), b(iEle), b(iMais - 2), b(iComo), b(iElet - 3), b(iBloc), b(iTudo), b(iQuer), DUR],
  ja: ini(iJa), d1: ini(iC1), d2: ini(iIso1), d3: ini(iC2), calor: ini(iCalor), barulho: ini(iBarulho), elet: ini(iElet), fixar: ini(iFixar),
  dez: ini(iDez), treze: ini(iTreze), quinze: ini(iQuinze), vinte: ini(iVinte), chama: ini(iChama), imp: ini(iImp), novo: ini(iNovo),
};
for (let k = 1; k < T.s.length; k++) if (!(T.s[k] > T.s[k - 1])) throw new Error("cenas fora de ordem em " + k);

// legendas em pedaços curtos
const chunks = [];
let cur = [];
// a voz soletra "É-Pê-Ésse"; a legenda escreve EPS
const fecha = () => { if (cur.length) { chunks.push({ t0: Math.max(0, cur[0].ini - 0.04), texto: cur.map((p) => p.w + p.p).join(" ").replace(/É-Pê-Ésse/g, "EPS") }); cur = []; } };
P.forEach((p, k) => {
  cur.push(p);
  const len = cur.reduce((s, q) => s + q.w.length + q.p.length + 1, 0);
  const forte = /[.?…:]$/.test(p.p), fraca = /,$/.test(p.p), prox = P[k + 1];
  if (forte || (fraca && cur.length >= 3) || cur.length >= 7 || (prox && len + prox.w.length > 40)) fecha();
});
fecha();
chunks.forEach((c, i) => { c.t1 = i + 1 < chunks.length ? chunks[i + 1].t0 : DUR; });

const pagina = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url("/assets/fonts/archivo-latin.woff2");font-weight:400 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:Archivo,sans-serif;color:#1E2023;position:relative}
.exp{font-stretch:125%;font-weight:900;text-transform:uppercase;line-height:1.03;letter-spacing:-.01em}.az{color:#1F4BD8}
#logo{position:absolute;left:90px;top:96px;height:48px}
.h{position:absolute;left:90px;top:190px;width:900px;font-size:76px}.h div{white-space:nowrap}
#jan{position:absolute;left:90px;top:${Y0}px;width:${W}px;height:${H}px;border-radius:8px;overflow:hidden}
#mol{position:absolute;left:82px;top:${Y0 - 8}px;width:${W + 16}px;height:${H + 16}px;border:8px solid #1F4BD8;border-radius:12px;pointer-events:none}
#sub{z-index:10;position:absolute;left:50px;width:980px;top:1410px;height:440px;display:flex;align-items:center;justify-content:center;font-size:92px;line-height:1.06;font-weight:800;text-align:center;letter-spacing:-.015em}
#cv{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
.pill{position:absolute;padding:12px 20px;border-radius:12px;background:#fff;white-space:nowrap;font-size:30px;font-weight:800;text-transform:uppercase;font-stretch:120%;box-shadow:0 10px 24px -12px rgba(0,0,0,.5);transform:translate(-50%,-50%)}
.pill i{font-style:normal;display:inline-grid;place-items:center;width:42px;height:42px;border-radius:50%;background:#1F4BD8;color:#fff;margin-right:10px;font-size:26px}
.rotulo{position:absolute;top:26px;padding:12px 26px;border-radius:999px;background:#1E2023;color:#F3F1EC;font-size:34px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.ov{position:absolute;left:0;right:0;bottom:0;border-radius:22px 22px 0 0;background:rgba(255,255,255,.93);display:flex;align-items:center;gap:26px;padding:0 34px}
.ov .tx .exp{font-size:58px}.ov .tx p{font-size:42px;font-weight:700;line-height:1.1;margin-top:8px}
.ov svg{flex:none}
#fim{position:absolute;inset:0;background:#1F4BD8;color:#fff}
#fim img{position:absolute;left:90px;top:96px;height:48px}
</style><body>
<img id="logo" src="/assets/img/marca.svg">
<div id="hs"></div>
<div id="jan">
  <canvas id="cv" width="${W}" height="${H}"></canvas>
  <div id="rot0" class="rotulo" style="left:30px">Tijolo</div><div id="rot1" class="rotulo" style="right:30px;background:#1F4BD8">Blocão</div>
  <div id="pl0" class="pill"><i>1</i>Concreto</div><div id="pl1" class="pill"><i>2</i>Isopor</div><div id="pl2" class="pill"><i>3</i>Concreto</div>
  <div id="flash" style="position:absolute;inset:0;background:#1F4BD8;display:grid;place-items:center;opacity:0"><div id="mais" class="exp" style="color:#fff;font-size:150px;text-align:center">E tem<br>mais</div></div>
  <div id="ovs"></div>
</div>
<div id="mol"></div>
<div id="sub"></div>
<div id="fim"><img src="/assets/img/marca-clara.svg">
  <div style="position:absolute;left:90px;right:90px;top:430px">
    <div id="f1" class="exp" style="font-size:118px">Quer ver<br>na sua obra?</div>
    <p id="f2" style="font-size:58px;line-height:1.25;margin-top:60px;font-weight:700">Chama no WhatsApp.</p>
    <p id="f3" class="exp" style="font-size:80px;margin-top:60px">(15) 99121-2917</p>
    <p id="f4" style="font-size:40px;margin-top:50px;font-weight:600;opacity:.95">Império do EPS · Fábrica do Blocão<br>Itapetininga-SP e região</p>
  </div>
  <p style="position:absolute;left:0;right:0;bottom:60px;text-align:center;font-size:20px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.7">Feito por VIBE CODING PROCESS</p>
</div>
<script type="module">
import { IcosahedronGeometry, WebGLRenderer, Scene, PerspectiveCamera, BoxGeometry, PlaneGeometry, MeshStandardMaterial, Mesh, InstancedMesh, Object3D, Color, HemisphereLight, DirectionalLight, Vector3, Group, SRGBColorSpace, ACESFilmicToneMapping } from "/assets/vendor/three-imperio.min.js";
const T = ${JSON.stringify(T)};
const CH = ${JSON.stringify(chunks)};
const TITULOS = [["Esquece o", "tijolo."], ["A parede do", "futuro."], ["Se chama", "Blocão."], ["Cada camada", "tem função."], ["Concreto:", "a força."], ["Isopor: calor", "e barulho."], ["Sem", "mofo."], null, ["Leve e", "rápido."], ["Elétrica e", "fixação."], ["4", "espessuras."], ["Feito em", "Itapetininga."]];
const clamp = (x) => Math.max(0, Math.min(1, x));
const out = (x) => 1 - Math.pow(1 - clamp(x), 3);
const inout = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const back = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const quica = (x) => { x = clamp(x); const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; } if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; } x -= 2.625 / d; return n * x * x + 0.984375; };
const $ = (id) => document.getElementById(id);
const hs = $("hs");
TITULOS.forEach((t, i) => { const h = document.createElement("div"); h.className = "h exp"; h.id = "h" + i; if (t) h.innerHTML = "<div>" + t[0] + '</div><div class="az">' + t[1] + "</div>"; hs.appendChild(h); });

/* ================= MAQUETES EM 3D (Three.js): tijolo × Blocão ================= */
const renderer = new WebGLRenderer({ canvas: $("cv"), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(${W}, ${H}, false); renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const cena = new Scene(); cena.background = new Color("#EAE6DE");
const cam = new PerspectiveCamera(34, ${W} / ${H}, 0.5, 200);
cena.add(new HemisphereLight("#ffffff", "#d6d2ca", 1.5));
const sol = new DirectionalLight("#ffffff", 2.1); sol.position.set(8, 14, 9); cena.add(sol);
const chao = new Mesh(new PlaneGeometry(80, 80), new MeshStandardMaterial({ color: "#E2DDD2", roughness: 1 })); chao.rotation.x = -Math.PI / 2; cena.add(chao);

/* ---- casa de verdade (mesma planta do site): paredes com vãos, varanda com colunas, telhado de 4 águas,
   janelas com caixilho, porta com degraus e jardim. A ÚNICA diferença entre as duas é a parede. ---- */
const ALT = 2.5, LX = 5.6, LZ = 4.4;
const VAR_L = 3.2, VAR_P = 1.5;            // varanda: largura e profundidade
const vaos = [
  { f: "z+", a: -0.5, b: 0.5, y0: 0, y1: 2.1, porta: true },
  { f: "z+", a: 1.1, b: 2.4, y0: 0.95, y1: 1.95 },
  { f: "z+", a: -2.4, b: -1.1, y0: 0.95, y1: 1.95 },
  { f: "x+", a: -1.5, b: -0.3, y0: 0.95, y1: 1.95 },
  { f: "x+", a: 0.5, b: 1.4, y0: 1.05, y1: 1.85 },
  { f: "x-", a: -0.4, b: 0.8, y0: 0.95, y1: 1.95 },
  { f: "z-", a: -0.7, b: 0.5, y0: 0.95, y1: 1.95 },
];
/** quadrilátero qualquer (a,b,c,d em sentido horário visto de fora) a partir de um PlaneGeometry */
function quad(a, b, c, d, mat) {
  const g = new PlaneGeometry(1, 1, 1, 1);
  const pos = g.attributes.position;
  pos.setXYZ(0, a.x, a.y, a.z); pos.setXYZ(1, b.x, b.y, b.z); pos.setXYZ(2, d.x, d.y, d.z); pos.setXYZ(3, c.x, c.y, c.z);
  pos.needsUpdate = true; g.computeVertexNormals();
  return new Mesh(g, mat);
}
function telhado(w, d, hR, mat, beiral) {
  const W = w / 2 + beiral, D = d / 2 + beiral, r = Math.max(0.3, W - D);
  const V = (x, y, z) => new Vector3(x, y, z);
  const g = new Group();
  g.add(quad(V(-W, 0, D), V(W, 0, D), V(r, hR, 0), V(-r, hR, 0), mat));     // frente
  g.add(quad(V(W, 0, -D), V(-W, 0, -D), V(-r, hR, 0), V(r, hR, 0), mat));   // fundos
  g.add(quad(V(W, 0, D), V(W, 0, -D), V(r, hR, 0), V(r, hR, 0), mat));      // lateral direita
  g.add(quad(V(-W, 0, -D), V(-W, 0, D), V(-r, hR, 0), V(-r, hR, 0), mat));  // lateral esquerda
  return g;
}
function pecas(cL, cA, deslocaMeio) {
  const L = [];
  const parede = (face, comp, fx, fz, dx, dz, rot) => {
    const cursos = Math.round(ALT / cA);
    for (let c = 0; c < cursos; c++) {
      const y = c * cA + cA / 2;
      let pos = -comp / 2; const off = deslocaMeio && c % 2 ? cL / 2 : 0; let primeiro = true;
      while (pos < comp / 2 - 0.001) {
        const len = Math.min(primeiro && off ? off : cL, comp / 2 - pos); primeiro = false;
        let segs = [[pos, pos + len]];
        vaos.forEach((v) => { if (v.f === face && y + cA / 2 > v.y0 && y - cA / 2 < v.y1) segs = segs.flatMap(([a, bb]) => (bb <= v.a || a >= v.b ? [[a, bb]] : [[a, Math.min(bb, v.a)], [Math.max(a, v.b), bb]].filter(([x0, x1]) => x1 - x0 > 0.001))); });
        segs.forEach(([a, bb]) => { const l2 = bb - a; if (l2 > 0.04) { const centro = (a + bb) / 2; L.push({ x: fx + dx * centro, y, z: fz + dz * centro, sx: rot ? 0.16 : l2, sy: cA, sz: rot ? l2 : 0.16, c, ordem: 0 }); } });
        pos += len;
      }
    }
  };
  parede("z+", LX, 0, LZ / 2, 1, 0, false); parede("z-", LX, 0, -LZ / 2, 1, 0, false);
  parede("x+", LZ, LX / 2, 0, 0, 1, true); parede("x-", LZ, -LX / 2, 0, 0, 1, true);
  L.sort((p, q) => p.c - q.c || Math.atan2(p.z, p.x) - Math.atan2(q.z, q.x));
  L.forEach((p, i) => { p.ordem = i / L.length; });
  return L;
}
function casa(cL, cA, deslocaMeio, cor, variacao) {
  const L = pecas(cL, cA, deslocaMeio);
  const im = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 }), L.length);
  const c = new Color();
  L.forEach((p, i) => { c.set(cor); if (variacao) c.offsetHSL(Math.sin(i * 12.9898) * 0.5 * 0.012, 0, Math.sin(i * 78.233) * 0.5 * variacao); im.setColorAt(i, c); });
  const g = new Group(); g.add(im);
  const M = {
    piso: new MeshStandardMaterial({ color: "#F4F2EC", roughness: 0.9 }),
    grama: new MeshStandardMaterial({ color: "#8FA97C", roughness: 1 }),
    calcada: new MeshStandardMaterial({ color: "#DED9CE", roughness: 0.95 }),
    telha: new MeshStandardMaterial({ color: "#9E5B45", roughness: 0.9, flatShading: true }),
    branco: new MeshStandardMaterial({ color: "#F7F6F2", roughness: 0.7 }),
    vidro: new MeshStandardMaterial({ color: "#9FD0E6", roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55 }),
    madeira: new MeshStandardMaterial({ color: "#B9855A", roughness: 0.75 }),
    tronco: new MeshStandardMaterial({ color: "#6B5440", roughness: 1 }),
    folha: new MeshStandardMaterial({ color: "#4E6B42", roughness: 0.95, flatShading: true }),
  };
  // terreno, calçada e piso da casa
  const terreno = new Mesh(new BoxGeometry(LX + 3.6, 0.12, LZ + 4.2), M.grama); terreno.position.set(0, -0.06, 0.6); g.add(terreno);
  const piso = new Mesh(new BoxGeometry(LX + 0.3, 0.1, LZ + 0.3), M.piso); piso.position.y = -0.02; g.add(piso);
  const cam_ = new Mesh(new BoxGeometry(1.5, 0.06, 2.4), M.calcada); cam_.position.set(0, 0.02, LZ / 2 + VAR_P + 1.2); g.add(cam_);
  // varanda: piso, 2 colunas e laje
  const vg = new Group();
  const vp = new Mesh(new BoxGeometry(VAR_L, 0.1, VAR_P), M.piso); vp.position.set(0, 0.03, LZ / 2 + VAR_P / 2); vg.add(vp);
  [-1, 1].forEach((s) => { const col = new Mesh(new BoxGeometry(0.22, ALT - 0.1, 0.22), M.branco); col.position.set(s * (VAR_L / 2 - 0.2), (ALT - 0.1) / 2, LZ / 2 + VAR_P - 0.2); vg.add(col); });
  const vl = new Mesh(new BoxGeometry(VAR_L + 0.3, 0.16, VAR_P + 0.25), M.branco); vl.position.set(0, ALT - 0.02, LZ / 2 + VAR_P / 2); vg.add(vl);
  [0, 1].forEach((i) => { const d = new Mesh(new BoxGeometry(1.4, 0.07, 0.3), M.piso); d.position.set(0, 0.055 - i * 0.055, LZ / 2 + VAR_P + 0.15 + i * 0.3); vg.add(d); });
  g.add(vg);
  // laje + telhado de 4 águas
  const laje = new Mesh(new BoxGeometry(LX + 0.35, 0.16, LZ + 0.35), M.branco); laje.position.y = ALT + 0.08; g.add(laje);
  const tel = telhado(LX, LZ, 1.15, M.telha, 0.45); tel.position.y = ALT + 0.16; g.add(tel);
  const chamine = new Mesh(new BoxGeometry(0.4, 0.95, 0.4), M.branco); chamine.position.set(LX / 2 - 1.1, ALT + 0.7, -LZ / 4); g.add(chamine);
  // janelas e porta
  const vid = new Group();
  vaos.forEach((v) => {
    const largura = v.b - v.a, altura = v.y1 - v.y0, cy = (v.y0 + v.y1) / 2, meio = (v.a + v.b) / 2;
    const lado = v.f[0] === "x", sinal = v.f[1] === "+" ? 1 : -1;
    const q = new Group();
    if (v.porta) {
      const folha = new Mesh(new BoxGeometry(largura * 0.96, altura * 0.98, 0.07), M.madeira); folha.position.y = cy; q.add(folha);
      const mac = new Mesh(new BoxGeometry(0.06, 0.06, 0.12), new MeshStandardMaterial({ color: "#2A2C2F", metalness: 0.5, roughness: 0.4 })); mac.position.set(largura * 0.33, cy - 0.06, 0.06); q.add(mac);
    } else {
      const pane = new Mesh(new BoxGeometry(largura, altura, 0.03), M.vidro); pane.position.y = cy; q.add(pane);
      const t = 0.08;
      [[0, altura / 2, largura + t, t], [0, -altura / 2, largura + t, t], [-largura / 2, 0, t, altura], [largura / 2, 0, t, altura], [0, 0, t * 0.55, altura]].forEach(([x, y, w, h]) => { const m = new Mesh(new BoxGeometry(w, h, 0.1), M.branco); m.position.set(x, cy + y, 0); q.add(m); });
      const peit = new Mesh(new BoxGeometry(largura + 0.2, 0.08, 0.26), M.branco); peit.position.set(0, v.y0 - 0.04, 0.05); q.add(peit);
    }
    if (lado) { q.rotation.y = Math.PI / 2; q.position.set(sinal * LX / 2, 0, meio * sinal); }
    else q.position.set(meio, 0, sinal * LZ / 2);
    vid.add(q);
  });
  g.add(vid);
  // jardim: duas árvores e dois arbustos
  const jard = new Group();
  [[-(LX / 2 + 1.2), LZ / 2 + 1.0, 1], [LX / 2 + 1.3, -LZ / 4, 0.85]].forEach(([x, z, e]) => {
    const tr = new Mesh(new BoxGeometry(0.16, 1.1 * e, 0.16), M.tronco); tr.position.set(x, 0.55 * e, z); jard.add(tr);
    const cp = new Mesh(new IcosahedronGeometry(0.62 * e, 1), M.folha); cp.position.set(x, 1.45 * e, z); jard.add(cp);
  });
  [-1, 1].forEach((s) => { const ar = new Mesh(new IcosahedronGeometry(0.3, 1), M.folha); ar.position.set(s * 1.25, 0.22, LZ / 2 + VAR_P + 0.55); jard.add(ar); });
  g.add(jard);
  return { g, im, L, laje, vid, vg, tel, chamine, jard, terreno };
}
const tijolo = casa(0.2, 0.1, true, "#B5634A", 0.05);
const blocao = casa(1.0, 0.5, true, "#A8A39A", 0.012);
tijolo.g.position.x = -5.4; blocao.g.position.x = 5.4; cena.add(tijolo.g); cena.add(blocao.g);
const o3 = new Object3D();
function montar(h, t, t0, dur, escala) {
  const { im, L, laje, vid, vg, tel, chamine, jard, terreno } = h;
  L.forEach((p, i) => {
    const ts = t0 + p.ordem * (dur * 0.74), k = clamp((t - ts) / (dur * 0.12 + 0.16));
    const e = k > 0 ? quica(k) : 0;
    o3.position.set(p.x, p.y + (1 - e) * 3.2 * escala, p.z);
    o3.rotation.set((1 - e) * 0.5, (1 - e) * (i % 2 ? 0.6 : -0.6), 0);
    const f = k > 0 ? 1 : 0.0001; o3.scale.set(p.sx * f, p.sy * f, p.sz * f);
    o3.updateMatrix(); im.setMatrixAt(i, o3.matrix);
  });
  im.instanceMatrix.needsUpdate = true;
  const et = (a, b2) => out(clamp((t - (t0 + dur * a)) / (dur * b2 + 0.25)));
  const kt = clamp((t - t0) / 0.3); terreno.visible = kt > 0; terreno.scale.set(kt, 1, kt);
  const kv = et(0.72, 0.1); vg.visible = kv > 0; vg.scale.setScalar(0.5 + 0.5 * kv); vg.position.y = (1 - kv) * -0.6;
  vid.visible = kv > 0; vid.scale.setScalar(0.6 + 0.4 * kv);
  const kl = et(0.8, 0.08); laje.visible = kl > 0; laje.position.y = ALT + 0.08 + (1 - kl) * 2.6;
  const kr = et(0.86, 0.1); tel.visible = kr > 0; tel.position.y = ALT + 0.16 + (1 - kr) * 3.4; tel.scale.set(0.8 + 0.2 * kr, kr, 0.8 + 0.2 * kr);
  chamine.visible = kr > 0.9;
  const kj = et(0.92, 0.1); jard.visible = kj > 0; jard.scale.setScalar(quica(kj));
}
// bloco único com as 3 camadas
const camadas = new Group();
const corCam = ["#A8A39A", "#F6F4EE", "#A8A39A"], esp = [0.07, 0.16, 0.07]; // 3,5 + 8 + 3,5 cm (x2)
const malhas = esp.map((e, i) => { const m = new Mesh(new BoxGeometry(2.0, 1.0, e), new MeshStandardMaterial({ color: corCam[i], roughness: i === 1 ? 1 : 0.85 })); camadas.add(m); return m; });
cena.add(camadas); camadas.visible = false;
function pos3(v) { const q = v.clone().project(cam); return [(q.x + 1) / 2 * ${W}, (1 - q.y) / 2 * ${H}]; }

function maquete(t) {
  const emA = t < T.s[2];
  tijolo.g.visible = blocao.g.visible = emA; camadas.visible = !emA;
  if (emA) {
    // 0 - 1,25: só o tijolo, bem de perto; depois a câmera abre e o Blocão sobe rápido ao lado
    const ab = inout((t - 1.0) / 0.9);
    const ang = -0.48 + 0.30 * (t / 3.65);
    const dist = 16.0 + ab * 11.5, alvoX = -5.4 + ab * 5.4;
    cam.position.set(alvoX + Math.sin(ang) * dist, 5.4 + ab * 4.2, Math.cos(ang) * dist); cam.lookAt(alvoX, 1.5, 0.4);
    montar(tijolo, t, 0.05, 8.2, 1);
    montar(blocao, t, T.s[1] + 0.05, 1.5, 1);
    // "esquece o tijolo": ao fim da 1ª frase o tijolo balança
    const tremor = clamp((t - 0.85) / 0.4) * (1 - clamp((t - 1.3) / 0.3));
    tijolo.g.rotation.z = Math.sin(t * 60) * 0.02 * tremor;
    tijolo.g.position.y = -0.25 * inout((t - 1.2) / 1.0) * 0; // (mantém no chão)
    $("rot0").style.opacity = clamp((t - 2.0) / 0.4); $("rot1").style.opacity = clamp((t - 2.7) / 0.4);
    [0, 1, 2].forEach((i) => { $("pl" + i).style.opacity = 0; });
  } else {
    $("rot0").style.opacity = $("rot1").style.opacity = 0;
    // 3,65 - 10,6: o bloco gira e as camadas se afastam nas palavras, depois se juntam de novo
    const l = t - T.s[2];
    const sepIn = out((t - (T.d1 - 0.1)) / 0.7), sepOut = inout((t - (T.novo + 1.6)) / 0.8);
    const sep = sepIn * (1 - sepOut);
    const entra = out(l / 0.5);
    camadas.scale.setScalar(0.85 + 0.15 * entra); camadas.position.y = 0.2;
    camadas.rotation.y = -0.9 + 0.5 * l / 6 + Math.sin(l * 0.9) * 0.16; camadas.rotation.x = 0.1;
    malhas.forEach((m, i) => { m.position.z = (i - 1) * (0.14 + 0.62 * sep) * (i === 1 ? 0 : 1) * 1; if (i === 1) m.position.z = 0; m.position.x = 0; });
    malhas[0].position.z = -0.17 - 0.75 * sep; malhas[2].position.z = 0.17 + 0.75 * sep; malhas[1].position.z = 0; malhas[0].position.y = malhas[2].position.y = 0; malhas[1].position.y = 0.0;
    const ang = 0.25; cam.position.set(Math.sin(ang) * 6.2, 1.6, Math.cos(ang) * 6.2); cam.lookAt(0, 0.1, 0);
    cam.updateMatrixWorld();
    const ps = [new Vector3(0, 0.62, -0.17 - 0.75 * sep), new Vector3(0, 0.0, 0), new Vector3(0, -0.62, 0.17 + 0.75 * sep)];
    [0, 1, 2].forEach((i) => {
      const tt = [T.d1, T.d2, T.d3][i];
      const el = $("pl" + i);
      el.style.opacity = clamp((t - tt + 0.05) / 0.15) * (1 - clamp((t - (T.novo + 1.9)) / 0.4));
      el.style.transform = "translate(-50%,-50%) scale(" + (0.5 + 0.5 * back((t - tt + 0.05) / 0.3)) + ")";
      const base = [[${W} * 0.22, ${H} * 0.2], [${W} * 0.78, ${H} * 0.5], [${W} * 0.22, ${H} * 0.8]][i];
      el.style.left = base[0] + "px"; el.style.top = base[1] + "px";
    });
  }
  cam.updateMatrixWorld();
  renderer.render(cena, cam);
}

/* ================= ANIMAÇÕES EM SVG sobre o tour ================= */
const NS = "http://www.w3.org/2000/svg";
const ovs = $("ovs");
function cartao(id, alt, svg, titulo, sub) {
  const d = document.createElement("div"); d.className = "ov"; d.id = id; d.style.height = alt + "px"; d.style.opacity = 0;
  d.innerHTML = svg + '<div class="tx"><div class="exp">' + titulo + "</div><p>" + sub + "</p></div>"; ovs.appendChild(d); return d;
}
const cinza = "#A8A39A";
// 4: concreto dá a força — pesos caem e a laje segura
cartao("o4", 300, '<svg id="s4" width="330" height="270" viewBox="0 0 330 270"><rect x="20" y="215" width="290" height="40" rx="6" fill="' + cinza + '"/><g id="p4"></g><path id="a4" d="M165 195 l0 -0" stroke="#1F4BD8" stroke-width="8" fill="none"/></svg>', "Concreto", "dá a força");
// 5: isopor segura calor e barulho
cartao("o5", 300, '<svg id="s5" width="330" height="270" viewBox="0 0 330 270"><circle cx="40" cy="45" r="22" fill="#F2A900"/><g id="r5"></g><rect x="150" y="30" width="34" height="220" fill="' + cinza + '"/><rect x="184" y="30" width="60" height="220" fill="#fff" stroke="#cfcac0" stroke-width="3"/><rect x="244" y="30" width="34" height="220" fill="' + cinza + '"/><g id="w5"></g><path id="ok5" d="M290 140 l14 14 l26 -30" stroke="#1FA855" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="80" stroke-dashoffset="80"/></svg>', "Isopor", "calor e barulho");
// 6: sem mofo — gotas escorrem, parede seca
cartao("o6", 300, '<svg id="s6" width="330" height="270" viewBox="0 0 330 270"><rect x="150" y="20" width="34" height="230" fill="' + cinza + '"/><rect x="184" y="20" width="60" height="230" fill="#fff" stroke="#cfcac0" stroke-width="3"/><rect x="244" y="20" width="34" height="230" fill="' + cinza + '"/><g id="g6"></g><path id="ok6" d="M40 140 l22 22 l44 -52" stroke="#1FA855" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="130" stroke-dashoffset="130"/></svg>', "Sem mofo", "parede seca");
// 8: leve e rápido — a parede sobe bloco a bloco, relógio girando
cartao("o8", 300, '<svg id="s8" width="330" height="270" viewBox="0 0 330 270"><g id="b8"></g><circle cx="262" cy="70" r="46" fill="#fff" stroke="#1E2023" stroke-width="7"/><line id="m8" x1="262" y1="70" x2="262" y2="38" stroke="#1F4BD8" stroke-width="7" stroke-linecap="round"/><line id="h8" x1="262" y1="70" x2="276" y2="70" stroke="#1E2023" stroke-width="7" stroke-linecap="round"/></svg>', "Leve", "a parede sobe rápido");
// 9: elétrica e fixação
cartao("o9", 330, '<svg id="s9" width="360" height="300" viewBox="0 0 360 300"><rect x="40" y="20" width="44" height="260" fill="' + cinza + '"/><rect x="84" y="20" width="84" height="260" fill="#fff" stroke="#cfcac0" stroke-width="3"/><rect x="168" y="20" width="44" height="260" fill="' + cinza + '"/><path id="c9" d="M126 270 L126 190 L100 165 L152 110 L126 85 L126 28" stroke="#1F4BD8" stroke-width="10" fill="none" stroke-linejoin="round" stroke-dasharray="500" stroke-dashoffset="500"/><g id="f9"><rect x="212" y="120" width="130" height="18" rx="4" fill="#B9855A"/><rect x="296" y="86" width="40" height="34" rx="6" fill="#1F4BD8"/><circle cx="226" cy="129" r="6" fill="#1E2023"/></g></svg>', "<span id=\\"t9\\">Elétrica</span>", "<span id=\\"u9\\">pelo miolo</span>");
// 10: espessuras
cartao("o10", 560, '<div id="e10" style="width:100%"></div>', "", "");
// 11: Itapetininga
cartao("o11", 220, '<svg id="s11" width="150" height="190" viewBox="0 0 150 190"><ellipse id="sombra11" cx="75" cy="176" rx="30" ry="9" fill="rgba(0,0,0,.25)"/><g id="pin11"><path d="M75 6c-32 0-54 24-54 54 0 40 54 112 54 112s54-72 54-112c0-30-22-54-54-54z" fill="#1F4BD8"/><circle cx="75" cy="60" r="20" fill="#fff"/></g></svg>', "Itapetininga-SP", "direto da fábrica");
const ESP = [[10, 2.5, 5, "dez"], [13, 3.5, 6, "treze"], [15, 3.5, 8, "quinze"], [20, 3.5, 13, "vinte"]];
$("e10").innerHTML = ESP.map(([tt, c, e], i) => '<div id="g' + i + '" style="display:flex;align-items:center;gap:24px;height:120px"><div class="exp" style="font-size:84px;width:250px;flex:none">' + tt + '<span style="font-size:38px"> cm</span></div><div style="display:flex;height:80px;flex:1;border-radius:8px;overflow:hidden"><i style="flex:' + c + ';background:#A8A39A"></i><i style="flex:' + e + ';background:#fff;box-shadow:inset 0 0 0 2px #cfcac0"></i><i style="flex:' + c + ';background:#A8A39A"></i></div></div>').join("");
$("o10").style.flexDirection = "column"; $("o10").style.justifyContent = "center"; $("o10").style.alignItems = "stretch";
const el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
// peças dos desenhos
const pesos = []; for (let i = 0; i < 3; i++) { const r = el("rect", { x: 70 + i * 70, y: 0, width: 60, height: 50, rx: 6, fill: ["#1E2023", "#1F4BD8", "#1E2023"][i] }); $("p4").appendChild(r); pesos.push(r); }
const raios = []; for (let i = 0; i < 5; i++) { const p = el("path", { d: "M70 " + (40 + i * 40) + " q20 -12 40 0 t40 0", stroke: "#F2A900", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }); $("r5").appendChild(p); raios.push(p); }
const ondas = []; for (let i = 0; i < 3; i++) { const p = el("path", { d: "M60 150 q-24 30 0 60", stroke: "#1F4BD8", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }); $("w5").appendChild(p); ondas.push(p); }
const gotas = []; for (let i = 0; i < 6; i++) { const c = el("path", { d: "M0 -14 C10 0 14 6 0 14 C-14 6 -10 0 0 -14 Z", fill: "#3D8FAE" }); $("g6").appendChild(c); gotas.push(c); }
const blocos8 = []; for (let i = 0; i < 6; i++) { const r = el("rect", { x: 20 + (i % 2) * 60 + (i % 2 ? 0 : 0), y: 210 - i * 36, width: 120, height: 32, rx: 4, fill: i % 2 ? "#A8A39A" : "#B8B3AA" }); r.setAttribute("x", i % 2 ? 40 : 20); $("b8").appendChild(r); blocos8.push(r); }

function ov(id, on, fade) { const e = $(id); e.style.display = on ? "flex" : "none"; if (on) { e.style.opacity = fade; e.style.transform = "translateY(" + 60 * (1 - fade) + "px)"; } }

function legenda(t) {
  $("sub").style.color = t >= T.s[12] ? "#fff" : "#1E2023";
  let txt = ""; for (const c of CH) if (t >= c.t0 && t < c.t1) { txt = c.texto; break; }
  if ($("sub").dataset.t !== txt) { $("sub").dataset.t = txt; $("sub").textContent = txt; }
}

function render(t) {
  legenda(t);
  let cena_ = 0; for (let k = 0; k < 12; k++) if (t >= T.s[k]) cena_ = k;
  const l = t - T.s[cena_], dur = T.s[cena_ + 1] - T.s[cena_];
  const fade = Math.min(clamp(l / 0.15), clamp((dur - l) / 0.12));
  TITULOS.forEach((x, i) => { const h = $("h" + i); const on = i === cena_ && x && cena_ < 12; h.style.display = on ? "block" : "none"; if (on) { h.style.opacity = fade; h.children[0].style.transform = "translateY(" + 40 * (1 - out(l / 0.3)) + "px)"; h.children[1].style.transform = "translateY(" + 40 * (1 - out((l - 0.06) / 0.3)) + "px)"; } });
  const dentro = cena_ < 12; $("jan").style.display = $("mol").style.display = dentro ? "block" : "none"; $("logo").style.display = dentro ? "block" : "none";
  const naMaquete = t < T.s[3];
  $("cv").style.display = naMaquete ? "block" : "none";
  ["pl0", "pl1", "pl2"].forEach((id) => { $(id).style.display = naMaquete ? "block" : "none"; });
  $("rot0").style.display = $("rot1").style.display = t < T.s[2] ? "block" : "none";
  if (naMaquete) maquete(t);
  // tour: a janela fica transparente (o ffmpeg põe os quadros do drone embaixo)
  // 7: "e tem mais" (relâmpago azul)
  const fl = cena_ === 7 ? Math.min(clamp(l / 0.1), clamp((dur - l) / 0.12)) : 0;
  $("flash").style.opacity = fl; $("mais").style.transform = "scale(" + (0.7 + 0.3 * back(l / 0.3)) + ")";
  // cartões animados
  const f = (a, b2) => cena_ === a ? Math.min(out(l / 0.35), clamp((dur - l) / 0.15)) : 0;
  ov("o4", cena_ === 4, f(4)); ov("o5", cena_ === 5, f(5)); ov("o6", cena_ === 6, f(6)); ov("o8", cena_ === 8, f(8)); ov("o9", cena_ === 9, f(9)); ov("o10", cena_ === 10, f(10)); ov("o11", cena_ === 11, f(11));
  // 4: pesos caem
  if (cena_ === 4) { pesos.forEach((r, i) => { const k = clamp((l - (0.3 + i * 0.5)) / 0.45); r.setAttribute("y", 165 - (1 - quica(k)) * 160 - 0); r.setAttribute("opacity", k > 0 ? 1 : 0); }); }
  // 5: raios de calor param no isopor; som se apaga
  if (cena_ === 5) {
    raios.forEach((p, i) => { const k = (l * 1.4 + i * 0.17) % 1; p.setAttribute("transform", "translate(" + (k * 70) + ",0)"); p.setAttribute("opacity", (1 - k) * (k < 0.1 ? k * 10 : 1)); });
    ondas.forEach((p, i) => { const k = (l * 0.9 + i * 0.33) % 1; p.setAttribute("transform", "translate(" + (k * 60) + "," + (-10 * i) + ") scale(" + (1 + k * 0.3) + ")"); p.setAttribute("opacity", (1 - k) * 0.9); });
    $("ok5").setAttribute("stroke-dashoffset", 80 * (1 - clamp((l - 1.2) / 0.5)));
  }
  // 6: gotas descem pela parede e escorrem; ok
  if (cena_ === 6) {
    gotas.forEach((g, i) => { const k = (l * 0.8 + i * 0.17) % 1; g.setAttribute("transform", "translate(" + (130 + (i % 3) * 5) + "," + (30 + k * 210) + ") scale(" + (0.9 - k * 0.4) + ")"); g.setAttribute("opacity", k < 0.9 ? 1 : (1 - k) * 10); });
    $("ok6").setAttribute("stroke-dashoffset", 130 * (1 - clamp((l - 1.4) / 0.6)));
  }
  // 8: parede sobe bloco a bloco; ponteiros giram
  if (cena_ === 8) {
    blocos8.forEach((r, i) => { const k = clamp((l - (0.15 + i * 0.5)) / 0.4); r.setAttribute("y", 210 - i * 36 - (1 - quica(k)) * 180); r.setAttribute("opacity", k > 0 ? 1 : 0); });
    $("m8").setAttribute("transform", "rotate(" + (l * 720) + " 262 70)"); $("h8").setAttribute("transform", "rotate(" + (l * 60) + " 262 70)");
  }
  // 9: tubo se desenha; depois a prateleira entra e a legenda do cartão troca
  if (cena_ === 9) {
    $("c9").setAttribute("stroke-dashoffset", 500 * (1 - clamp((t - T.elet) / 1.4)));
    const kf = out((t - T.fixar + 0.1) / 0.5); $("f9").setAttribute("transform", "translate(" + (140 * (1 - kf)) + ",0)"); $("f9").setAttribute("opacity", kf);
    $("t9").textContent = t < T.fixar - 0.1 ? "Elétrica" : "Fixação"; $("u9").textContent = t < T.fixar - 0.1 ? "pelo miolo" : "bucha certa";
  }
  // 10: barras das espessuras
  if (cena_ === 10) [T.dez, T.treze, T.quinze, T.vinte].forEach((tt, i) => { const k = out((t - (tt - 0.15)) / 0.4); const g = $("g" + i); g.style.opacity = k; g.style.transform = "translateX(" + 100 * (1 - k) + "px)"; });
  // 11: pino cai e pulsa
  if (cena_ === 11) { const k = quica(clamp(l / 0.7)); $("pin11").setAttribute("transform", "translate(0," + (-(1 - k) * 120) + ")"); $("sombra11").setAttribute("rx", 10 + 20 * k); }
  // cartão final
  const FIM = T.s[12]; const lf = t - FIM;
  $("fim").style.display = t >= FIM ? "block" : "none"; $("fim").style.opacity = clamp(lf / 0.2);
  [["f1", 0], ["f2", T.chama - FIM - 0.1], ["f3", T.chama - FIM + 0.4], ["f4", T.imp - FIM - 0.1]].forEach(([id, d]) => { const k = out((lf - Math.max(0, d)) / 0.4); $(id).style.opacity = k; $(id).style.transform = "translateY(" + 40 * (1 - k) + "px)"; });
}
window.render = render; window.__pronto = true;
</script>`;

(async () => {
  const arq = path.join(RAIZ, "brand/instagram/reel-promo/_pagina-drone.html");
  fs.writeFileSync(arq, pagina);
  const br = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on("pageerror", (e) => console.log("ERRO NA PÁGINA:", e.message));
  await p.goto(`${BASE}/brand/instagram/reel-promo/_pagina-drone.html`);
  await p.waitForFunction(() => window.__pronto === true, null, { timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => (i.onload = i.onerror = r))))));
  const tmp = fs.mkdtempSync("/tmp/reel-drone-");
  if (soUm !== undefined) { await p.evaluate((t) => window.render(t), +soUm); await p.screenshot({ path: saida, omitBackground: true }); await br.close(); fs.unlinkSync(arq); console.log("quadro:", saida); return; }
  const N = Math.round(DUR * FPS);
  for (let k = 0; k < N; k++) {
    await p.evaluate((t) => window.render(t), k / FPS);
    await p.screenshot({ path: `${tmp}/o-${String(k).padStart(4, "0")}.png`, omitBackground: true });
    if (k % 100 === 0) console.log("quadro", k, "de", N);
  }
  await br.close(); fs.unlinkSync(arq);
  const t0 = T.s[3], t1 = T.s[12];
  execFileSync("ffmpeg", ["-v", "error", "-y",
    "-f", "lavfi", "-i", `color=c=0xC8D2C8:s=1080x1920:r=${FPS}:d=${DUR}`,
    "-framerate", String(FPS), "-i", path.join(dirTour, "f-%04d.png"),
    "-framerate", String(FPS), "-i", `${tmp}/o-%04d.png`,
    "-i", audio,
    "-filter_complex",
    `[1:v]trim=0:${(t1 - t0).toFixed(3)},setpts=PTS-STARTPTS,scale=${W}:${H}:flags=lanczos,setpts=PTS+${t0.toFixed(3)}/TB[tour];` +
    `[0:v][tour]overlay=90:${Y0}:enable='between(t,${t0.toFixed(3)},${t1.toFixed(3)})':eof_action=repeat[x];[x][2:v]overlay=0:0:format=auto,format=yuv420p[o];[3:a]apad,atrim=0:${DUR.toFixed(3)}[au]`,
    "-map", "[o]", "-map", "[au]", "-t", String(DUR), "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", saida]);
  console.log("ok:", saida, DUR.toFixed(2), "s");
})();

/* Reel promocional (9:16, 28,5 s, sem áudio) — as legendas seguem o roteiro em brand/instagram/reel-promo/ROTEIRO.md.
 * Passos: 1) camada de gráficos/legendas (PNG com transparência, 24 quadros/s, desenhada por tempo)
 *         2) mistura com a base + a maquete 3D (quadros em <3d>) + o vídeo da peça real e gera o MP4.
 * Uso: node brand/scripts/gerar_reel_promo.js <pasta-dos-quadros-3d> <video-da-peca-real.mp4> <saida.mp4> [quadro-unico-em-segundos]
 * (precisa de ffmpeg e do playwright do projeto) */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const [dir3d, clipe, saida, soUm] = process.argv.slice(2);
const RAIZ = path.resolve(__dirname, "../..");
const FPS = 24;
const DUR = 28.5;
const TMP = fs.mkdtempSync("/tmp/reel-promo-");
const A = (p) => "file://" + path.join(RAIZ, p);

const CENAS = [
  { t0: 0, t1: 4, h: ["Obra normal:", "nunca acaba."], sub: "Obra normal: tijolo, reboco, entulho… e nada de acabar." },
  { t0: 4, t1: 8, h: ["Aí eu conheci", "o Blocão."], sub: "Aí eu conheci o Blocão. Mudou meu jogo." },
  { t0: 8, t1: 12, h: ["Concreto. EPS.", "Concreto."], sub: "Concreto, EPS, concreto. Um sanduíche de parede." },
  { t0: 12, t1: 20, h: ["A parede sobe", "rápido."], sub: "A parede sobe rápido, a casa fica mais fresca e silenciosa, e o vizinho nem reclama." },
  { t0: 20, t1: 24, h: ["Feito em", "Itapetininga."], sub: "Feito aqui em Itapetininga, direto da fábrica." },
];

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url("${A("assets/fonts/archivo-latin.woff2")}");font-weight:400 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:Archivo,sans-serif;color:#1E2023;position:relative}
.exp{font-stretch:125%;font-weight:900;text-transform:uppercase;line-height:1.03;letter-spacing:-.01em}.az{color:#1F4BD8}
#logo{position:absolute;left:90px;top:96px;height:48px}
.h{position:absolute;left:90px;top:196px;width:900px;font-size:80px}.h div{white-space:nowrap}
#jan{position:absolute;left:90px;top:520px;width:900px;height:1200px;border-radius:8px;overflow:hidden}
#mol{position:absolute;left:82px;top:512px;width:916px;height:1216px;border:8px solid #1F4BD8;border-radius:12px;pointer-events:none}
.sub{position:absolute;left:90px;width:900px;top:1752px;font-size:38px;line-height:1.28;font-weight:600;text-align:center}
.tag{position:absolute;left:28px;bottom:28px;white-space:nowrap;background:#1E2023;color:#F3F1EC;padding:14px 26px;border-radius:999px;font-size:28px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.cena{position:absolute;inset:0}
.tij{position:absolute;width:128px;height:52px;border-radius:5px;box-shadow:inset 0 -5px 0 rgba(0,0,0,.14)}
.chip{position:absolute;padding:16px 30px;border-radius:14px;font-size:40px;font-weight:800;text-transform:uppercase;font-stretch:125%;background:#1E2023;color:#fff}
.dot{position:absolute;width:62px;height:62px;border-radius:50%;background:#1F4BD8;color:#fff;display:grid;place-items:center;font:900 32px Archivo;box-shadow:0 0 0 6px #fff}
.rot{position:absolute;bottom:34px;padding:14px 20px;border-radius:12px;background:#fff;white-space:nowrap;font-size:27px;font-weight:800;text-transform:uppercase;font-stretch:120%;box-shadow:0 10px 24px -12px rgba(0,0,0,.5)}
#fim{position:absolute;inset:0;background:#1F4BD8;color:#fff}
#fim img{position:absolute;left:90px;top:96px;height:48px}
</style><body>
<img id="logo" src="${A("assets/img/marca.svg")}">
<div id="hs"></div>
<div id="jan"><div id="c1" class="cena"></div><div id="c2" class="cena"></div><div id="c3" class="cena"></div><div id="c4" class="cena"></div><div id="c5" class="cena"></div></div>
<div id="mol"></div>
<div id="subs"></div>
<div id="fim"><img src="${A("assets/img/marca-clara.svg")}">
  <div style="position:absolute;left:90px;right:90px;top:430px">
    <div id="f1" class="exp" style="font-size:118px">Quer a sua<br>obra assim?</div>
    <p id="f2" style="font-size:50px;line-height:1.3;margin-top:60px;font-weight:600">Chama no WhatsApp.</p>
    <p id="f3" class="exp" style="font-size:80px;margin-top:70px">(15) 99121-2917</p>
    <p id="f4" style="font-size:40px;margin-top:50px;font-weight:600;opacity:.9">Império do EPS · Fábrica do Blocão<br>Itapetininga-SP e região</p>
  </div>
  <p style="position:absolute;left:0;right:0;bottom:60px;text-align:center;font-size:20px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.7">Feito por VIBE CODING PROCESS</p>
</div>
<script>
const CENAS = ${JSON.stringify(CENAS)};
const clamp = (x) => Math.max(0, Math.min(1, x));
const out = (x) => 1 - Math.pow(1 - clamp(x), 3);
const back = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const quica = (x) => { x = clamp(x); const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; } if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; } x -= 2.625 / d; return n * x * x + 0.984375; };
const $ = (id) => document.getElementById(id);
const hs = $("hs"), subs = $("subs");
CENAS.forEach((c, i) => {
  const h = document.createElement("div"); h.className = "h exp"; h.id = "h" + i;
  h.innerHTML = c.h.map((l, k) => '<div class="' + (k ? "az" : "") + '">' + l + "</div>").join(""); hs.appendChild(h);
  const s = document.createElement("div"); s.className = "sub"; s.id = "s" + i; s.textContent = c.sub; subs.appendChild(s);
});
// cena 1: pilha de tijolos
const cores = ["#B9644A", "#A8553D", "#C37457", "#B05A41"];
const pilha = []; let n = 0;
for (let r = 0; r < 6; r++) for (let k = 0; k < 6 - r; k++) {
  const e = document.createElement("div"); e.className = "tij"; e.style.background = cores[(n + r) % 4];
  const x = 450 - (6 - r) * 66 + k * 132 + (r % 2 ? 4 : -4), y = 1140 - 56 - r * 56 - (r % 2);
  $("c1").appendChild(e); pilha.push({ e, x, y, d: 0.25 + n * 0.1 }); n++;
}
const piso = document.createElement("div"); piso.style.cssText = "position:absolute;left:0;right:0;bottom:0;height:70px;background:#D6D1C7"; $("c1").appendChild(piso);
const c1bg = document.createElement("div"); c1bg.style.cssText = "position:absolute;inset:0;background:#EAE6DE;z-index:-1"; $("c1").prepend(c1bg);
[["+ reboco", 90, 300, 1.7], ["+ entulho", 470, 190, 2.3], ["+ meses de obra", 160, 90, 2.9]].forEach(([t, x, y, d], i) => { const c = document.createElement("div"); c.className = "chip"; c.textContent = t; c.style.left = x + "px"; c.style.top = y + "px"; c.dataset.d = d; c.id = "ch" + i; $("c1").appendChild(c); });
// cena 2: bloco 3D (imagem) fechado -> desmontado
$("c2").innerHTML = '<div style="position:absolute;inset:0;background:#EAE6DE"></div><img id="b1" src="${A("assets/img/bloco-fechado.webp")}" style="position:absolute;left:-60px;top:230px;width:1020px"><img id="b2" src="${A("assets/img/bloco-desmontado.webp")}" style="position:absolute;left:-60px;top:230px;width:1020px;opacity:0"><div class="tag" id="t2" style="left:50%;transform:translateX(-50%);bottom:60px">Concreto · EPS · Concreto</div>';
// cena 3: foto real do corte da peça
$("c3").innerHTML = '<img src="${A("brand/instagram/midia/corte-peca.jpg")}" style="position:absolute;inset:0;width:900px;height:1200px;object-fit:cover">' +
  [[284, 150, "1"], [460, 150, "2"], [617, 150, "3"]].map(([x, y, t], i) => '<div class="dot" id="d' + i + '" style="left:' + (x - 31) + "px;top:" + y + 'px">' + t + "</div>").join("") +
  [[14, "1 Concreto"], [338, "2 EPS"], [506, "3 Concreto"]].map(([x, t], i) => '<div class="rot" id="r' + i + '" style="left:' + x + 'px">' + t + "</div>").join("");
$("c4").innerHTML = '<div class="tag">Maquete 3D · casa de Blocão</div>';
$("c5").innerHTML = '<div class="tag">Peça real · nossa fábrica</div>';

function render(t) {
  const FIM = 24;
  CENAS.forEach((c, i) => {
    const l = t - c.t0, vis = t >= c.t0 && t < c.t1;
    const fade = vis ? Math.min(clamp(l / 0.25), clamp((c.t1 - t) / 0.2)) : 0;
    const h = $("h" + i); h.style.opacity = fade; h.style.display = vis ? "block" : "none";
    h.children[0].style.transform = "translateY(" + 46 * (1 - out(l / 0.5)) + "px)"; h.children[1].style.transform = "translateY(" + 46 * (1 - out((l - 0.12) / 0.5)) + "px)";
    $("s" + i).style.opacity = fade * clamp((l - 0.15) / 0.3); $("s" + i).style.display = vis ? "block" : "none";
    $("c" + (i + 1)).style.display = vis ? "block" : "none"; $("c" + (i + 1)).style.opacity = fade;
  });
  const dentro = t < FIM;
  $("jan").style.display = $("mol").style.display = dentro ? "block" : "none";
  // cena 1
  const l1 = t;
  pilha.forEach((b) => { const k = clamp((l1 - b.d) / 0.55); b.e.style.opacity = k > 0 ? 1 : 0; b.e.style.transform = "translate(" + b.x + "px," + (b.y - (1 - quica(k)) * 900) + "px) rotate(" + (1 - k) * 18 + "deg)"; });
  [0, 1, 2].forEach((i) => { const c = $("ch" + i), k = back((l1 - +c.dataset.d) / 0.4); c.style.opacity = clamp((l1 - +c.dataset.d) / 0.15); c.style.transform = "scale(" + (0.4 + 0.6 * k) + ")"; });
  // cena 2
  const l2 = t - 4; const e2 = out(l2 / 0.7);
  $("b1").style.opacity = 1 - clamp((l2 - 1.7) / 0.5); $("b2").style.opacity = clamp((l2 - 1.7) / 0.5);
  $("b1").style.transform = $("b2").style.transform = "scale(" + (0.85 + 0.15 * e2) + ") rotate(" + (1 - e2) * -4 + "deg)";
  $("t2").style.opacity = clamp((l2 - 2.2) / 0.4);
  // cena 3
  const l3 = t - 8;
  [0, 1, 2].forEach((i) => { const d = $("d" + i), r = $("r" + i), k = back((l3 - (0.5 + i * 0.55)) / 0.4); d.style.opacity = clamp((l3 - (0.5 + i * 0.55)) / 0.15); d.style.transform = "scale(" + k + ")"; r.style.opacity = clamp((l3 - (0.6 + i * 0.55)) / 0.2); r.style.transform = "translateY(" + 20 * (1 - out((l3 - (0.6 + i * 0.55)) / 0.3)) + "px)"; });
  // cena 4/5: tag entra
  $("c4").firstChild.style.opacity = clamp((t - 13) / 0.4); $("c5").firstChild.style.opacity = clamp((t - 20.4) / 0.4);
  // cena 6 (cartão final azul cobre tudo)
  const lf = t - FIM; $("fim").style.display = t >= FIM ? "block" : "none"; $("fim").style.opacity = clamp(lf / 0.25);
  $("logo").style.display = t < FIM ? "block" : "none";
  [["f1", 0.2], ["f2", 0.6], ["f3", 0.95], ["f4", 1.4]].forEach(([id, d]) => { const k = out((lf - d) / 0.5); $(id).style.opacity = k; $(id).style.transform = "translateY(" + 40 * (1 - k) + "px)"; });
}
window.render = render;
</script>`;

(async () => {
  fs.writeFileSync(`${TMP}/o.html`, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(`file://${TMP}/o.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => (i.onload = i.onerror = r))))));
  if (soUm !== undefined) { // quadro de teste
    await p.evaluate((t) => window.render(t), +soUm);
    await p.screenshot({ path: saida, omitBackground: true });
    await b.close(); console.log("quadro:", saida); return;
  }
  const N = Math.round(DUR * FPS);
  for (let k = 0; k < N; k++) {
    await p.evaluate((t) => window.render(t), k / FPS);
    await p.screenshot({ path: `${TMP}/o-${String(k).padStart(4, "0")}.png`, omitBackground: true });
  }
  await b.close();
  const n3 = fs.readdirSync(dir3d).filter((f) => f.endsWith(".jpg")).length;
  console.log("quadros 3D:", n3);
  execFileSync("ffmpeg", ["-v", "error", "-y",
    "-f", "lavfi", "-i", `color=c=0xF3F1EC:s=1080x1920:r=${FPS}:d=${DUR}`,
    "-framerate", String(FPS), "-start_number", "8", "-i", path.join(dir3d, "f-%04d.jpg"), // os 8 primeiros quadros têm o céu transparente (preto)
    "-ss", "0", "-t", "4", "-i", clipe,
    "-framerate", String(FPS), "-i", `${TMP}/o-%04d.png`,
    "-filter_complex",
    `[1:v]crop=675:900:0:150,scale=900:1200:flags=lanczos,setpts=PTS+12/TB[a3];` +
    `[2:v]crop=472:630:0:110,scale=900:1200:flags=lanczos,unsharp=5:5:0.8,eq=contrast=1.05:saturation=0.95,fps=${FPS},setpts=PTS+20/TB[a5];` +
    `[0:v][a3]overlay=90:520:enable='between(t,12,20)':eof_action=repeat[x];[x][a5]overlay=90:520:enable='between(t,20,24)':eof_action=pass[y];[y][3:v]overlay=0:0:format=auto,format=yuv420p[o]`,
    "-map", "[o]", "-t", String(DUR), "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", saida]);
  console.log("ok:", saida);
})();

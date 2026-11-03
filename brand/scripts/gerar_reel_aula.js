/* Reel "mini aula" com a VOZ: legendas e cenas sincronizadas com o áudio (tempos de cada palavra em tempos.json, gerado
 * por alinhar_voz.py). Gráficos e legendas = PNG com transparência, 24 quadros/s, desenhados por tempo; depois o ffmpeg
 * mistura com a base, a maquete 3D, o vídeo da peça real e o áudio.
 * Uso: node gerar_reel_aula.js <tempos.json> <audio.mp3> <quadros-3d> <video-peca-real.mp4> <saida.mp4> [so-um-quadro-em-segundos] */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const [temposJson, audio, dir3d, clipe, saida, soUm] = process.argv.slice(2);
const RAIZ = path.resolve(__dirname, "../..");
const FPS = 24;
const TMP = fs.mkdtempSync("/tmp/reel-aula-");
const A = (p) => "file://" + path.join(RAIZ, p);
const W = 900, H = 980, Y0 = 410;

const dados = JSON.parse(fs.readFileSync(temposJson, "utf8"));
const P = dados.palavras;
const DUR = Math.ceil((dados.duracao + 0.25) * FPS) / FPS;
const norm = (s) => s.toLowerCase().replace(/[^a-záéíóúâêôãõç-]/g, "");
const idx = (w, depois = 0) => { const i = P.findIndex((p, k) => k >= depois && norm(p.w) === w); if (i < 0) throw new Error("palavra não achada: " + w); return i; };
const ini = (i) => P[i].ini;

// ---- cenas (começam na 1ª palavra de cada trecho da fala) ----
const iA = idx("a"), iJa = idx("já"), iEla = idx("ela"), iSand = idx("sanduíche"), iC1 = idx("concreto", iSand), iFora = idx("fora"), iIso1 = idx("isopor", iC1), iC2 = idx("concreto", idx("meio")), iNovo = idx("novo");
const iCada = idx("cada"), iConc = idx("concreto", idx("função")), iFace = idx("face"), iIso = idx("isopor", iConc), iCalor = idx("calor"), iBarulho = idx("barulho"), iEle = idx("ele", iBarulho), iMofo = idx("mofo");
const iMais = idx("mais", iMofo), iComo = idx("como", iMais), iElet = idx("elétrica"), iFixar = idx("fixar"), iBloc = idx("blocão", iFixar), iDez = idx("dez"), iTreze = idx("treze"), iQuinze = idx("quinze"), iVinte = idx("vinte");
const iTudo = idx("tudo"), iQuer = idx("quer"), iChama = idx("chama", iQuer), iImp = idx("império");
const b = (i) => Math.max(0, ini(i) - 0.05);
const T = {
  s: [0, b(iA), b(iEla), b(iCada), b(iConc - 1), b(iIso - 1), b(iEle), b(iMais - 2), b(iComo), b(iElet - 3), b(iBloc), b(iTudo), b(iQuer), DUR],
  fixar: ini(iFixar), face: ini(iFace), calor: ini(iCalor), barulho: ini(iBarulho), ja: ini(iJa),
  d1: ini(iC1), d2: ini(iIso1), d3: ini(iC2), dez: ini(iDez), treze: ini(iTreze), quinze: ini(iQuinze), vinte: ini(iVinte), chama: ini(iChama), imp: ini(iImp), elet: ini(iElet),
};
// confere que nenhuma cena ficou invertida
for (let k = 1; k < T.s.length; k++) if (!(T.s[k] > T.s[k - 1])) throw new Error("cenas fora de ordem em " + k);

// ---- legendas: pedaços curtos, cortados na pontuação; aparecem na 1ª palavra do pedaço ----
const chunks = [];
let cur = [];
const fecha = () => { if (cur.length) { chunks.push({ t0: Math.max(0, cur[0].ini - 0.04), texto: cur.map((p, k) => p.w + (k === cur.length - 1 ? p.p : p.p)).join(" ") }); cur = []; } };
P.forEach((p, k) => {
  cur.push(p);
  const len = cur.reduce((s, q) => s + q.w.length + q.p.length + 1, 0);
  const forte = /[.?…:]$/.test(p.p), fraca = /,$/.test(p.p);
  const prox = P[k + 1];
  if (forte || (fraca && cur.length >= 3) || cur.length >= 7 || (prox && len + prox.w.length > 40)) fecha();
});
fecha();
chunks.forEach((c, i) => { c.t1 = i + 1 < chunks.length ? chunks[i + 1].t0 : DUR; });

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url("${A("assets/fonts/archivo-latin.woff2")}");font-weight:400 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0}html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:Archivo,sans-serif;color:#1E2023;position:relative}
.exp{font-stretch:125%;font-weight:900;text-transform:uppercase;line-height:1.03;letter-spacing:-.01em}.az{color:#1F4BD8}
#logo{position:absolute;left:90px;top:96px;height:48px}
.h{position:absolute;left:90px;top:190px;width:900px;font-size:76px}.h div{white-space:nowrap}
#jan{position:absolute;left:90px;top:${Y0}px;width:${W}px;height:${H}px;border-radius:8px;overflow:hidden}
#mol{position:absolute;left:82px;top:${Y0 - 8}px;width:${W + 16}px;height:${H + 16}px;border:8px solid #1F4BD8;border-radius:12px;pointer-events:none}
#sub{z-index:10;position:absolute;left:50px;width:980px;top:1410px;height:440px;display:flex;align-items:center;justify-content:center;font-size:92px;line-height:1.06;font-weight:800;text-align:center;letter-spacing:-.015em}
.tag{position:absolute;left:28px;bottom:28px;white-space:nowrap;background:#1E2023;color:#F3F1EC;padding:14px 26px;border-radius:999px;font-size:28px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.cena{position:absolute;inset:0}
.tij{position:absolute;width:128px;height:52px;border-radius:5px;box-shadow:inset 0 -5px 0 rgba(0,0,0,.14)}
.dot{position:absolute;width:62px;height:62px;border-radius:50%;background:#1F4BD8;color:#fff;display:grid;place-items:center;font:900 32px Archivo;box-shadow:0 0 0 6px #fff}
.rot{position:absolute;bottom:34px;padding:14px 20px;border-radius:12px;background:#fff;white-space:nowrap;font-size:28px;font-weight:800;text-transform:uppercase;font-stretch:120%;box-shadow:0 10px 24px -12px rgba(0,0,0,.5)}
.cartao{border-radius:22px;padding:34px 40px;display:flex;gap:30px;align-items:center}
.cartao .exp{font-size:60px}.cartao p{font-size:46px;font-weight:700;line-height:1.1;margin-top:10px}
.painel{position:absolute;left:0;width:900px;overflow:hidden;border-radius:16px;box-shadow:0 16px 36px -20px rgba(0,0,0,.6)}
.painel img{width:900px;display:block}
#fim{position:absolute;inset:0;background:#1F4BD8;color:#fff}
#fim img{position:absolute;left:90px;top:96px;height:48px}
</style><body>
<img id="logo" src="${A("assets/img/marca.svg")}">
<div id="hs"></div>
<div id="jan">${Array.from({ length: 12 }, (_, i) => `<div id="c${i + 1}" class="cena"></div>`).join("")}</div>
<div id="mol"></div>
<div id="sub"></div>
<div id="fim"><img src="${A("assets/img/marca-clara.svg")}">
  <div style="position:absolute;left:90px;right:90px;top:430px">
    <div id="f1" class="exp" style="font-size:118px">Quer ver<br>na sua obra?</div>
    <p id="f2" style="font-size:58px;line-height:1.25;margin-top:60px;font-weight:700">Chama no WhatsApp.</p>
    <p id="f3" class="exp" style="font-size:80px;margin-top:60px">(15) 99121-2917</p>
    <p id="f4" style="font-size:40px;margin-top:50px;font-weight:600;opacity:.95">Império do EPS · Fábrica do Blocão<br>Itapetininga-SP e região</p>
  </div>
  <p style="position:absolute;left:0;right:0;bottom:60px;text-align:center;font-size:20px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.7">Feito por VIBE CODING PROCESS</p>
</div>
<script>
const T = ${JSON.stringify(T)};
const CH = ${JSON.stringify(chunks)};
const TITULOS = [["Esquece o", "tijolo."], ["A parede do", "futuro."], ["Se chama", "Blocão."], ["Cada camada", "tem função."], ["Concreto:", "a força."], ["Isopor: calor", "e barulho."], ["Sem", "mofo."], null, ["Leve e", "rápido."], ["Elétrica e", "fixação."], ["4", "espessuras."], ["Feito em", "Itapetininga."]];
const clamp = (x) => Math.max(0, Math.min(1, x));
const out = (x) => 1 - Math.pow(1 - clamp(x), 3);
const back = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const quica = (x) => { x = clamp(x); const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; } if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; } x -= 2.625 / d; return n * x * x + 0.984375; };
const $ = (id) => document.getElementById(id);
const hs = $("hs");
TITULOS.forEach((t, i) => { const h = document.createElement("div"); h.className = "h exp"; h.id = "h" + i; if (t) h.innerHTML = '<div>' + t[0] + '</div><div class="az">' + t[1] + "</div>"; hs.appendChild(h); });
const set = (id, html) => { $(id).innerHTML = html; };
// c1: pilha de tijolos
const cores = ["#B9644A", "#A8553D", "#C37457", "#B05A41"]; const pilha = []; let nb = 0;
set("c1", '<div style="position:absolute;inset:0;background:#EAE6DE"></div><div style="position:absolute;left:0;right:0;bottom:0;height:70px;background:#D6D1C7"></div>');
for (let r = 0; r < 6; r++) for (let k = 0; k < 6 - r; k++) { const e = document.createElement("div"); e.className = "tij"; e.style.background = cores[(nb + r) % 4]; $("c1").appendChild(e); pilha.push({ e, x: 450 - (6 - r) * 66 + k * 132 + (r % 2 ? 4 : -4), y: ${H} - 56 - r * 56 - (r % 2), d: 0.02 + nb * 0.02 }); nb++; }
// c2: bloco 3D fechado -> desmontado
set("c2", '<div style="position:absolute;inset:0;background:#EAE6DE"></div><img id="b1" src="${A("assets/img/bloco-fechado.webp")}" style="position:absolute;left:-60px;top:200px;width:1020px"><img id="b2" src="${A("assets/img/bloco-desmontado.webp")}" style="position:absolute;left:-60px;top:200px;width:1020px;opacity:0">');
// c3: foto real do corte, com 1 2 3
set("c3", '<img src="${A("brand/instagram/midia/corte-peca.jpg")}" style="position:absolute;inset:0;width:900px;height:${H}px;object-fit:cover">' +
  [[284, 40, "1", "1 Concreto", 14], [460, 40, "2", "2 Isopor", 338], [617, 40, "3", "3 Concreto", 506]].map(([x, y, t, r, lx], i) => '<div class="dot" id="d' + i + '" style="left:' + (x - 31) + "px;top:" + y + 'px">' + t + '</div><div class="rot" id="r' + i + '" style="left:' + lx + 'px">' + r + "</div>").join(""));
// c4: as 3 camadas separadas
set("c4", '<div style="position:absolute;inset:0;background:#EAE6DE"></div><img src="${A("assets/img/bloco-desmontado.webp")}" style="position:absolute;left:-70px;top:120px;width:1040px">' + ["Concreto", "Isopor", "Concreto"].map((t, i) => '<div class="rot" id="p' + i + '" style="left:' + [16, 330, 600][i] + 'px;font-size:32px">' + t + "</div>").join(""));
// c5: concreto dá a força + face lisa
set("c5", '<div id="k0" class="cartao" style="position:absolute;left:0;right:0;top:0;height:420px;background:#1F4BD8;color:#fff"><svg viewBox="0 0 48 48" width="140" height="140" style="flex:none"><rect x="6" y="10" width="36" height="8" fill="currentColor"/><rect x="6" y="20" width="36" height="8" fill="none" stroke="currentColor" stroke-width="3"/><rect x="6" y="30" width="36" height="8" fill="currentColor"/></svg><div><div class="exp">Concreto</div><p>dá a força</p></div></div>' +
  '<div id="k1" style="position:absolute;left:0;right:0;top:450px;height:530px;border-radius:22px;overflow:hidden"><img src="${A("brand/instagram/midia/face-peca.jpg")}" style="width:900px;height:530px;object-fit:cover"><div class="tag">Face lisa, pronta pro acabamento</div></div>');
// c6: isopor segura calor e barulho (painéis da arte)
set("c6", '<div id="q0" class="cartao" style="position:absolute;left:0;right:0;top:0;height:200px;background:#fff;color:#1E2023;border:3px solid #E0DCD3"><div class="exp" style="font-size:64px">Isopor</div><p style="margin:0;font-size:44px">segura calor e barulho</p></div>' +
  '<div id="q1" class="painel" style="top:230px;height:360px"><img src="${A("brand/instagram/midia/painel-3.jpg")}" style="margin-top:-60px"></div><div id="q2" class="painel" style="top:620px;height:360px"><img src="${A("brand/instagram/midia/painel-4.jpg")}" style="margin-top:-60px"></div>');
// c7: sem mofo
set("c7", '<div style="position:absolute;inset:0;background:#F3F1EC"></div><div id="m0" class="painel" style="top:110px;height:760px"><img src="${A("brand/instagram/midia/painel-5.jpg")}"></div>');
// c8: "e tem mais"
set("c8", '<div style="position:absolute;inset:0;background:#1F4BD8;display:grid;place-items:center"><div id="mais" class="exp" style="color:#fff;font-size:150px;text-align:center">E tem<br>mais</div></div>');
// c9: maquete 3D (janela)
set("c9", '<div class="tag">Maquete 3D · casa de Blocão</div>');
// c10: elétrica e fixação
const barra = (c, e) => '<div style="display:flex;width:520px;height:560px"><i style="flex:' + c + ';background:#A8A39A"></i><i style="flex:' + e + ';background:#fff;box-shadow:inset 0 0 0 2px #cfcac0;position:relative"><svg viewBox="0 0 100 560" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"><path id="cond" d="M50 540 L50 360 L22 330 L78 250 L50 220 L50 20" fill="none" stroke="#1F4BD8" stroke-width="9" stroke-linejoin="round" stroke-dasharray="1000" stroke-dashoffset="1000"/></svg></i><i style="flex:' + c + ';background:#A8A39A"></i></div>';
set("c10", '<div id="e0" style="position:absolute;inset:0;background:#EAE6DE"><div style="position:absolute;left:190px;top:60px">' + barra(3.5, 8) + '</div><div class="rot" style="left:20px;bottom:40px">Tubos pelo miolo</div><div class="rot" style="right:20px;bottom:40px">Fácil de recortar</div></div>' +
  '<div id="e1" style="position:absolute;inset:0;background:#EAE6DE;opacity:0"><div style="position:absolute;left:90px;top:80px;width:190px;height:820px;background:#A8A39A;border-radius:6px"></div><div id="prat" style="position:absolute;left:280px;top:300px;width:520px;height:34px;background:#B9855A;border-radius:6px"></div><div style="position:absolute;left:640px;top:210px;width:110px;height:90px;background:#1F4BD8;border-radius:12px"></div><div style="position:absolute;left:272px;top:290px;width:34px;height:54px;background:#1E2023;border-radius:6px"></div><div class="rot" style="left:20px;bottom:40px">Armário e prateleira</div><div class="rot" style="right:20px;bottom:40px">Bucha certa</div></div>');
// c11: espessuras
const esp = [[10, 2.5, 5, "dez"], [13, 3.5, 6, "treze"], [15, 3.5, 8, "quinze"], [20, 3.5, 13, "vinte"]];
set("c11", '<div style="position:absolute;inset:0;background:#F3F1EC"></div>' + esp.map(([t, c, e], i) => '<div id="g' + i + '" style="position:absolute;left:30px;right:30px;top:' + (40 + i * 230) + 'px;height:190px;display:flex;align-items:center;gap:30px"><div class="exp" style="font-size:96px;width:300px;flex:none">' + t + '<span style="font-size:42px"> cm</span></div><div style="display:flex;height:96px;flex:1;border-radius:8px;overflow:hidden"><i style="flex:' + c + ';background:#A8A39A"></i><i style="flex:' + e + ';background:#fff;box-shadow:inset 0 0 0 2px #cfcac0"></i><i style="flex:' + c + ';background:#A8A39A"></i></div></div>').join(""));
// c12: peça real (janela)
set("c12", '<div class="tag">Peça real · nossa fábrica</div>');

function legenda(t) {
  $("sub").style.color = t >= T.s[12] ? "#fff" : "#1E2023"; // no cartão azul final a legenda fica branca
  let txt = "";
  for (const c of CH) if (t >= c.t0 && t < c.t1) { txt = c.texto; break; }
  if ($("sub").dataset.t !== txt) { $("sub").dataset.t = txt; $("sub").textContent = txt; }
}
function render(t) {
  legenda(t);
  const FIM = T.s[12];
  // cena atual
  let cena = 0; for (let k = 0; k < 12; k++) if (t >= T.s[k]) cena = k;
  const l = t - T.s[cena], dur = T.s[cena + 1] - T.s[cena];
  const fade = Math.min(clamp(l / 0.12), clamp((dur - l) / 0.1));
  TITULOS.forEach((x, i) => { const h = $("h" + i); const on = i === cena && x && cena < 12; h.style.display = on ? "block" : "none"; if (on) { h.style.opacity = fade; h.children[0].style.transform = "translateY(" + 40 * (1 - out(l / 0.3)) + "px)"; h.children[1].style.transform = "translateY(" + 40 * (1 - out((l - 0.06) / 0.3)) + "px)"; } });
  for (let i = 1; i <= 12; i++) { const e = $("c" + i); const on = i - 1 === cena; e.style.display = on ? "block" : "none"; if (on) e.style.opacity = fade; }
  const dentro = cena < 12; $("jan").style.display = $("mol").style.display = dentro ? "block" : "none"; $("logo").style.display = dentro ? "block" : "none";
  // 1: tijolos caem e somem
  const sai = clamp((l - 0.55) / 0.5);
  pilha.forEach((b) => { const k = clamp((l - b.d) / 0.3); b.e.style.opacity = k > 0 ? 1 - sai : 0; b.e.style.transform = "translate(" + b.x + "px," + (b.y - (1 - quica(k)) * 900 + sai * 140) + "px) rotate(" + ((1 - k) * 18 + sai * 25) + "deg) scale(" + (1 - sai * 0.3) + ")"; });
  // 2: bloco aparece e abre em "já existe"
  const e2 = out((t - T.s[1]) / 0.4), a2 = clamp((t - T.ja + 0.1) / 0.4);
  $("b1").style.opacity = 1 - a2; $("b2").style.opacity = a2; $("b1").style.transform = $("b2").style.transform = "scale(" + (0.8 + 0.2 * e2) + ") rotate(" + (1 - e2) * -6 + "deg)";
  // 3: 1 2 3 nas palavras
  [T.d1, T.d2, T.d3].forEach((td, i) => { const k = back((t - (td - 0.1)) / 0.3); $("d" + i).style.opacity = clamp((t - (td - 0.1)) / 0.1); $("d" + i).style.transform = "scale(" + k + ")"; $("r" + i).style.opacity = clamp((t - td) / 0.12); $("r" + i).style.transform = "translateY(" + 18 * (1 - out((t - td) / 0.25)) + "px)"; });
  // 4: nomes das camadas
  [0, 1, 2].forEach((i) => { const k = back((l - (0.2 + i * 0.4)) / 0.3); const e = $("p" + i); e.style.opacity = clamp((l - (0.2 + i * 0.4)) / 0.12); e.style.transform = "scale(" + (0.4 + 0.6 * k) + ")"; });
  // 5: cartão + foto da face lisa
  $("k0").style.opacity = out(l / 0.3); $("k0").style.transform = "translateX(" + 100 * (1 - out(l / 0.35)) + "px)";
  const kf = out((t - T.face + 0.15) / 0.4); $("k1").style.opacity = kf; $("k1").style.transform = "translateY(" + 80 * (1 - kf) + "px)";
  // 6: painéis do calor e do barulho
  $("q0").style.opacity = out(l / 0.3);
  const qa = out((t - T.calor + 0.3) / 0.4), qb = out((t - T.barulho + 0.3) / 0.4);
  $("q1").style.opacity = qa; $("q1").style.transform = "translateX(" + 140 * (1 - qa) + "px)"; $("q2").style.opacity = qb; $("q2").style.transform = "translateX(" + -140 * (1 - qb) + "px)";
  // 7: sem mofo
  const km = back(l / 0.4); $("m0").style.transform = "scale(" + (0.85 + 0.15 * clamp(km)) + ")";
  // 8: e tem mais
  $("mais").style.transform = "scale(" + (0.7 + 0.3 * back(l / 0.3)) + ")";
  // 9 e 12: etiquetas
  $("c9").firstChild.style.opacity = clamp((l - 0.4) / 0.3); $("c12").firstChild.style.opacity = clamp((l - 0.3) / 0.3);
  // 10: tubos (desenha o traço) e prateleira
  const trans = clamp((t - (T.fixar - 0.15)) / 0.25);
  $("e0").style.opacity = 1 - trans; $("e1").style.opacity = trans;
  $("cond").style.strokeDashoffset = 1000 * (1 - clamp((t - T.elet) / 1.4));
  $("prat").style.transform = "translateX(" + 200 * (1 - out((t - T.fixar) / 0.5)) + "px)";
  // 11: espessuras
  [T.dez, T.treze, T.quinze, T.vinte].forEach((tt, i) => { const k = out((t - (tt - 0.15)) / 0.4); const g = $("g" + i); g.style.opacity = k; g.style.transform = "translateX(" + 120 * (1 - k) + "px)"; });
  // 13: cartão final
  $("fim").style.display = t >= FIM ? "block" : "none"; $("fim").style.opacity = clamp((t - FIM) / 0.2);
  const lf = t - FIM;
  [["f1", 0], ["f2", T.chama - FIM - 0.1], ["f3", T.chama - FIM + 0.4], ["f4", T.imp - FIM - 0.1]].forEach(([id, d]) => { const k = out((lf - Math.max(0, d)) / 0.4); $(id).style.opacity = k; $(id).style.transform = "translateY(" + 40 * (1 - k) + "px)"; });
}
window.render = render;
</script>`;

(async () => {
  fs.writeFileSync(`${TMP}/o.html`, html);
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(`file://${TMP}/o.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => (i.onload = i.onerror = r))))));
  if (soUm !== undefined) { await p.evaluate((t) => window.render(t), +soUm); await p.screenshot({ path: saida, omitBackground: true }); await br.close(); console.log("quadro:", saida); return; }
  const N = Math.round(DUR * FPS);
  for (let k = 0; k < N; k++) {
    await p.evaluate((t) => window.render(t), k / FPS);
    await p.screenshot({ path: `${TMP}/o-${String(k).padStart(4, "0")}.png`, omitBackground: true });
    if (k % 200 === 0) console.log("quadro", k, "de", N);
  }
  await br.close();
  const t9a = T.s[8], t9b = T.s[9], t12a = T.s[11], t12b = T.s[12];
  const f3d = Math.ceil((t9b - t9a) * FPS);
  execFileSync("ffmpeg", ["-v", "error", "-y",
    "-f", "lavfi", "-i", `color=c=0xF3F1EC:s=1080x1920:r=${FPS}:d=${DUR}`,
    "-framerate", String(FPS), "-start_number", "14", "-i", path.join(dir3d, "f-%04d.jpg"),
    "-ss", "0", "-t", String(t12b - t12a + 0.2), "-i", clipe,
    "-framerate", String(FPS), "-i", `${TMP}/o-%04d.png`,
    "-i", audio,
    "-filter_complex",
    `[1:v]trim=0:${(f3d / FPS).toFixed(3)},setpts=PTS-STARTPTS,crop=675:735:0:232,scale=${W}:${H}:flags=lanczos,setpts=PTS+${t9a.toFixed(3)}/TB[a3];` +
    `[2:v]crop=472:514:0:168,scale=${W}:${H}:flags=lanczos,unsharp=5:5:0.8,eq=contrast=1.05:saturation=0.95,fps=${FPS},setpts=PTS+${t12a.toFixed(3)}/TB[a5];` +
    `[0:v][a3]overlay=90:${Y0}:enable='between(t,${t9a.toFixed(3)},${t9b.toFixed(3)})':eof_action=repeat[x];[x][a5]overlay=90:${Y0}:enable='between(t,${t12a.toFixed(3)},${t12b.toFixed(3)})':eof_action=pass[y];[y][3:v]overlay=0:0:format=auto,format=yuv420p[o];[4:a]apad,atrim=0:${DUR.toFixed(3)}[au]`,
    "-map", "[o]", "-map", "[au]", "-t", String(DUR), "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", saida]);
  console.log("ok:", saida, DUR.toFixed(2), "s");
})();

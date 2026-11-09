/* Gera assets/js/tour-dublado-dados.js (legendas e cenas da tour dublada, com o tempo contado a partir do começo da tour)
 * e o áudio assets/audio/tour-explicada.mp3 (só o trecho da narração que explica a tour).
 * Uso: node dados_tour_dublado.js <tempos.json> <narracao.mp3> */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const [temposJson, mp3] = process.argv.slice(2);
const RAIZ = path.resolve(__dirname, "../..");
const P = JSON.parse(fs.readFileSync(temposJson, "utf8")).palavras;
const norm = (s) => s.toLowerCase().replace(/[^a-záéíóúâêôãõç-]/g, "");
const idx = (w, depois = 0) => { const i = P.findIndex((p, k) => k >= depois && norm(p.w) === w); if (i < 0) throw new Error(w); return i; };
const ini = (i) => P[i].ini;
const iCada = idx("cada"), iConc = idx("concreto", idx("função")), iIso = idx("isopor", iConc), iBar = idx("barulho"), iEle = idx("ele", iBar), iMofo = idx("mofo"), iMais = idx("mais", iMofo), iComo = idx("como", iMais), iElet = idx("elétrica"), iFix = idx("fixar"), iBloc = idx("blocão", iFix), iTudo = idx("tudo"), iQuer = idx("quer");
const b = (i) => Math.max(0, ini(i) - 0.05);
const OFF = b(iCada), FIM = b(iQuer);
const r = (x) => Math.round((x - OFF) * 100) / 100;
// legendas (mesmo corte do vídeo): pedaços curtos, na pontuação
const chunks = []; let cur = [];
const fecha = () => { if (cur.length) { chunks.push([Math.max(0, cur[0].ini - 0.04), cur.map((p) => p.w + p.p).join(" ").replace(/É-Pê-Ésse/g, "EPS")]); cur = []; } };
P.forEach((p, k) => { cur.push(p); const len = cur.reduce((s, q) => s + q.w.length + q.p.length + 1, 0); const forte = /[.?…:]$/.test(p.p), fraca = /,$/.test(p.p), prox = P[k + 1]; if (forte || (fraca && cur.length >= 3) || cur.length >= 7 || (prox && len + prox.w.length > 40)) fecha(); });
fecha();
const leg = chunks.map((c, i) => [r(c[0]), r(i + 1 < chunks.length ? chunks[i + 1][0] : FIM), c[1]]).filter((c) => c[1] > 0 && c[0] < r(FIM) && c[1] - Math.max(0, c[0]) > 0.2).map((c) => [Math.max(0, c[0]), Math.min(c[1], r(FIM)), c[2]]);
const dados = {
  duracao: r(FIM),
  // começo (s) de cada cena: concreto, isopor, mofo, e tem mais, leve e rápido, elétrica e fixação, espessuras, Itapetininga
  cenas: [iConc - 1, iIso - 1, iEle, iMais - 2, iComo, iElet - 3, iBloc, iTudo].map((i) => r(b(i))).concat([r(FIM)]),
  calor: r(ini(idx("calor"))), barulho: r(ini(iBar)), elet: r(ini(iElet)), fixar: r(ini(iFix)),
  dez: r(ini(idx("dez"))), treze: r(ini(idx("treze"))), quinze: r(ini(idx("quinze"))), vinte: r(ini(idx("vinte"))),
  legendas: leg,
};
fs.writeFileSync(path.join(RAIZ, "assets/js/tour-dublado-dados.js"), "/* gerado por brand/scripts/dados_tour_dublado.js */\nwindow.TOUR_DUBLADO_DADOS = " + JSON.stringify(dados) + ";\n");
execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", OFF.toFixed(3), "-t", (FIM - OFF).toFixed(3), "-i", mp3, "-ac", "1", "-ar", "32000", "-b:a", "56k", path.join(RAIZ, "assets/audio/tour-explicada.mp3")]);
console.log("tour de", dados.duracao, "s,", leg.length, "legendas");

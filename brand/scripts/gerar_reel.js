/* Reel 9:16 (1080×1920) com a peça real do Blocão: moldura da marca + cartão final.
 * Uso: node brand/scripts/gerar_reel.js <video-origem.mp4> <saida.mp4>   (precisa de ffmpeg e do playwright do projeto) */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const [origem, saida] = process.argv.slice(2);
const RAIZ = path.resolve(__dirname, "../..");
const TMP = fs.mkdtempSync("/tmp/reel-");
const A = (p) => "file://" + path.join(RAIZ, p);
const base = `@font-face{font-family:Archivo;src:url("${A("assets/fonts/archivo-latin.woff2")}");font-weight:400 900;font-stretch:62% 125%}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;background:#F3F1EC;font-family:Archivo,sans-serif;color:#1E2023;position:relative;overflow:hidden}
.exp{font-stretch:125%;font-weight:900;text-transform:uppercase;line-height:1.02;letter-spacing:-.01em}.az{color:#1F4BD8}`;
const quadro = `<body><style>${base}</style>
  <img src="${A("assets/img/marca.svg")}" style="position:absolute;left:90px;top:96px;height:48px">
  <h1 class="exp" style="position:absolute;left:90px;top:190px;font-size:84px">O Blocão<br><span class="az">de verdade.</span></h1>
  <div style="position:absolute;left:92px;top:520px;width:896px;height:1192px;border:8px solid #1F4BD8;border-radius:6px"></div>
  <div style="position:absolute;left:90px;right:90px;bottom:90px;display:flex;justify-content:space-between;font-size:30px;font-weight:600"><span>Peça real · nossa fábrica</span><span>Itapetininga-SP</span></div></body>`;
const fim = `<body style="background:#1F4BD8;color:#fff"><style>${base} body{background:#1F4BD8;color:#fff}</style>
  <img src="${A("assets/img/marca-clara.svg")}" style="position:absolute;left:90px;top:96px;height:48px">
  <div style="position:absolute;left:90px;right:90px;top:560px"><h1 class="exp" style="font-size:110px">Faça seu orçamento.</h1>
  <p style="font-size:46px;line-height:1.3;margin-top:50px">Chama no WhatsApp e a gente responde.</p>
  <p class="exp" style="font-size:72px;margin-top:70px">(15) 99121-2917</p></div></body>`;
(async () => {
  const b = await chromium.launch();
  for (const [n, h] of [["quadro", quadro], ["fim", fim]]) {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    fs.writeFileSync(`${TMP}/${n}.html`, `<!doctype html><meta charset=utf-8>${h}`); // arquivo local: about:blank não carrega imagem/fonte
    await p.goto(`file://${TMP}/${n}.html`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: `${TMP}/${n}.png` });
    await p.close();
  }
  await b.close();
  // peça real: recorta a área útil (472×630), tira o áudio, 2 trechos com fusão, ajuste leve de nitidez e cor
  const f = "crop=472:630:0:110,scale=880:1176:flags=lanczos,unsharp=5:5:0.8,eq=contrast=1.06:saturation=0.95,setsar=1,fps=30";
  const ff = (a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: "inherit" });
  ff(["-i", origem, "-filter_complex",
    `[0:v]trim=0:4.2,setpts=PTS-STARTPTS,${f}[a];[0:v]trim=6:9.6,setpts=PTS-STARTPTS,${f}[b];[a][b]xfade=transition=fade:duration=0.5:offset=3.7[v]`,
    "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", `${TMP}/peca.mp4`]);
  ff(["-loop", "1", "-t", "7.3", "-i", `${TMP}/quadro.png`, "-i", `${TMP}/peca.mp4`, "-loop", "1", "-t", "2.5", "-i", `${TMP}/fim.png`,
    "-filter_complex",
    "[0:v][1:v]overlay=100:528:shortest=1,fps=30,format=yuv420p,fade=in:0:10[m];[2:v]fps=30,format=yuv420p,fade=in:0:8[e];[m][e]concat=n=2:v=1:a=0[o]",
    "-map", "[o]", "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", saida]);
  console.log("ok:", saida);
})();

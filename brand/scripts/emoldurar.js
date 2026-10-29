#!/usr/bin/env node
/**
 * Põe fotos e vídeos da produção na MOLDURA de postagem do Império do EPS (brand/facebook/moldura.html),
 * pronta pra Facebook e Instagram.
 *
 *   node brand/scripts/emoldurar.js foto.jpg video.mp4 [--formato retrato] [--titulo "A parede que *sobe rápido*"]
 *        [--sobre "Obra real"] [--saida pasta]
 *
 * --formato  quadrado (1080×1080) · retrato (1080×1350, o melhor pro feed) · vertical (1080×1920, Reels/Stories)
 *            · paisagem (1920×1080, vídeo deitado). Sem --formato: escolhe pela proporção do arquivo.
 * --titulo   título grande acima da foto (*palavra* = azul). --sobre = linha pequena acima do título.
 * --saida    pasta dos arquivos prontos (padrão: "emoldurados", ao lado do 1º arquivo).
 * Foto → JPG; vídeo → MP4 (H.264 + AAC, 30 qps, com o áudio original). Precisa de: Playwright (Chromium) e ffmpeg.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { servir, abrirNavegador } = require("./navegador.js");

const VIDEO = /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i;
const FORMATOS = ["quadrado", "retrato", "vertical", "paisagem"];

function argumentos(lista) {
  const a = { arquivos: [], formato: null, titulo: "", sobre: "", saida: null };
  for (let i = 0; i < lista.length; i++) {
    const v = lista[i];
    if (v === "--formato") a.formato = lista[++i];
    else if (v === "--titulo") a.titulo = lista[++i] || "";
    else if (v === "--sobre") a.sobre = lista[++i] || "";
    else if (v === "--saida") a.saida = lista[++i];
    else a.arquivos.push(v);
  }
  if (a.formato && !FORMATOS.includes(a.formato)) throw new Error(`--formato deve ser: ${FORMATOS.join(", ")}`);
  if (!a.arquivos.length) throw new Error("Passe ao menos uma foto ou vídeo.");
  return a;
}

/** largura × altura (já girada, como aparece) de uma foto ou vídeo */
function medidas(arquivo) {
  const saida = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=width,height:stream_side_data=rotation:stream_tags=rotate", "-of", "json", arquivo]).toString();
  const s = JSON.parse(saida).streams[0];
  const giro = Math.abs(Number((s.tags && s.tags.rotate) || (s.side_data_list || []).map((d) => d.rotation).find((r) => r !== undefined) || 0));
  return giro % 180 === 90 ? [s.height, s.width] : [s.width, s.height];
}

function formatoPara([w, h]) {
  const r = w / h;
  if (r >= 1.3) return "paisagem";
  if (r <= 0.7) return "vertical";
  if (r >= 0.9) return "quadrado";
  return "retrato";
}

/** desenha a moldura (PNG transparente no lugar da foto) e devolve { png, w, h, janela } */
async function desenharMoldura(navegador, porta, formato, titulo, sobre, pasta) {
  const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1920 } });
  const q = new URLSearchParams({ formato, titulo, sobre });
  await pagina.goto(`http://127.0.0.1:${porta}/brand/facebook/moldura.html?${q}`);
  const info = await pagina.evaluate(() => window.molduraPronta);
  const png = path.join(pasta, `moldura-${formato}.png`);
  await pagina.locator("#arte").screenshot({ path: png, omitBackground: true });
  await pagina.close();
  return { png, ...info };
}

function emoldurar(arquivo, m, destino) {
  const { w, h, janela: j } = m;
  // fundo cal → foto/vídeo cobrindo a janela (corta o que sobra, sem distorcer) → moldura por cima
  const filtro = `color=c=0xF3F1EC:s=${w}x${h}[fundo];` +
    `[0:v]scale=${j.w}:${j.h}:force_original_aspect_ratio=increase,crop=${j.w}:${j.h},setsar=1[foto];` +
    `[fundo][foto]overlay=${j.x}:${j.y}:shortest=1[base];[base][1:v]overlay=0:0,format=yuv420p[v]`;
  const ehVideo = VIDEO.test(arquivo);
  const args = ["-y", "-v", "error", "-i", arquivo, "-i", m.png, "-filter_complex", filtro, "-map", "[v]"];
  if (ehVideo) {
    args.push("-map", "0:a?", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", destino);
  } else {
    args.push("-frames:v", "1", "-q:v", "2", destino);
  }
  execFileSync("ffmpeg", args, { stdio: "inherit" });
}

(async () => {
  const a = argumentos(process.argv.slice(2));
  const saida = path.resolve(a.saida || path.join(path.dirname(path.resolve(a.arquivos[0])), "emoldurados"));
  fs.mkdirSync(saida, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "moldura-"));
  const srv = await servir();
  const navegador = await abrirNavegador();
  const molduras = {};
  try {
    for (const arquivo of a.arquivos) {
      const formato = a.formato || formatoPara(medidas(arquivo));
      if (!molduras[formato]) molduras[formato] = await desenharMoldura(navegador, srv.address().port, formato, a.titulo, a.sobre, tmp);
      const ext = VIDEO.test(arquivo) ? ".mp4" : ".jpg";
      const destino = path.join(saida, `${path.parse(arquivo).name}-${formato}${ext}`);
      emoldurar(arquivo, molduras[formato], destino);
      console.log(`✔ ${destino}`);
    }
  } finally {
    await navegador.close();
    srv.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => { console.error(`✘ ${e.message}`); process.exit(1); });

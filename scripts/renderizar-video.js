// Renderiza um vídeo da pasta /video quadro a quadro (sem depender de tempo real) e junta a música com ffmpeg.
// Uso: node scripts/renderizar-video.js index.html video/como-orcar.mp4 31.8 video/trilha-como-orcar.mp3 [porta]
// Precisa do servidor estático da raiz do projeto rodando (ex.: python3 -m http.server 8765) e de imageio-ffmpeg.
const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
const path = require('path');
const [, , pagina, saida, dur, musica, porta = '8765'] = process.argv;
const FPS = 30;
const FONTES = `@font-face{font-family:'Archivo Black';src:url(http://localhost:${porta}/video/fontes/ArchivoBlack-Regular.ttf)}
@font-face{font-family:'Work Sans';src:url(http://localhost:${porta}/video/fontes/WorkSans.ttf);font-weight:100 900}`;
(async () => {
  const ffmpeg = execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
  // WebGL por software (SwiftShader): o Blocão 3D renderiza igual em qualquer máquina, sem GPU
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  // NITIDEZ=2 (padrão): grava como tela Retina (2160×3840) e reduz pra 1080×1920 no final — o site dentro do
  // celular é ampliado 1,6× no vídeo e, gravado em 1×, ficava desfocado
  const NITIDEZ = +(process.env.NITIDEZ || 2);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: NITIDEZ });
  // sem internet na máquina de render: fontes do Google vêm da pasta local e o Firebase é simulado
  await ctx.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: FONTES }));
  await ctx.route(/fonts\.gstatic\.com/, r => r.abort());
  await ctx.route(/gstatic\.com\/firebasejs|jsdelivr|sentry/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.firebase=window.firebase||{initializeApp(){return {}},apps:[],firestore:()=>({}),auth:()=>({onAuthStateChanged(){}})};' }));
  const p = await ctx.newPage();
  p.on('console', m => { if (/VIDEO-ERRO/.test(m.text())) console.log(m.text()); });
  p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 120)));
  await p.goto(`http://localhost:${porta}/video/${pagina}?gravar`);
  await p.waitForFunction('window.__pronto === true', null, { timeout: 30000 });
  await p.evaluate('document.fonts.ready');
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (musica) args.push('-i', musica);
  args.push('-map', '0:v', ...(musica ? ['-map', '1:a'] : []), '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    ...(musica ? ['-c:a', 'aac', '-b:a', '192k'] : []), '-t', dur, '-movflags', '+faststart', saida);
  const soAmostras = !!process.env.SO_AMOSTRAS; // só gera os quadros de amostra (teste rápido, sem MP4)
  const ff = soAmostras ? null : spawn(ffmpeg, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(+dur * FPS);
  const amostras = (process.env.AMOSTRAS || '').split(',').filter(Boolean).map(Number);
  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    await p.evaluate(x => window.quadro(x), t);
    const ehAmostra = amostras.some(a => Math.abs(a - t) < 1 / FPS / 2);
    if (soAmostras && !ehAmostra) continue;
    const img = await p.screenshot({ type: 'jpeg', quality: 96 });
    if (ehAmostra) require('fs').writeFileSync(path.join(path.dirname(saida), `amostra-${t.toFixed(2)}.jpg`), img);
    if (ff && !ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log('quadro', i, '/', total);
  }
  if (ff) { ff.stdin.end(); await new Promise(r => ff.on('close', r)); }
  await b.close();
  console.log('pronto', saida);
})();

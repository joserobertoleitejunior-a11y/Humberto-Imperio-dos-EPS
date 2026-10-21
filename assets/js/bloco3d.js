/**
 * Cena 3D do Blocão (Three.js) — bloco de concreto com miolo de EPS que
 * abre ao meio e mostra o interior.
 *
 * Realismo sem baixar imagem nenhuma: as texturas de concreto (agregado,
 * poros, manchas de cura) e de EPS (pérolas expandidas) são geradas em
 * canvas no próprio aparelho, no tamanho que ele aguenta.
 *
 * Desempenho (celular e PC fracos):
 *  - qualidade por nível (html[data-qualidade] = alta | media | baixa);
 *  - render SOB DEMANDA: só desenha quando o estado muda (rolagem) ou
 *    durante o "respiro" da hero em aparelho bom; parado = 0 % de GPU;
 *  - se o aparelho engasgar (quadro > 32 ms), baixa a resolução sozinho.
 *
 * API (window.ImperioBloco3D, criada quando este módulo carrega):
 *   iniciar(canvas) → Promise
 *   estado({ abertura, giro, inclinar, cx, cy, larg, espessura })  — valores-alvo;
 *     cx/cy/larg = onde o bloco deve ficar NA TELA (px): o layout (CSS) decide o lugar
 *   renderAgora()   — desenha já (usado pelo vídeo, quadro a quadro)
 */
import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, CanvasTexture, Color, DirectionalLight, Group, HemisphereLight,
  IcosahedronGeometry, InstancedMesh, MathUtils, Matrix4, Mesh, Vector3, MeshBasicMaterial, MeshStandardMaterial, Object3D,
  PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator, RepeatWrapping, RoomEnvironment, Scene,
  ShadowMaterial, SRGBColorSpace, WebGLRenderer,
} from "../vendor/three-imperio.min.js";

const NIVEIS = {
  alta: { dpr: 2, tex: 1024, sombra: true, particulas: 70, antialias: true },
  media: { dpr: 1.5, tex: 1024, sombra: false, particulas: 34, antialias: true },
  baixa: { dpr: 1, tex: 512, sombra: false, particulas: 0, antialias: false },
};

// Medidas em metros. Face do bloco PROVISÓRIA (confirmar com o Vinicius).
const COMPRIMENTO = 1.0;
const ALTURA = 0.5;
const TEXTURA_M = 0.25; // 1 repetição da textura a cada 25 cm (escala real do agregado/pérolas)

/* ------------------------------------------------------------------ */
/* Texturas procedurais                                                */
/* ------------------------------------------------------------------ */
function aleatorio(semente) {
  let s = semente;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function tela(tam) {
  const c = document.createElement("canvas");
  c.width = c.height = tam;
  return c;
}

/** Ruído de valor em várias oitavas, contínuo nas bordas (textura repete sem emenda). */
function ruido(tam, oitavas, r, base = 4) {
  const out = new Float32Array(tam * tam);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < oitavas; o++) {
    const n = base << o;
    const grade = new Float32Array(n * n).map(() => r());
    const passo = tam / n;
    for (let y = 0; y < tam; y++) {
      const gy = y / passo;
      const y0 = Math.floor(gy) % n;
      const y1 = (y0 + 1) % n;
      const fy = gy - Math.floor(gy);
      const sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < tam; x++) {
        const gx = x / passo;
        const x0 = Math.floor(gx) % n;
        const x1 = (x0 + 1) % n;
        const fx = gx - Math.floor(gx);
        const sx = fx * fx * (3 - 2 * fx);
        const a = grade[y0 * n + x0] + (grade[y0 * n + x1] - grade[y0 * n + x0]) * sx;
        const b = grade[y1 * n + x0] + (grade[y1 * n + x1] - grade[y1 * n + x0]) * sx;
        out[y * tam + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Concreto: cor + relevo. "serrado" = face cortada (agregado graúdo aparente). */
function texturasConcreto(tam, serrado, semente) {
  const r = aleatorio(semente);
  const cor = tela(tam);
  const rel = tela(tam);
  const c = cor.getContext("2d");
  const b = rel.getContext("2d");
  const n = ruido(tam, 4, r, 8);
  const img = c.createImageData(tam, tam);
  const imgB = b.createImageData(tam, tam);
  for (let i = 0; i < n.length; i++) {
    const v = n[i];
    const grao = (r() - 0.5) * 22;
    const base = serrado ? 150 : 158;
    img.data[i * 4] = base + v * 24 - 12 + grao;
    img.data[i * 4 + 1] = base - 3 + v * 23 - 12 + grao;
    img.data[i * 4 + 2] = base - 9 + v * 21 - 12 + grao;
    img.data[i * 4 + 3] = 255;
    const h = 128 + (v - 0.5) * 90 + grao * 2.2;
    imgB.data[i * 4] = imgB.data[i * 4 + 1] = imgB.data[i * 4 + 2] = h;
    imgB.data[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  b.putImageData(imgB, 0, 0);
  const k = tam / 1024;
  // Agregado (pedrisco) — só aparece de verdade na face serrada
  const pedras = serrado ? 520 : 70;
  for (let i = 0; i < pedras; i++) {
    const x = r() * tam;
    const y = r() * tam;
    const raio = (serrado ? 4 + r() * 13 : 2 + r() * 4) * k;
    const tom = 95 + r() * 80;
    c.fillStyle = `rgba(${tom + 8},${tom + 4},${tom},${serrado ? 0.9 : 0.35})`;
    b.fillStyle = `rgba(255,255,255,${serrado ? 0.12 : 0.2})`;
    c.beginPath();
    b.beginPath();
    const lados = 6 + Math.floor(r() * 4);
    for (let l = 0; l < lados; l++) {
      const a = (l / lados) * Math.PI * 2;
      const rr = raio * (0.65 + r() * 0.45);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * (0.7 + r() * 0.3);
      if (l) {
        c.lineTo(px, py);
        b.lineTo(px, py);
      } else {
        c.moveTo(px, py);
        b.moveTo(px, py);
      }
    }
    c.fill();
    b.fill();
  }
  // Poros (bolhas de ar) — pontinhos escuros e fundos
  for (let i = 0; i < (serrado ? 260 : 420); i++) {
    const x = r() * tam;
    const y = r() * tam;
    const raio = (0.8 + r() * 2.6) * k;
    c.fillStyle = "rgba(60,58,54,.55)";
    b.fillStyle = "rgba(0,0,0,.85)";
    c.beginPath();
    c.arc(x, y, raio, 0, 7);
    c.fill();
    b.beginPath();
    b.arc(x, y, raio, 0, 7);
    b.fill();
  }
  return { cor, rel };
}

/** EPS: pérolas expandidas coladas umas nas outras (corte mostra as células). */
function texturasEPS(tam, semente) {
  const r = aleatorio(semente);
  const cor = tela(tam);
  const rel = tela(tam);
  const c = cor.getContext("2d");
  const b = rel.getContext("2d");
  c.fillStyle = "#e9e7e0";
  c.fillRect(0, 0, tam, tam);
  b.fillStyle = "#3a3a3a";
  b.fillRect(0, 0, tam, tam);
  const k = tam / 1024;
  const passo = 26 * k;
  for (let y = -passo; y < tam + passo; y += passo * 0.86) {
    const linha = Math.round(y / (passo * 0.86));
    for (let x = -passo; x < tam + passo; x += passo) {
      const cx = x + (linha % 2 ? passo / 2 : 0) + (r() - 0.5) * passo * 0.35;
      const cy = y + (r() - 0.5) * passo * 0.35;
      const raio = passo * (0.5 + r() * 0.16);
      for (const [dx, dy] of [[0, 0], [tam, 0], [-tam, 0], [0, tam], [0, -tam]]) {
        const gx = cx + dx;
        const gy = cy + dy;
        if (gx < -raio || gx > tam + raio || gy < -raio || gy > tam + raio) continue;
        const g = c.createRadialGradient(gx - raio * 0.25, gy - raio * 0.3, raio * 0.1, gx, gy, raio);
        const claro = 246 + r() * 8;
        g.addColorStop(0, `rgb(${claro},${claro},${claro - 4})`);
        g.addColorStop(0.75, "rgb(238,236,229)");
        g.addColorStop(1, "rgb(214,211,202)");
        c.fillStyle = g;
        c.beginPath();
        c.arc(gx, gy, raio, 0, 7);
        c.fill();
        const gb = b.createRadialGradient(gx, gy, 0, gx, gy, raio);
        gb.addColorStop(0, "#fff");
        gb.addColorStop(0.8, "#c8c8c8");
        gb.addColorStop(1, "#3a3a3a");
        b.fillStyle = gb;
        b.beginPath();
        b.arc(gx, gy, raio, 0, 7);
        b.fill();
      }
    }
  }
  return { cor, rel };
}

function textura(canvas, srgb, anis) {
  const t = new CanvasTexture(canvas);
  t.wrapS = t.wrapT = RepeatWrapping;
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = anis;
  return t;
}

/* ------------------------------------------------------------------ */
/* Geometria com UV em escala real (a textura não estica)              */
/* ------------------------------------------------------------------ */
function caixa(lx, ly, lz, desloc = 0) {
  const g = new BoxGeometry(lx, ly, lz);
  const uv = g.attributes.uv;
  // Ordem das faces do BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada)
  const tamanhos = [[lz, ly], [lz, ly], [lx, lz], [lx, lz], [lx, ly], [lx, ly]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      // faces que atravessam o corte (±y, ±z) continuam a textura da outra metade: sem emenda no bloco fechado
      const du = f >= 2 ? desloc / TEXTURA_M : f * 0.37;
      uv.setXY(i, (uv.getX(i) * tamanhos[f][0]) / TEXTURA_M + du, (uv.getY(i) * tamanhos[f][1]) / TEXTURA_M + f * 0.21);
    }
  }
  uv.needsUpdate = true;
  return g;
}

/* ------------------------------------------------------------------ */
/* Cena                                                                */
/* ------------------------------------------------------------------ */
const alvo = { abertura: 0, giro: -0.55, inclinar: 0.32, cx: -1, cy: 0, larg: 0, espessura: 15 };
const atual = { ...alvo };
let renderer;
let cena;
let camera;
let raiz;
let metades = [];
let particulas = null;
let nivel;
let sujo = true;
let respirar = false;
let ultimoTempo = 0;
let lentos = 0;
let ativo = true;
let geoAtual = 0;
let mats;

function camadas(esp) {
  const c = esp <= 10 ? 0.025 : 0.035;
  return { c, eps: esp / 100 - 2 * c };
}

function montarMetade(lado) {
  const g = new Group();
  const { c, eps } = camadas(geoAtual);
  const meio = COMPRIMENTO / 2;
  const desloc = lado > 0 ? meio : 0;
  const geoPele = caixa(meio, ALTURA, c, desloc);
  const geoMiolo = caixa(meio, ALTURA, eps, desloc);
  // Concreto: faces grandes (±z) = face lisa; bordas e corte = concreto serrado
  const matPele = [mats.serrado, mats.serrado, mats.serrado, mats.serrado, mats.liso, mats.liso];
  const peleA = new Mesh(geoPele, matPele);
  const peleB = new Mesh(geoPele, matPele);
  const miolo = new Mesh(geoMiolo, mats.eps);
  [peleA, peleB, miolo].forEach((m) => {
    m.castShadow = nivel.sombra;
    m.receiveShadow = nivel.sombra;
    g.add(m);
  });
  g.userData = { peleA, peleB, miolo, lado };
  posicionarCamadas(g, 0);
  return g;
}

function posicionarCamadas(g, afastar) {
  const { c, eps } = camadas(geoAtual);
  const { peleA, peleB, miolo } = g.userData;
  peleA.position.z = eps / 2 + c / 2 + afastar;
  peleB.position.z = -(eps / 2 + c / 2) - afastar;
  miolo.position.z = 0;
}

function reconstruir() {
  metades.forEach((m) => {
    raiz.remove(m);
    m.traverse((o) => o.geometry && o.geometry.dispose());
  });
  geoAtual = atual.espessura;
  metades = [montarMetade(-1), montarMetade(1)];
  metades.forEach((m) => raiz.add(m));
}

function criarParticulas() {
  if (!nivel.particulas) return;
  const geo = new IcosahedronGeometry(0.0045, 1);
  particulas = new InstancedMesh(geo, new MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.9 }), nivel.particulas);
  const r = aleatorio(11);
  particulas.userData.sementes = Array.from({ length: nivel.particulas }, () => [r() - 0.5, r(), r() - 0.5, 0.5 + r()]);
  particulas.visible = false;
  raiz.add(particulas);
}

function atualizarParticulas(a) {
  if (!particulas) return;
  particulas.visible = a > 0.05 && a < 0.98;
  if (!particulas.visible) return;
  const o = new Object3D();
  const m = new Matrix4();
  particulas.userData.sementes.forEach((s, i) => {
    const t = MathUtils.clamp((a - 0.05) / 0.9, 0, 1);
    o.position.set(s[0] * 0.08 * t, (s[1] - 0.5) * ALTURA * (0.9 + t * 0.4) - t * t * 0.25 * s[3], s[2] * 0.3 * t + 0.02);
    o.rotation.set(t * 6 * s[0], t * 5 * s[2], 0);
    const esc = Math.sin(Math.PI * t) * s[3];
    o.scale.setScalar(esc);
    o.updateMatrix();
    m.copy(o.matrix);
    particulas.setMatrixAt(i, m);
  });
  particulas.instanceMatrix.needsUpdate = true;
}

const _v = new Vector3();
const _d = new Vector3();
/** Ponto da tela (px) → ponto no plano z = 0 do mundo (onde o bloco fica). */
function telaParaMundo(px, py) {
  const el = renderer.domElement;
  if (!el.clientWidth || !el.clientHeight) return { x: 0, y: 0 };
  _v.set((px / el.clientWidth) * 2 - 1, -(py / el.clientHeight) * 2 + 1, 0.5).unproject(camera);
  _d.copy(_v).sub(camera.position).normalize();
  const t = -camera.position.z / _d.z;
  return { x: camera.position.x + _d.x * t, y: camera.position.y + _d.y * t };
}

let respiro = 0;

function aplicar() {
  if (Math.abs(atual.espessura - geoAtual) > 0.01 && Math.abs(atual.espessura - alvo.espessura) < 0.05) {
    atual.espessura = alvo.espessura;
    reconstruir();
  }
  const a = MathUtils.smootherstep(atual.abertura, 0, 1);
  const escalaZ = atual.espessura / geoAtual;
  metades.forEach((g) => {
    const lado = g.userData.lado;
    g.position.x = lado * (COMPRIMENTO / 4 + a * 0.1);
    g.position.y = a * 0.02;
    g.rotation.y = lado * a * 0.95;
    g.scale.z = escalaZ;
    posicionarCamadas(g, 0);
  });
  raiz.rotation.y = atual.giro;
  raiz.rotation.x = atual.inclinar;
  if (atual.larg > 0) {
    const centro = telaParaMundo(atual.cx, atual.cy);
    const borda = telaParaMundo(atual.cx + atual.larg / 2, atual.cy);
    raiz.position.set(centro.x, centro.y + respiro, 0);
    raiz.scale.setScalar(Math.max(0.05, (borda.x - centro.x) * 2) / COMPRIMENTO);
  } else {
    raiz.position.set(0, respiro, 0);
    raiz.scale.setScalar(1);
  }
  atualizarParticulas(atual.abertura);
}

function suavizar(dt) {
  let mudou = false;
  const k = 1 - Math.exp(-dt * 9);
  for (const chave in alvo) {
    const d = alvo[chave] - atual[chave];
    if (Math.abs(d) > 0.0004) {
      atual[chave] += d * k;
      mudou = true;
    } else if (d !== 0) {
      atual[chave] = alvo[chave];
      mudou = true;
    }
  }
  return mudou;
}

function desenhar() {
  aplicar();
  renderer.render(cena, camera);
}

function laco(t) {
  if (!ativo) return;
  requestAnimationFrame(laco);
  const dt = Math.min(0.05, (t - ultimoTempo) / 1000 || 0.016);
  const gasto = t - ultimoTempo;
  ultimoTempo = t;
  let mudou = suavizar(dt);
  if (respirar && nivel !== NIVEIS.baixa) {
    respiro = Math.sin(t / 1400) * 0.012;
    mudou = true;
  }
  if (!mudou && !sujo) return;
  sujo = false;
  desenhar();
  // Aparelho engasgando? Baixa a resolução (uma vez por nível).
  if (gasto > 32 && gasto < 200 && ++lentos > 40 && renderer.getPixelRatio() > 1) {
    renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.5));
    lentos = 0;
  }
}

function redimensionar() {
  const tela = renderer.domElement;
  const w = tela.clientWidth;
  const h = tela.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.set(0, 0.32, 2.2);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  sujo = true;
}

function iniciar(canvas) {
  nivel = NIVEIS[document.documentElement.getAttribute("data-qualidade")] || NIVEIS.media;
  renderer = new WebGLRenderer({ canvas, antialias: nivel.antialias, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!window.__gravandoVideo });
  renderer.setPixelRatio(Math.min(nivel.dpr, window.devicePixelRatio || 1));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = nivel.sombra;
  renderer.shadowMap.type = PCFSoftShadowMap;

  cena = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.55;
  pmrem.dispose();

  camera = new PerspectiveCamera(28, 1, 0.05, 20);

  const sol = new DirectionalLight(0xfff4e6, 2.4);
  sol.position.set(-1.1, 3.0, 2.6);
  sol.castShadow = nivel.sombra;
  if (nivel.sombra) {
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.camera.left = sol.shadow.camera.bottom = -1.8;
    sol.shadow.camera.right = sol.shadow.camera.top = 1.8;
    sol.shadow.radius = 6;
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.02;
  }
  cena.add(sol);
  const contra = new DirectionalLight(0xdfe8ff, 0.9);
  contra.position.set(2, 0.6, -1.5);
  cena.add(contra);
  cena.add(new HemisphereLight(0xffffff, 0xbdb6a8, 0.5));
  cena.add(new AmbientLight(0xffffff, 0.08));

  const anis = Math.min(nivel.tex >= 1024 ? 8 : 2, renderer.capabilities.getMaxAnisotropy());
  const liso = texturasConcreto(nivel.tex, false, 7);
  const serrado = texturasConcreto(nivel.tex, true, 19);
  const eps = texturasEPS(nivel.tex, 5);
  mats = {
    liso: new MeshStandardMaterial({ map: textura(liso.cor, true, anis), bumpMap: textura(liso.rel, false, anis), bumpScale: 1.6, roughness: 0.93, metalness: 0 }),
    serrado: new MeshStandardMaterial({ map: textura(serrado.cor, true, anis), bumpMap: textura(serrado.rel, false, anis), bumpScale: 2.2, roughness: 0.82, metalness: 0 }),
    eps: new MeshStandardMaterial({ map: textura(eps.cor, true, anis), bumpMap: textura(eps.rel, false, anis), bumpScale: 3, roughness: 0.97, metalness: 0, color: new Color(1, 1, 1) }),
  };

  raiz = new Group();
  cena.add(raiz);
  reconstruir();
  criarParticulas();

  // Sombra no "chão" do estúdio: real (nível alto) ou mancha suave (demais)
  const chao = new PlaneGeometry(6, 6);
  if (nivel.sombra) {
    const piso = new Mesh(chao, new ShadowMaterial({ opacity: 0.22 }));
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = -ALTURA / 2 - 0.12;
    piso.receiveShadow = true;
    raiz.add(piso);
  } else {
    const c = tela(128);
    const x = c.getContext("2d");
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, "rgba(40,36,30,.32)");
    g.addColorStop(1, "rgba(40,36,30,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    const mancha = new Mesh(new PlaneGeometry(1.5, 0.55), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }));
    mancha.rotation.x = -Math.PI / 2;
    mancha.position.y = -ALTURA / 2 - 0.12;
    raiz.add(mancha);
  }

  redimensionar();
  window.addEventListener("resize", redimensionar, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (window.__gravandoVideo) return;
    const antes = ativo;
    ativo = !document.hidden;
    if (ativo && !antes) requestAnimationFrame(laco);
  });
  desenhar();
  // No gravador do vídeo quem manda desenhar é o vídeo (renderAgora a cada quadro): sem laço próprio
  if (window.__gravandoVideo) ativo = false;
  else requestAnimationFrame(laco);
}

window.ImperioBloco3D = {
  iniciar: (canvas) => {
    iniciar(canvas);
    return Promise.resolve();
  },
  estado: (novo) => {
    Object.assign(alvo, novo);
    sujo = true;
  },
  /** Pula a suavização (vídeo quadro a quadro e testes). */
  instantaneo: (novo) => {
    Object.assign(alvo, novo);
    Object.assign(atual, alvo);
    desenhar();
  },
  respirar: (sim) => {
    respirar = !!sim;
  },
  pausar: (sim) => {
    if (window.__gravandoVideo) return;
    const antes = ativo;
    ativo = !sim && !document.hidden;
    if (ativo && !antes) requestAnimationFrame(laco);
  },
  renderAgora: () => {
    Object.assign(atual, alvo);
    desenhar();
  },
  redimensionar: () => redimensionar(),
};
window.dispatchEvent(new Event("imperio3d-pronto"));

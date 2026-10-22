/**
 * "Uma casa inteira de Blocão" — casa grande e elegante montada com a ROLAGEM (scroll vertical).
 *
 * Tudo é função do progresso p (0..1) da seção: rolar pra baixo assenta os blocos, rolar pra cima desmonta.
 * Nada anima sozinho, então só desenha quando p muda (0 % de GPU parado).
 *
 *   0,00–0,06  alicerce (radier) sobe do chão
 *   0,06–0,40  paredes do térreo: fiada por fiada, cada bloco cai no lugar (ordem em volta da casa, como o pedreiro)
 *   0,40–0,47  laje
 *   0,47–0,74  segundo andar (em balanço sobre o jardim)
 *   0,74–0,80  laje de cobertura
 *   0,80–0,86  vidros, caixilhos, porta de madeira, ripado, pilar e guarda-corpo
 *   0,86–0,94  "face pronta pro acabamento": pintura cobre os blocos; deck, piscina e árvores
 *   0,90–1,00  luz quente acende por dentro
 *
 * Medidas em metros. Bloco ILUSTRATIVO 1,00 × 0,50 × 0,15 (face real a confirmar com o Vinicius).
 *
 * API (window.ImperioCasa3D): iniciar(canvas) → Promise · progresso(p) · redimensionar() · renderAgora() · blocos()
 */
import {
  ACESFilmicToneMapping, BoxGeometry, CanvasTexture, Color, DirectionalLight, Group, HemisphereLight, IcosahedronGeometry,
  InstancedMesh, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PCFSoftShadowMap,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, RepeatWrapping, RoomEnvironment, Scene, SRGBColorSpace, Vector3,
  WebGLRenderer,
} from "../vendor/three-imperio.min.js";

const NIVEIS = {
  alta: { ratio: 2, tex: 1024, sombra: true, mapa: 2048 },
  media: { ratio: 1.5, tex: 512, sombra: false, mapa: 1024 },
  baixa: { ratio: 1, tex: 256, sombra: false, mapa: 1024 },
};

const BL = 1.0;    // comprimento do bloco
const BA = 0.5;    // altura (1 fiada)
const BE = 0.15;   // espessura (Blocão 15 cm)
const FIADAS = 6;  // 3 m de pé-direito
const JUNTA = 0.012;

/* ---------- utilidades ---------- */
const limitar = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const faixa = (p, a, b) => limitar((p - a) / (b - a));
const suave = (x) => { x = limitar(x); return x * x * (3 - 2 * x); };
const saida = (x) => { x = limitar(x); return 1 - (1 - x) ** 3; };
const pulo = (x) => { x = limitar(x); const c = 1.4; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; }; // assenta com um "tum"

function aleatorio(s) { return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function telaTex(tam, desenhar) {
  const c = document.createElement("canvas");
  c.width = c.height = tam;
  desenhar(c.getContext("2d"), tam);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Concreto: base cinza com manchas e poros (leve: a casa tem centenas de blocos). */
function texConcreto(tam) {
  return telaTex(tam, (c, n) => {
    const r = aleatorio(7);
    c.fillStyle = "#a9a59d";
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < n * 1.6; i++) {
      const v = 140 + r() * 50;
      c.fillStyle = `rgba(${v},${v - 3},${v - 8},.35)`;
      c.fillRect(r() * n, r() * n, 2 + r() * (n / 40), 2 + r() * (n / 40));
    }
    for (let i = 0; i < n / 2; i++) {
      c.fillStyle = "rgba(70,68,64,.45)";
      c.beginPath();
      c.arc(r() * n, r() * n, 0.6 + r() * 1.4, 0, 7);
      c.fill();
    }
  });
}

/** Topo do bloco: o sanduíche concreto | EPS | concreto (aparece enquanto o bloco cai, visto de cima). */
function texSanduiche(tam) {
  return telaTex(tam, (c, n) => {
    const r = aleatorio(11);
    const a = (3.5 / 15) * n;
    c.fillStyle = "#a6a29a";
    c.fillRect(0, 0, n, n);
    c.fillStyle = "#f1efe9";
    c.fillRect(0, a, n, n - 2 * a);
    for (let i = 0; i < n * 2; i++) {
      c.fillStyle = "rgba(210,206,198,.6)";
      c.beginPath();
      c.arc(r() * n, a + r() * (n - 2 * a), 1 + r() * 2, 0, 7);
      c.fill();
    }
  });
}

function texMadeira(tam) {
  return telaTex(tam, (c, n) => {
    const r = aleatorio(3);
    c.fillStyle = "#8a5a36";
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < 70; i++) {
      c.strokeStyle = `rgba(${60 + r() * 40},${35 + r() * 25},${20 + r() * 15},.35)`;
      c.lineWidth = 1 + r() * 2.5;
      const x = r() * n;
      c.beginPath();
      c.moveTo(x, 0);
      c.bezierCurveTo(x + (r() - 0.5) * 20, n / 3, x + (r() - 0.5) * 20, (2 * n) / 3, x + (r() - 0.5) * 10, n);
      c.stroke();
    }
  });
}

/** Sombra de contato macia sob a casa (substitui o mapa de sombras em celular/PC médio). */
function texSombra() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  gr.addColorStop(0, "rgba(0,0,0,.55)");
  gr.addColorStop(0.55, "rgba(0,0,0,.22)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/* ---------- projeto da casa ---------- */
// Térreo A (16 × 10) e pavimento superior B (14 × 8) em balanço de 2 m sobre o jardim (+x).
const A = { x0: -8, x1: 8, z0: -5, z1: 5 };
const B = { x0: -4, x1: 10, z0: -4, z1: 4 };
const PE = FIADAS * BA;       // 3 m (6 fiadas)
const LAJE = 0.25;
const Y_B = PE + LAJE;        // base do pavimento superior

/**
 * Paredes: [eixo, coordenada fixa, início, fim, aberturas[{a, b, f0, f1}]] — f0..f1 = fiadas vazias (vão).
 * A frente da casa é +z (o lado que a câmera vê primeiro).
 */
const PAREDES_A = [
  ["x", A.z1, A.x0, A.x1, [{ a: -7, b: -1, f0: 0, f1: 6 }, { a: 1, b: 2.4, f0: 0, f1: 6, porta: true }, { a: 4.2, b: 7, f0: 2, f1: 5 }]],
  ["z", A.x1 - BE / 2, A.z1 - BE, A.z0 + BE, [{ a: -2, b: 2, f0: 2, f1: 5 }]],
  ["x", A.z0, A.x1, A.x0, [{ a: -3, b: 3, f0: 2, f1: 5 }]],
  ["z", A.x0 + BE / 2, A.z0 + BE, A.z1 - BE, [{ a: -2, b: 2, f0: 2, f1: 5 }]],
];
const PAREDES_B = [
  ["x", B.z1, B.x0, B.x1, [{ a: -3, b: 6.4, f0: 1, f1: 5 }]],
  ["z", B.x1 - BE / 2, B.z1 - BE, B.z0 + BE, [{ a: -2.6, b: 2.6, f0: 0, f1: 6 }]],
  ["x", B.z0, B.x1, B.x0, [{ a: 0, b: 4, f0: 2, f1: 5 }]],
  ["z", B.x0 + BE / 2, B.z0 + BE, B.z1 - BE, []],
];

/** Gera os blocos (amarração: fiadas ímpares começam com meio bloco) e os vãos de vidro. */
function levantar(paredes, yBase, andar) {
  const blocos = [];
  const vaos = [];
  let perimetro = 0;
  const comps = paredes.map(([, , i, f]) => Math.abs(f - i));
  const total = comps.reduce((s, c) => s + c, 0);
  paredes.forEach(([eixo, fixo, ini, fim, abert], w) => {
    const sentido = Math.sign(fim - ini);
    const comp = comps[w];
    for (let f = 0; f < FIADAS; f++) {
      const cortes = [];
      let s = 0;
      let primeiro = f % 2 ? BL / 2 : BL;
      while (s < comp - 0.01) {
        const e = Math.min(comp, s + primeiro);
        cortes.push([s, e]);
        s = e;
        primeiro = BL;
      }
      cortes.forEach(([s0, s1]) => {
        // posição ao longo do eixo (coordenada do mundo) e recorte dos vãos desta fiada
        let pedacos = [[ini + sentido * s0, ini + sentido * s1]].map(([a, b]) => [Math.min(a, b), Math.max(a, b)]);
        abert.filter((v) => f >= v.f0 && f < v.f1).forEach((v) => {
          pedacos = pedacos.flatMap(([a, b]) => {
            if (v.b <= a || v.a >= b) return [[a, b]];
            const r = [];
            if (v.a > a) r.push([a, v.a]);
            if (v.b < b) r.push([v.b, b]);
            return r;
          });
        });
        pedacos.forEach(([a, b]) => {
          if (b - a < 0.08) return;
          const meio = (a + b) / 2;
          const ordem = (perimetro + Math.abs(meio - ini)) / total; // posição na volta da casa (0..1)
          blocos.push({
            x: eixo === "x" ? meio : fixo,
            z: eixo === "x" ? fixo - Math.sign(fixo) * (BE / 2) : meio,
            y: yBase + f * BA + BA / 2,
            comp: b - a,
            girado: eixo === "z",
            fiada: andar * FIADAS + f,
            ordem,
          });
        });
      });
    }
    abert.forEach((v) => vaos.push({ eixo, fixo, a: v.a, b: v.b, y0: yBase + v.f0 * BA, y1: yBase + v.f1 * BA, porta: !!v.porta }));
    perimetro += comp;
  });
  return { blocos, vaos };
}

/* ---------- cena ---------- */
let renderer;
let cena;
let camera;
let nivel;
let blocosMesh;
let pinturaMesh;
let lista = [];
let pecas = [];         // outras peças (lajes, vidros...) com a sua própria entrada no tempo
let vidros = [];
let matVidro;
let matPintura;
let sombraChao;
let p = 0;
let pDesenhado = -1;
let assentados = 0;
const _m = new Matrix4();
const _o = new Object3D();

function peca(geo, mat, x, y, z, entra, tipo = "desce") {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = nivel.sombra;
  m.userData = { base: m.position.clone(), entra, tipo };
  cena.add(m);
  pecas.push(m);
  return m;
}

function caixaUV(lx, ly, lz, escalaTex) {
  const g = new BoxGeometry(lx, ly, lz);
  if (!escalaTex) return g;
  const uv = g.attributes.uv;
  const t = [[lz, ly], [lz, ly], [lx, lz], [lx, lz], [lx, ly], [lx, ly]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v;
    uv.setXY(i, (uv.getX(i) * t[f][0]) / escalaTex, (uv.getY(i) * t[f][1]) / escalaTex);
  }
  return g;
}

function montar() {
  const tCon = texConcreto(nivel.tex);
  const tSan = texSanduiche(nivel.tex / 2);
  const tMad = texMadeira(nivel.tex / 2);

  // chão: gramado amplo + sombra de contato
  // o gramado some em degradê nas bordas (vira "maquete" sobre o céu, sem linha de horizonte dura)
  const borda = document.createElement("canvas");
  borda.width = borda.height = 256;
  const gb = borda.getContext("2d");
  const rg = gb.createRadialGradient(128, 128, 40, 128, 128, 128);
  rg.addColorStop(0, "#fff");
  rg.addColorStop(0.55, "#fff");
  rg.addColorStop(1, "#000");
  gb.fillStyle = rg;
  gb.fillRect(0, 0, 256, 256);
  const grama = new Mesh(new PlaneGeometry(80, 80), new MeshStandardMaterial({ color: "#93a079", roughness: 1, alphaMap: new CanvasTexture(borda), transparent: true, depthWrite: false }));
  grama.rotation.x = -Math.PI / 2;
  grama.position.y = -0.2;
  grama.receiveShadow = nivel.sombra;
  cena.add(grama);
  if (!nivel.sombra) {
    sombraChao = new Mesh(new PlaneGeometry(32, 24), new MeshBasicMaterial({ map: texSombra(), transparent: true, depthWrite: false }));
    sombraChao.rotation.x = -Math.PI / 2;
    sombraChao.position.set(0.8, -0.19, 0);
    cena.add(sombraChao);
  }

  // blocos: 1 malha instanciada (concreto nas faces, sanduíche no topo e na base)
  const a = levantar(PAREDES_A, 0, 0);
  const b = levantar(PAREDES_B, Y_B, 1);
  lista = a.blocos.concat(b.blocos);
  const geo = caixaUV(BL - JUNTA, BA - JUNTA, BE, 0);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4);
    if (face !== 2 && face !== 3) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i) * 1.1); // topo/base: o sanduíche fica inteiro
  }
  const matCon = new MeshStandardMaterial({ map: tCon, roughness: 0.92, color: "#cfcac1" });
  const matTopo = new MeshStandardMaterial({ map: tSan, roughness: 0.9, color: "#e2ded6" });
  // ordem das faces: +x, -x, +y, -y, +z, -z → topo/base com o sanduíche
  blocosMesh = new InstancedMesh(geo, [matCon, matCon, matTopo, matTopo, matCon, matCon], lista.length);
  blocosMesh.castShadow = blocosMesh.receiveShadow = nivel.sombra;
  blocosMesh.frustumCulled = false; // as instâncias se espalham pela casa toda (a esfera da geometria não as cobre)
  cena.add(blocosMesh);

  // pintura (acabamento): mesma posição dos blocos, um tico maior pra fechar as juntas
  matPintura = new MeshStandardMaterial({ color: "#f2efe8", roughness: 0.85, transparent: true, opacity: 0 });
  pinturaMesh = new InstancedMesh(new BoxGeometry(BL, BA, BE + 0.012), matPintura, lista.length);
  lista.forEach((bl, i) => {
    _o.position.set(bl.x, bl.y, bl.z);
    _o.rotation.set(0, bl.girado ? Math.PI / 2 : 0, 0);
    _o.scale.set(bl.comp + 0.004, 1.01, 1);
    _o.updateMatrix();
    pinturaMesh.setMatrixAt(i, _o.matrix);
  });
  pinturaMesh.visible = false;
  pinturaMesh.frustumCulled = false;
  cena.add(pinturaMesh);

  // materiais das peças
  const branco = new MeshStandardMaterial({ color: "#f4f2ed", roughness: 0.8 });
  const grafite = new MeshStandardMaterial({ color: "#26282b", roughness: 0.5, metalness: 0.4 });
  const madeira = new MeshStandardMaterial({ map: tMad, roughness: 0.7 });
  matVidro = new MeshStandardMaterial({ color: "#2b3a44", roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.5, emissive: new Color("#ffb867"), emissiveIntensity: 0 });
  const concretoLiso = new MeshStandardMaterial({ map: tCon, color: "#d9d5cc", roughness: 0.95 });

  // alicerce (radier) e lajes
  peca(new BoxGeometry(A.x1 - A.x0 + 0.8, 0.2, A.z1 - A.z0 + 0.8), concretoLiso, 0, -0.1, 0, [0, 0.06], "sobe");
  peca(new BoxGeometry(A.x1 - A.x0 + 0.4, LAJE, A.z1 - A.z0 + 0.4), branco, 0, PE + LAJE / 2, 0, [0.4, 0.47]);
  peca(new BoxGeometry(B.x1 - A.x1 + 0.2, LAJE, B.z1 - B.z0 + 0.4), branco, (A.x1 + B.x1 + 0.2) / 2, PE + LAJE / 2, 0, [0.42, 0.47]);
  peca(new BoxGeometry(B.x1 - B.x0 + 1.2, 0.3, B.z1 - B.z0 + 1.2), branco, (B.x0 + B.x1) / 2, Y_B + PE + 0.15, 0, [0.74, 0.8]);
  // platibanda fina (linha elegante na cobertura)
  peca(new BoxGeometry(B.x1 - B.x0 + 1.2, 0.08, 0.08), grafite, (B.x0 + B.x1) / 2, Y_B + PE + 0.34, B.z1 + 0.56, [0.77, 0.8]);

  // vidros e caixilhos nos vãos
  a.vaos.concat(b.vaos).forEach((v, k) => {
    const larg = v.b - v.a;
    const alt = v.y1 - v.y0;
    const meio = (v.a + v.b) / 2;
    const ehPorta = v.porta;
    const x = v.eixo === "x" ? meio : v.fixo;
    const z = v.eixo === "x" ? v.fixo - Math.sign(v.fixo) * (BE / 2) : meio;
    const rot = v.eixo === "z";
    const ent = [0.8 + (k % 6) * 0.006, 0.84 + (k % 6) * 0.006];
    const g = ehPorta ? new BoxGeometry(larg - 0.04, alt - 0.02, 0.06) : new BoxGeometry(larg - 0.06, alt - 0.06, 0.03);
    const m = peca(g, ehPorta ? madeira : matVidro, x, v.y0 + alt / 2, z, ent, "cresce");
    if (rot) m.rotation.y = Math.PI / 2;
    if (!ehPorta) {
      vidros.push(m);
      // caixilho grafite (moldura fina)
      const f = 0.05;
      [[larg, f, 0, alt / 2 - f / 2], [larg, f, 0, -alt / 2 + f / 2], [f, alt, -larg / 2 + f / 2, 0], [f, alt, larg / 2 - f / 2, 0]].forEach(([lx, ly, dx, dy]) => {
        const c = peca(new BoxGeometry(lx, ly, 0.07), grafite, rot ? x : x + dx, v.y0 + alt / 2 + dy, rot ? z + dx : z, ent, "cresce");
        if (rot) c.rotation.y = Math.PI / 2;
      });
    }
  });

  // ripado de madeira na fachada do 2º andar, pilar fino do balanço e guarda-corpo de vidro do terraço
  for (let i = 0; i < 15; i++) {
    peca(new BoxGeometry(0.07, PE - 0.1, 0.1), madeira, 6.75 + i * 0.2, Y_B + PE / 2, B.z1 + 0.12, [0.81 + i * 0.003, 0.85 + i * 0.003], "cresce");
  }
  // painel de pedra escura entre a porta e a janela (fachada do térreo)
  peca(new BoxGeometry(1.6, PE, 0.06), new MeshStandardMaterial({ color: "#4a4743", roughness: 0.75, map: tCon }), 3.3, PE / 2, A.z1 + 0.04, [0.83, 0.87], "cresce");
  peca(new BoxGeometry(0.16, PE + LAJE + 0.2, 0.16), grafite, B.x1 - 0.2, (PE + LAJE) / 2 - 0.1, B.z1 - 0.2, [0.8, 0.84], "cresce");
  const guarda = peca(new BoxGeometry(A.z1 - A.z0 + 0.4, 1.0, 0.02), matVidro, A.x0 - 0.15, Y_B + 0.5, 0, [0.82, 0.86], "cresce");
  guarda.rotation.y = Math.PI / 2;
  peca(new BoxGeometry(B.x0 - A.x0 + 0.3, 1.0, 0.02), matVidro, (A.x0 + B.x0) / 2 - 0.15, Y_B + 0.5, A.z1 + 0.15, [0.82, 0.86], "cresce");

  // deck, piscina e árvores: o "acabamento" do lote
  peca(new BoxGeometry(9, 0.12, 4), madeira, -3.6, -0.14, A.z1 + 2.4, [0.86, 0.9], "sobe");
  peca(new BoxGeometry(6.4, 0.05, 1.8), new MeshStandardMaterial({ color: "#3d8fae", roughness: 0.05, metalness: 0.2, emissive: new Color("#1d5f7a"), emissiveIntensity: 0.25 }),
    -4, -0.06, A.z1 + 2.5, [0.88, 0.92], "sobe");
  const folha = new MeshStandardMaterial({ color: "#3f5a3a", roughness: 0.9, flatShading: true });
  const tronco = new MeshStandardMaterial({ color: "#5b4636", roughness: 1 });
  [[-11.5, -3, 1.4], [-10.8, 4.6, 1.05], [13, -3, 1.3], [12.2, 5.4, 0.95]].forEach(([x, z, s], i) => {
    const ent = [0.88 + i * 0.012, 0.93 + i * 0.012];
    peca(new BoxGeometry(0.18, 1.6 * s, 0.18), tronco, x, 0.6 * s, z, ent, "cresce");
    const copa = peca(new IcosahedronGeometry(1, 1), folha, x, 2.4 * s, z, ent, "cresce");
    copa.scale.set(1.1 * s, 1.9 * s, 1.1 * s);
    copa.userData.escala = copa.scale.clone();
  });
}

/* ---------- câmera: gira em volta da casa enquanto ela sobe ---------- */
function posicionarCamera() {
  const el = renderer.domElement;
  const w = el.clientWidth;
  const h = el.clientHeight;
  const asp = w / Math.max(1, h);
  const ang = MathUtils.lerp(-0.62, 0.5, suave(p));
  // retrato (celular) precisa de mais distância pra caber a largura da casa
  const dist = MathUtils.lerp(31, 35, suave(p)) * Math.max(1, 0.92 / Math.max(asp, 0.4));
  const alvoY = MathUtils.lerp(1.2, 3.1, suave(faixa(p, 0, 0.8)));
  camera.position.set(0.8 + Math.sin(ang) * dist, alvoY + dist * 0.3, Math.cos(ang) * dist);
  camera.lookAt(0.8, alvoY, 1);
  // tela larga: a casa vai pra direita (o texto fica à esquerda, sem nada por cima)
  if (asp > 1.15) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
  else camera.clearViewOffset();
}

function aplicar() {
  // blocos: cada um cai no lugar no seu tempo (fiada → volta da casa)
  const t0 = [0.06, 0.47];
  const vao = [0.34, 0.27];
  assentados = 0;
  lista.forEach((bl, i) => {
    const andar = bl.fiada >= FIADAS ? 1 : 0;
    const f = bl.fiada - andar * FIADAS;
    const passo = vao[andar] / FIADAS;
    const ini = t0[andar] + f * passo + bl.ordem * passo * 0.9;
    const e = limitar((p - ini) / 0.03);
    if (e >= 1) assentados++;
    _o.position.set(bl.x, bl.y + (1 - pulo(e)) * 2.2, bl.z);
    _o.rotation.set((1 - e) * 0.5, (bl.girado ? Math.PI / 2 : 0) + (1 - e) * 0.4, 0);
    const s = e <= 0 ? 0.0001 : 1;
    _o.scale.set(bl.comp * s, s, s);
    _o.updateMatrix();
    blocosMesh.setMatrixAt(i, _o.matrix);
  });
  blocosMesh.instanceMatrix.needsUpdate = true;

  // demais peças
  pecas.forEach((m) => {
    const { base, entra, tipo, escala } = m.userData;
    const e = saida(faixa(p, entra[0], entra[1]));
    m.visible = e > 0;
    if (!m.visible) return;
    if (tipo === "desce") m.position.y = base.y + (1 - e) * 3;
    else if (tipo === "sobe") m.position.y = base.y - (1 - e) * 0.4;
    else {
      const k = Math.max(0.001, e);
      if (escala) m.scale.set(escala.x * k, escala.y * k, escala.z * k);
      else m.scale.set(1, k, 1);
      m.position.y = base.y - (1 - k) * (m.geometry.parameters.height || 0) * 0.5 * (escala ? 0 : 1);
    }
  });

  // acabamento: pintura cobre os blocos; luz quente acende
  const tinta = suave(faixa(p, 0.86, 0.94));
  pinturaMesh.visible = tinta > 0.001;
  matPintura.opacity = tinta;
  matPintura.transparent = tinta < 0.999;
  matPintura.depthWrite = tinta > 0.5;
  matVidro.emissiveIntensity = 0.55 * suave(faixa(p, 0.9, 1));
}

function desenhar() {
  aplicar();
  posicionarCamera();
  renderer.render(cena, camera);
  pDesenhado = p;
  if (ouvinte) ouvinte({ assentados, total: lista.length });
}
let ouvinte = null;

function redimensionar() {
  const el = renderer.domElement;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  pDesenhado = -1;
}

let pedido = false;
function pedir() {
  if (pedido || window.__gravandoVideo) return;
  pedido = true;
  requestAnimationFrame(() => {
    pedido = false;
    if (p !== pDesenhado) desenhar();
  });
}

function iniciar(canvas) {
  nivel = NIVEIS[document.documentElement.getAttribute("data-qualidade")] || NIVEIS.media;
  renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!window.__gravandoVideo });
  renderer.setPixelRatio(Math.min(nivel.ratio, Math.max(1, window.devicePixelRatio || 1)));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  if (nivel.sombra) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap; }
  cena = new Scene();
  const pm = new PMREMGenerator(renderer);
  cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  camera = new PerspectiveCamera(32, 1, 0.5, 200);
  cena.add(new HemisphereLight("#fff6e8", "#7d8a66", 0.9));
  const sol = new DirectionalLight("#ffe7c4", 2.4);
  sol.position.set(12, 18, 10);
  if (nivel.sombra) {
    sol.castShadow = true;
    sol.shadow.mapSize.set(nivel.mapa, nivel.mapa);
    Object.assign(sol.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.03;
  }
  cena.add(sol);
  montar();
  redimensionar();
  window.addEventListener("resize", () => { redimensionar(); pedir(); }, { passive: true });
  desenhar();
  return Promise.resolve();
}

window.ImperioCasa3D = {
  iniciar,
  /** p = 0..1 da seção (só desenha se mudou) */
  progresso(novo) { p = limitar(novo); pedir(); },
  redimensionar() { redimensionar(); pedir(); },
  /** vídeo quadro a quadro */
  renderAgora() { desenhar(); },
  blocos() { return { assentados, total: lista.length }; },
  /** fn({ assentados, total }) depois de cada desenho (contador de blocos da seção) */
  aoDesenhar(fn) { ouvinte = fn; },
};
window.dispatchEvent(new Event("imperio-casa3d-pronta"));

/**
 * "Uma casa inteira de Blocão" — MAQUETE de um sobrado em tamanho real, montada com a ROLAGEM (scroll vertical).
 *
 * Sobrado 9 × 7 m (≈ 125 m² nos 2 andares), varanda coberta no térreo e varanda com guarda-corpo de vidro em cima,
 * platibanda (telhado embutido), ripado de madeira, jardim, caminho de pedra e 2 bonequinhos de escala (como nas
 * maquetes de arquitetura). Tudo sobre uma base de maquete; a câmera calcula a distância pra base caber inteira na tela.
 *
 * Tudo é função do progresso p (0..1) da seção: rolar pra baixo assenta os blocos, rolar pra cima desmonta.
 * Nada anima sozinho, então só desenha quando p muda (0 % de GPU parado).
 *
 *   0,00–0,12  O MESMO Blocão do site (grande, no meio da tela, no mesmo ângulo) encolhe e voa até o canto da obra:
 *              ele é o 1º bloco da casa. O alicerce aparece embaixo enquanto ele desce.
 *   0,12–0,40  paredes do térreo: fiada por fiada, cada bloco cai no lugar (dando a volta na casa, como o pedreiro)
 *   0,40–0,47  laje + piso da varanda de cima (com pilares da varanda de baixo)
 *   0,47–0,74  paredes do andar de cima
 *   0,74–0,80  cobertura com platibanda
 *   0,80–0,86  vidros, caixilhos, porta, ripado, guarda-corpo e deck da varanda
 *   0,86–0,94  "face pronta pro acabamento": pintura cobre os blocos; jardim, caminho, árvores e bonequinhos
 *   0,90–1,00  luz quente acende por dentro
 *
 * Medidas em metros. Bloco ILUSTRATIVO 1,00 × 0,50 × 0,15 (face real a confirmar com o Vinicius).
 * Celular antigo ("baixa"): sem antialias, sem reflexo de ambiente, texturas pequenas, resolução 1×.
 *
 * API (window.ImperioCasa3D): iniciar(canvas) → Promise · progresso(p) · redimensionar() · renderAgora() · blocos() · aoDesenhar(fn)
 */
import {
  ACESFilmicToneMapping, BoxGeometry, CanvasTexture, Color, DirectionalLight, HemisphereLight, IcosahedronGeometry,
  InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PCFSoftShadowMap,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, RepeatWrapping, RoomEnvironment, Scene, SRGBColorSpace, Vector3,
  WebGLRenderer,
} from "../vendor/three-imperio.min.js";

const NIVEIS = {
  alta: { ratio: 2, tex: 512, sombra: true, mapa: 2048, aa: true, ambiente: true },
  media: { ratio: 1.5, tex: 256, sombra: false, mapa: 1024, aa: true, ambiente: true },
  baixa: { ratio: 1, tex: 128, sombra: false, mapa: 512, aa: false, ambiente: false },
};

const BL = 1.0;    // comprimento do bloco
const BA = 0.5;    // altura (1 fiada)
const BE = 0.15;   // espessura (Blocão 15 cm)
const FIADAS = 6;  // 3 m de piso a piso
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
  return t;
}

/** Concreto: base cinza com manchas e poros (leve: são centenas de blocos). */
function texConcreto(tam) {
  return telaTex(tam, (c, n) => {
    const r = aleatorio(7);
    c.fillStyle = "#a9a59d";
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < n * 1.6; i++) {
      const v = 140 + r() * 50;
      c.fillStyle = `rgba(${v},${v - 3},${v - 8},.35)`;
      c.fillRect(r() * n, r() * n, 1 + r() * (n / 40), 1 + r() * (n / 40));
    }
    for (let i = 0; i < n / 2; i++) {
      c.fillStyle = "rgba(70,68,64,.45)";
      c.beginPath();
      c.arc(r() * n, r() * n, 0.5 + r() * 1.2, 0, 7);
      c.fill();
    }
  });
}

/** Topo do bloco: o sanduíche concreto | EPS | concreto (aparece enquanto o bloco cai, visto de cima). */
function texSanduiche(tam) {
  return telaTex(tam, (c, n) => {
    const a = (3.5 / 15) * n;
    c.fillStyle = "#a6a29a";
    c.fillRect(0, 0, n, n);
    c.fillStyle = "#f1efe9";
    c.fillRect(0, a, n, n - 2 * a);
  });
}

function texMadeira(tam) {
  return telaTex(tam, (c, n) => {
    const r = aleatorio(3);
    c.fillStyle = "#8a5a36";
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < 40; i++) {
      c.strokeStyle = `rgba(${60 + r() * 40},${35 + r() * 25},${20 + r() * 15},.35)`;
      c.lineWidth = 1 + r() * 2;
      const x = r() * n;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + (r() - 0.5) * 10, n);
      c.stroke();
    }
  });
}

/** Sombra de contato macia sob a casa (substitui o mapa de sombras em celular/PC médio). */
function texSombra() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  gr.addColorStop(0, "rgba(0,0,0,.5)");
  gr.addColorStop(0.6, "rgba(0,0,0,.2)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

/* ---------- projeto: sobrado 9 × 7 m ---------- */
const CASA = { x0: -4.5, x1: 4.5, z0: -4, z1: 3 };  // paredes externas (frente = +z)
const VARANDA = 2;                                   // profundidade das varandas (térreo e andar de cima)
const PE = FIADAS * BA;                              // 3 m (6 fiadas)
const LAJE = 0.2;
const CHAO = 0.05;                                   // topo do alicerce
const Y2 = CHAO + PE + LAJE;                         // base do andar de cima
const BASE = { x: 15, z: 14, alt: 0.35 };            // base da maquete

/**
 * Paredes: [eixo, coordenada fixa, início, fim, aberturas[{a, b, f0, f1, porta}]] — f0..f1 = fiadas vazias (vão).
 */
const { x0, x1, z0, z1 } = CASA;
const PAREDES_TERREO = [
  ["x", z1, x0, x1, [{ a: -3.6, b: -0.6, f0: 1, f1: 5 }, { a: 1, b: 2.2, f0: 0, f1: 5, porta: true }]],
  ["z", x1 - BE / 2, z1 - BE, z0 + BE, [{ a: -2.2, b: -0.4, f0: 2, f1: 5 }]],
  ["x", z0, x1, x0, [{ a: -2, b: 1, f0: 2, f1: 5 }]],
  ["z", x0 + BE / 2, z0 + BE, z1 - BE, [{ a: -1.6, b: 0.4, f0: 2, f1: 5 }]],
];
const PAREDES_CIMA = [
  ["x", z1, x0, x1, [{ a: -3.6, b: 1.2, f0: 0, f1: 5 }, { a: 2.5, b: 3.7, f0: 2, f1: 5 }]],
  ["z", x1 - BE / 2, z1 - BE, z0 + BE, [{ a: -2.2, b: -0.4, f0: 2, f1: 5 }]],
  ["x", z0, x1, x0, [{ a: -1, b: 2, f0: 2, f1: 5 }]],
  ["z", x0 + BE / 2, z0 + BE, z1 - BE, [{ a: -2, b: -0.4, f0: 2, f1: 5 }]],
];

/** Gera os blocos (amarração: fiadas ímpares começam com meio bloco) e os vãos. */
function levantar(paredes, yBase, andar) {
  const blocos = [];
  const vaos = [];
  let percorrido = 0;
  const comps = paredes.map(([, , i, f]) => Math.abs(f - i));
  const total = comps.reduce((s, c) => s + c, 0);
  paredes.forEach(([eixo, fixo, ini, fim, abert], w) => {
    const sentido = Math.sign(fim - ini);
    const comp = comps[w];
    for (let f = 0; f < FIADAS; f++) {
      let s = 0;
      let primeiro = f % 2 ? BL / 2 : BL;
      while (s < comp - 0.01) {
        const e = Math.min(comp, s + primeiro);
        const a0 = ini + sentido * s;
        const b0 = ini + sentido * e;
        let pedacos = [[Math.min(a0, b0), Math.max(a0, b0)]];
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
          blocos.push({
            x: eixo === "x" ? meio : fixo,
            z: eixo === "x" ? fixo - Math.sign(fixo || 1) * (BE / 2) : meio,
            y: yBase + f * BA + BA / 2,
            comp: b - a,
            girado: eixo === "z",
            fiada: andar * FIADAS + f,
            ordem: (percorrido + Math.abs(meio - ini)) / total, // posição na volta da casa (0..1)
          });
        });
        s = e;
        primeiro = BL;
      }
    }
    abert.forEach((v) => vaos.push({ eixo, fixo, a: v.a, b: v.b, y0: yBase + v.f0 * BA, y1: yBase + v.f1 * BA, porta: !!v.porta }));
    percorrido += comp;
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
const pecas = [];         // demais peças (lajes, vidros...) com a sua própria entrada no tempo
let matVidro;
let matPintura;
let p = 0;
let pDesenhado = -1;
let assentados = 0;
let ouvinte = null;
let guia;                 // o Blocão do site que vira o 1º bloco da casa
let primeiro = 0;         // índice do 1º bloco (fiada 0, começo da volta)
const _o = new Object3D();
const _ini = new Object3D();
const _fim = new Object3D();
const _dir = new Vector3();
const centro = new Vector3(0, 2.6, 0.6);
const RAIO = 10.4;         // esfera que envolve a maquete inteira (base + casa + árvores)

function peca(geo, mat, x, y, z, entra, tipo = "desce") {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = nivel.sombra;
  m.userData = { base: m.position.clone(), entra, tipo, alt: geo.parameters ? geo.parameters.height || 0 : 0 };
  cena.add(m);
  pecas.push(m);
  return m;
}

function montar() {
  const tCon = texConcreto(nivel.tex);
  const tSan = texSanduiche(64);
  const tMad = texMadeira(nivel.tex);

  const branco = new MeshStandardMaterial({ color: "#f4f2ed", roughness: 0.8 });
  const grafite = new MeshStandardMaterial({ color: "#2a2c2f", roughness: 0.55, metalness: 0.3 });
  const madeira = new MeshStandardMaterial({ map: tMad, roughness: 0.7 });
  const grama = new MeshStandardMaterial({ color: "#9aa77f", roughness: 1 });
  const pedra = new MeshStandardMaterial({ color: "#d8d3c8", roughness: 0.95 });
  matVidro = new MeshStandardMaterial({ color: "#2b3a44", roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.5, emissive: new Color("#ffb867"), emissiveIntensity: 0 });

  // base da maquete: placa branca com filete grafite, gramado por cima (já está lá desde o começo)
  const base = new Mesh(new BoxGeometry(BASE.x, BASE.alt, BASE.z), branco);
  base.position.set(0, -BASE.alt / 2 - 0.02, 0.6);
  base.receiveShadow = nivel.sombra;
  cena.add(base);
  const filete = new Mesh(new BoxGeometry(BASE.x + 0.02, 0.04, BASE.z + 0.02), grafite);
  filete.position.set(0, -BASE.alt - 0.02, 0.6);
  cena.add(filete);
  const gram = new Mesh(new BoxGeometry(BASE.x - 0.3, 0.04, BASE.z - 0.3), grama);
  gram.position.set(0, -0.0, 0.6);
  gram.receiveShadow = nivel.sombra;
  cena.add(gram);
  if (!nivel.sombra) {
    const sombra = new Mesh(new PlaneGeometry(13, 12), new MeshBasicMaterial({ map: texSombra(), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.set(0.3, 0.025, -0.3);
    cena.add(sombra);
  }

  // blocos: 1 malha instanciada (concreto nas faces, sanduíche no topo e na base)
  const t = levantar(PAREDES_TERREO, CHAO, 0);
  const c = levantar(PAREDES_CIMA, Y2, 1);
  lista = t.blocos.concat(c.blocos);
  const geo = new BoxGeometry(BL - JUNTA, BA - JUNTA, BE);
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

  // o Blocão "do site": mesmo bloco, com textura mais fina (ele aparece grande na tela antes de ir pro lugar)
  primeiro = lista.reduce((m, bl, i) => (bl.fiada === 0 && bl.ordem < lista[m].ordem ? i : m), 0);
  const tGuia = texConcreto(Math.min(512, nivel.tex * 2));
  const matGuia = new MeshStandardMaterial({ map: tGuia, roughness: 0.9, color: "#d6d1c8" });
  guia = new Mesh(geo, [matGuia, matGuia, matTopo, matTopo, matGuia, matGuia]);
  guia.castShadow = nivel.sombra;
  cena.add(guia);

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

  const L = x1 - x0;
  const P = z1 - z0;
  const zMeioV = (z0 + z1 + VARANDA) / 2;
  // alicerce (radier) — a casa e a varanda
  peca(new BoxGeometry(L + 0.4, 0.12, P + VARANDA + 0.4), pedra, 0, -0.01, zMeioV, [0, 0.06], "sobe");
  // laje do 1º andar avançando sobre a varanda (vira o piso da varanda de cima)
  peca(new BoxGeometry(L + 0.3, LAJE, P + VARANDA + 0.3), branco, 0, CHAO + PE + LAJE / 2, zMeioV, [0.4, 0.47]);
  // pilares finos da varanda do térreo
  [x0 + 0.2, x1 - 0.2].forEach((x, i) => peca(new BoxGeometry(0.16, PE, 0.16), grafite, x, CHAO + PE / 2, z1 + VARANDA - 0.15, [0.41 + i * 0.01, 0.46 + i * 0.01], "cresce"));
  // cobertura com platibanda (telhado embutido) e beiral sobre a varanda de cima
  const yTopo = Y2 + PE;
  const zMeioT = (z0 + z1) / 2 + 0.3;
  peca(new BoxGeometry(L + 0.6, 0.2, P + 0.9), branco, 0, yTopo + 0.1, zMeioT, [0.74, 0.79]);
  [[L + 0.6, 0.55, 0.14, 0, z1 + 0.68], [L + 0.6, 0.55, 0.14, 0, z0 - 0.23], [0.14, 0.55, P + 0.9, x0 - 0.23, zMeioT], [0.14, 0.55, P + 0.9, x1 + 0.23, zMeioT]]
    .forEach(([lx, ly, lz, x, z], i) => peca(new BoxGeometry(lx, ly, lz), branco, x, yTopo + 0.45, z, [0.76 + i * 0.008, 0.8 + i * 0.008]));
  peca(new BoxGeometry(L + 0.62, 0.05, 0.05), grafite, 0, yTopo + 0.7, z1 + 0.76, [0.79, 0.81]);

  // vidros, porta e caixilhos nos vãos
  t.vaos.concat(c.vaos).forEach((v, k) => {
    const larg = v.b - v.a;
    const alt = v.y1 - v.y0;
    const meio = (v.a + v.b) / 2;
    const x = v.eixo === "x" ? meio : v.fixo;
    const z = v.eixo === "x" ? v.fixo - Math.sign(v.fixo || 1) * (BE / 2) : meio;
    const rot = v.eixo === "z";
    const ent = [0.8 + (k % 6) * 0.006, 0.84 + (k % 6) * 0.006];
    const g = v.porta ? new BoxGeometry(larg - 0.04, alt - 0.02, 0.06) : new BoxGeometry(larg - 0.06, alt - 0.06, 0.03);
    const m = peca(g, v.porta ? madeira : matVidro, x, v.y0 + alt / 2, z, ent, "cresce");
    if (rot) m.rotation.y = Math.PI / 2;
    if (v.porta) return;
    const f = 0.05;
    [[larg, f, 0, alt / 2 - f / 2], [larg, f, 0, -alt / 2 + f / 2], [f, alt, -larg / 2 + f / 2, 0], [f, alt, larg / 2 - f / 2, 0]].forEach(([lx, ly, dx, dy]) => {
      const cx = peca(new BoxGeometry(lx, ly, 0.07), grafite, rot ? x : x + dx, v.y0 + alt / 2 + dy, rot ? z + dx : z, ent, "cresce");
      if (rot) cx.rotation.y = Math.PI / 2;
    });
  });

  // varanda de cima: guarda-corpo de vidro (frente e laterais) com corrimão grafite
  const zV = z1 + VARANDA;
  peca(new BoxGeometry(L, 1.0, 0.02), matVidro, 0, Y2 + 0.5, zV - 0.05, [0.82, 0.86], "cresce");
  peca(new BoxGeometry(L + 0.02, 0.05, 0.06), grafite, 0, Y2 + 1.02, zV - 0.05, [0.83, 0.86], "cresce");
  [x0 + 0.02, x1 - 0.02].forEach((x) => {
    const g = peca(new BoxGeometry(VARANDA, 1.0, 0.02), matVidro, x, Y2 + 0.5, z1 + VARANDA / 2, [0.82, 0.86], "cresce");
    g.rotation.y = Math.PI / 2;
  });
  // deck de madeira na varanda do térreo e ripado vertical na fachada de cima (brise na janela)
  peca(new BoxGeometry(L - 0.1, 0.06, VARANDA - 0.05), madeira, 0, CHAO + 0.03, z1 + VARANDA / 2, [0.8, 0.84], "sobe");
  for (let i = 0; i < 12; i++) {
    peca(new BoxGeometry(0.06, PE - 0.2, 0.08), madeira, 2.2 + i * 0.19, Y2 + PE / 2, z1 + 0.12, [0.81 + i * 0.003, 0.85 + i * 0.003], "cresce");
  }

  // jardim: caminho de pedra até a calçada, cerca viva baixa, árvores e 2 bonequinhos de escala
  for (let i = 0; i < 4; i++) peca(new BoxGeometry(1.1, 0.04, 0.6), pedra, 1.6, 0.04, zV + 0.6 + i * 0.85, [0.86 + i * 0.006, 0.9 + i * 0.006], "sobe");
  const folha = new MeshStandardMaterial({ color: "#46623f", roughness: 0.9, flatShading: true });
  const tronco = new MeshStandardMaterial({ color: "#5b4636", roughness: 1 });
  peca(new BoxGeometry(4.6, 0.5, 0.5), folha, -3.6, 0.27, zV + 1.6, [0.87, 0.91], "cresce");
  peca(new BoxGeometry(2.8, 0.5, 0.5), folha, 4.9, 0.27, zV + 1.6, [0.875, 0.915], "cresce");
  [[-6, -2.6, 1], [6.1, -1.2, 0.85], [-6.2, 3.6, 0.7]].forEach(([x, z, s], i) => {
    const ent = [0.88 + i * 0.012, 0.93 + i * 0.012];
    peca(new BoxGeometry(0.16, 1.5 * s, 0.16), tronco, x, 0.75 * s, z, ent, "cresce");
    const copa = peca(new IcosahedronGeometry(1, 1), folha, x, 2.3 * s, z, ent, "cresce");
    copa.scale.set(1.2 * s, 1.5 * s, 1.2 * s);
    copa.userData.escala = copa.scale.clone();
  });
  const gente = new MeshStandardMaterial({ color: "#fbfaf7", roughness: 0.6 });
  [[3, zV + 2.4], [-1.4, z1 + 1.1]].forEach(([x, z], i) => {
    const ent = [0.9 + i * 0.01, 0.94 + i * 0.01];
    peca(new BoxGeometry(0.34, 1.35, 0.2), gente, x, 0.72, z, ent, "cresce");
    peca(new IcosahedronGeometry(0.13, 1), gente, x, 1.6, z, ent, "cresce");
  });
}

/* ---------- câmera: gira em volta da maquete; distância calculada pra caber inteira em qualquer tela ---------- */
function posicionarCamera() {
  const el = renderer.domElement;
  const w = el.clientWidth;
  const h = el.clientHeight;
  const asp = w / Math.max(1, h);
  const largaTela = asp > 1.15;
  const vfov = MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * asp);
  // na tela larga a casa ocupa a parte direita (o texto fica à esquerda): conta com ~70 % da largura
  const util = Math.min(vfov, hfov * (largaTela ? 0.7 : 1));
  const dist = (RAIO / Math.sin(util / 2)) * MathUtils.lerp(1.0, 0.94, suave(p));
  const ang = MathUtils.lerp(-0.6, 0.45, suave(p));
  const elev = MathUtils.lerp(0.5, 0.36, suave(p)); // começa mais de cima (vê os blocos assentando) e desce
  camera.position.set(centro.x + Math.sin(ang) * Math.cos(elev) * dist, centro.y + Math.sin(elev) * dist, centro.z + Math.cos(ang) * Math.cos(elev) * dist);
  camera.lookAt(centro);
  if (largaTela) camera.setViewOffset(w, h, -w * 0.16, 0, w, h);
  else camera.clearViewOffset();
}

/**
 * O Blocão do site vira o 1º bloco da casa: começa grande, no meio da tela e no mesmo ângulo do bloco do
 * "Por dentro" (giro −0,55 / inclinação 0,3), e voa encolhendo até o canto da obra.
 */
function moverGuia() {
  const e = suave(faixa(p, 0, 0.12));
  guia.visible = e < 1;
  if (!guia.visible) return;
  const el = renderer.domElement;
  const asp = el.clientWidth / Math.max(1, el.clientHeight);
  const D = 9;
  const altVis = 2 * D * Math.tan(MathUtils.degToRad(camera.fov) / 2);
  const largura = Math.min((asp < 1.15 ? 0.72 : 0.36) * altVis * asp, 0.9 * altVis);
  camera.getWorldDirection(_dir);
  _ini.position.copy(camera.position).addScaledVector(_dir, D);
  _ini.quaternion.copy(camera.quaternion);
  _o.rotation.set(0.3, -0.55, 0);
  _o.updateMatrix();
  _ini.quaternion.multiply(_o.quaternion);
  const bl = lista[primeiro];
  _fim.position.set(bl.x, bl.y, bl.z);
  _fim.rotation.set(0, bl.girado ? Math.PI / 2 : 0, 0);
  const v = e * e; // fica grande na tela um pouco mais e depois "mergulha" até a obra
  guia.position.lerpVectors(_ini.position, _fim.position, v);
  guia.position.y += Math.sin(Math.PI * v) * 1.2; // um arco suave, como quem levanta e assenta o bloco
  guia.quaternion.slerpQuaternions(_ini.quaternion, _fim.quaternion, e);
  const s0 = largura / BL;
  const k = s0 + (1 - s0) * v;
  guia.scale.set(bl.comp * k, k, k);
}

function aplicar() {
  // blocos: cada um cai no lugar no seu tempo (fiada → volta da casa)
  const t0 = [0.12, 0.47];
  const vao = [0.28, 0.27];
  assentados = 0;
  for (let i = 0; i < lista.length; i++) {
    const bl = lista[i];
    const andar = bl.fiada >= FIADAS ? 1 : 0;
    const f = bl.fiada - andar * FIADAS;
    const passo = vao[andar] / FIADAS;
    const ini = t0[andar] + f * passo + bl.ordem * passo * 0.9;
    let e = limitar((p - ini) / 0.03);
    if (i === primeiro) e = p >= 0.12 ? 1 : 0; // o 1º é o próprio Blocão do site (o "guia" chega no lugar dele)
    if (e >= 1) assentados++;
    _o.position.set(bl.x, bl.y + (1 - pulo(e)) * 1.8, bl.z);
    _o.rotation.set((1 - e) * 0.5, (bl.girado ? Math.PI / 2 : 0) + (1 - e) * 0.4, 0);
    const s = e <= 0 ? 0.0001 : 1;
    _o.scale.set(bl.comp * s, s, s);
    _o.updateMatrix();
    blocosMesh.setMatrixAt(i, _o.matrix);
  }
  blocosMesh.instanceMatrix.needsUpdate = true;
  moverGuia();

  // demais peças
  for (const m of pecas) {
    const { base, entra, tipo, escala, alt } = m.userData;
    const e = saida(faixa(p, entra[0], entra[1]));
    m.visible = e > 0;
    if (!m.visible) continue;
    if (tipo === "desce") m.position.y = base.y + (1 - e) * 2.5;
    else if (tipo === "sobe") m.position.y = base.y - (1 - e) * 0.3;
    else if (escala) {
      const k = Math.max(0.001, e);
      m.scale.set(escala.x * k, escala.y * k, escala.z * k);
    } else {
      const k = Math.max(0.001, e);
      m.scale.set(1, k, 1);
      m.position.y = base.y - (1 - k) * alt * 0.5; // cresce de baixo pra cima
    }
  }

  // acabamento: pintura cobre os blocos; luz quente acende
  const tinta = suave(faixa(p, 0.86, 0.94));
  pinturaMesh.visible = tinta > 0.001;
  matPintura.opacity = tinta;
  matPintura.transparent = tinta < 0.999;
  matPintura.depthWrite = tinta > 0.5;
  matVidro.emissiveIntensity = 0.55 * suave(faixa(p, 0.9, 1));
}

function desenhar() {
  posicionarCamera(); // antes: o Blocão-guia é posicionado em relação à câmera
  aplicar();
  renderer.render(cena, camera);
  pDesenhado = p;
  if (ouvinte) ouvinte({ assentados, total: lista.length });
}

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

/** Devolve a vez pro navegador entre as etapas da preparação (a rolagem e o bloco 3D não congelam). */
function respirar() {
  if (window.__gravandoVideo) return Promise.resolve();
  return new Promise((r) => (window.requestIdleCallback ? window.requestIdleCallback(() => r(), { timeout: 300 }) : setTimeout(r, 16)));
}

/**
 * Preparação em etapas curtas (cada uma cabe num intervalo ocioso), em vez de um bloco único de ~1 s:
 * 1) renderer  2) reflexo de ambiente (só PC/celular bom)  3) texturas + peças  4) compila os materiais
 * em paralelo (compileAsync)  5) "aquece" a placa de vídeo com tudo visível (texturas enviadas).
 */
async function iniciar(canvas) {
  nivel = NIVEIS[document.documentElement.getAttribute("data-qualidade")] || NIVEIS.media;
  renderer = new WebGLRenderer({ canvas, antialias: nivel.aa, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!window.__gravandoVideo });
  renderer.setPixelRatio(Math.min(nivel.ratio, Math.max(1, window.devicePixelRatio || 1)));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  if (nivel.sombra) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap; }
  cena = new Scene();
  camera = new PerspectiveCamera(26, 1, 1, 200); // lente "fechada": perspectiva suave de maquete fotografada
  await respirar();
  // reflexo de ambiente (vidro bonito) — pulado no celular antigo: gerar o mapa trava aparelho fraco
  if (nivel.ambiente) {
    const pm = new PMREMGenerator(renderer);
    cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    await respirar();
  }
  cena.add(new HemisphereLight("#fff6e8", "#7d8a66", nivel.ambiente ? 0.9 : 1.6));
  const sol = new DirectionalLight("#ffe7c4", 2.4);
  sol.position.set(9, 14, 8);
  if (nivel.sombra) {
    sol.castShadow = true;
    sol.shadow.mapSize.set(nivel.mapa, nivel.mapa);
    Object.assign(sol.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 });
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.03;
  }
  cena.add(sol);
  montar();
  redimensionar();
  await respirar();
  // tudo visível pra compilar e enviar TUDO agora (senão a 1ª aparição do vidro/pintura/madeira no meio da
  // rolagem engasgava ~0,2–0,3 s no celular antigo)
  pecas.forEach((m) => { m.visible = true; });
  pinturaMesh.visible = true;
  matPintura.opacity = 0.5;
  posicionarCamera();
  if (renderer.compileAsync && renderer.extensions.has("KHR_parallel_shader_compile") && !window.__gravandoVideo) await renderer.compileAsync(cena, camera);
  else renderer.compile(cena, camera);
  await respirar();
  renderer.render(cena, camera);
  window.addEventListener("resize", () => { redimensionar(); pedir(); }, { passive: true });
  desenhar();
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

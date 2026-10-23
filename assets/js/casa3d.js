/**
 * "Uma casa inteira de Blocão" — MAQUETES em tamanho real, montadas com a ROLAGEM (3ª fase do "Por dentro").
 *
 * 3 projetos (a pessoa escolhe): casa SIMPLES (térrea, ≈ 49 m²), casa MÉDIA (sobrado com varandas, ≈ 125 m²) e
 * CASARÃO (sobrado grande com panos de vidro e piscina, ≈ 285 m²). Tudo sobre uma base de maquete, com bonequinhos
 * de escala; a câmera calcula a distância pra maquete caber inteira na tela.
 *
 * Tudo é função do progresso p (0..1): rolar pra baixo assenta os blocos, rolar pra cima desmonta.
 * Só desenha quando p muda. HD: enquanto rola, desenha leve; parado ~0,16 s, refaz em alta resolução.
 *
 *   0,00–0,12  o Blocão do "Por dentro" (mesma posição, tamanho e ângulo — guiaTela()) encolhe e voa até o canto
 *              da obra: ele é o 1º bloco. A base da maquete surge por baixo.
 *   depois     paredes fiada por fiada (como o pedreiro, dando a volta), laje/varanda, 2º andar (se tiver),
 *              cobertura com platibanda, vidros/caixilhos/porta/ripado, e de 0,86 a 0,94 a pintura + jardim.
 *
 * Bloco ILUSTRATIVO 1,00 × 0,50 × 0,15 m (face real a confirmar com o Vinicius).
 * Celular antigo ("baixa"): sem antialias, sem reflexo de ambiente, texturas pequenas, resolução 1×.
 *
 * API (window.ImperioCasa3D): iniciar(canvas) · progresso(p) · tipo(id) · etapas() · ficha() · guiaTela(a)
 *                             redimensionar() · renderAgora() · blocos() · aoDesenhar(fn)
 */
import {
  ACESFilmicToneMapping, BoxGeometry, CanvasTexture, Color, DirectionalLight, Group, HemisphereLight, IcosahedronGeometry,
  InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PCFSoftShadowMap,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, RepeatWrapping, RoomEnvironment, Scene, SRGBColorSpace, Vector3,
  WebGLRenderer, Raycaster, Vector2, Matrix4,
} from "../vendor/three-imperio.min.js";

// MÁXIMA RESOLUÇÃO: parado desenha na resolução nativa da tela (até 3×; min > 1 = superamostragem em tela comum).
// Enquanto rola desenha leve (sem travar) e, parado ~0,16 s, refaz no máximo — em qualquer aparelho.
const NIVEIS = {
  alta: { hd: 3, leve: 2, min: 2, tex: 2048, sombra: true, mapa: 4096, aa: true, ambiente: true },
  media: { hd: 3, leve: 2, min: 2, tex: 1024, sombra: false, mapa: 1024, aa: true, ambiente: true },
  baixa: { hd: 3, leve: 1.5, min: 1.5, tex: 512, sombra: false, mapa: 1024, aa: true, ambiente: true },
};

const BL = 1.0;    // comprimento do bloco
const BA = 0.5;    // altura (1 fiada)
const BE = 0.15;   // espessura (Blocão 15 cm)
const FIADAS = 6;  // 3 m de piso a piso
const JUNTA = 0.012;
const PE = FIADAS * BA;
const LAJE = 0.2;
const CHAO = 0.05; // topo do alicerce

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
  t.anisotropy = 16; // a placa limita ao máximo que suporta
  return t;
}

/** Concreto: base cinza com manchas e poros. */
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
      c.arc(r() * n, r() * n, 0.5 + r() * (n / 400), 0, 7);
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

/** Ponta do bloco (corte): concreto | EPS | concreto na largura — o "recheio" do Blocão aparece no corte da parede. */
function texPonta(tam) {
  return telaTex(tam, (c, n) => {
    const r = aleatorio(13);
    const a = (3.5 / 15) * n;
    c.fillStyle = "#a6a29a";
    c.fillRect(0, 0, n, n);
    c.fillStyle = "#f3f1eb";
    c.fillRect(a, 0, n - 2 * a, n);
    for (let i = 0; i < n * 3; i++) { // pérolas do EPS
      c.fillStyle = `rgba(${205 + r() * 30},${203 + r() * 30},${196 + r() * 30},.7)`;
      c.beginPath();
      c.arc(a + r() * (n - 2 * a), r() * n, 0.8 + r() * (n / 90), 0, 7);
      c.fill();
    }
    for (let i = 0; i < n; i++) { // agregado do concreto
      c.fillStyle = `rgba(${120 + r() * 50},${118 + r() * 50},${112 + r() * 50},.5)`;
      const x = r() < 0.5 ? r() * a : n - a + r() * a;
      c.fillRect(x, r() * n, 1 + r() * 2, 1 + r() * 2);
    }
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

/* ------------------------------------------------------------------ */
/* Projetos. Paredes: [eixo, coordenada fixa, início, fim, vãos]        */
/* vão {a, b, f0, f1, porta} = trecho a..b vazio da fiada f0 até f1-1   */
/* A = térreo, B = andar de cima (frente = +z)                          */
/* ------------------------------------------------------------------ */
function paredes(R, vaos) {
  const { x0, x1, z0, z1 } = R;
  return [
    ["x", z1, x0, x1, vaos.frente || []],
    ["z", x1 - BE / 2, z1 - BE, z0 + BE, vaos.direita || []],
    ["x", z0, x1, x0, vaos.fundos || []],
    ["z", x0 + BE / 2, z0 + BE, z1 - BE, vaos.esquerda || []],
  ];
}

const PROJETOS = {
  simples: {
    nome: "Casa simples",
    ficha: "Casa térrea 6,5 × 7,5 m · 2 quartos · ≈ 49 m²",
    A: { x0: -3.25, x1: 3.25, z0: -4, z1: 3.5 },
    varanda: 1.6,
    vaosA: {
      frente: [{ a: -2.6, b: -0.8, f0: 2, f1: 5 }, { a: 0.5, b: 1.5, f0: 0, f1: 5, porta: true }],
      direita: [{ a: -2.5, b: -1.3, f0: 2, f1: 5 }, { a: 0.8, b: 2, f0: 2, f1: 5 }],
      fundos: [{ a: -1, b: 0.2, f0: 3, f1: 5 }],
      esquerda: [{ a: -1.8, b: -0.6, f0: 2, f1: 5 }],
    },
    base: { x: 11, z: 13, cz: 0.8 },
    centro: [0, 1.5, 0.8],
    raio: 9.8,
    jardim: {
      caminho: { x: 1, n: 2 },
      cerca: [[-2.2, 2.2], [2.8, 1.6]],
      arvores: [[-4.4, -2.4, 0.85]],
      gente: [[2.3, 2]],
    },
  },
  media: {
    nome: "Casa média",
    ficha: "Sobrado 9 × 7 m · 2 andares · ≈ 125 m²",
    A: { x0: -4.5, x1: 4.5, z0: -4, z1: 3 },
    B: { x0: -4.5, x1: 4.5, z0: -4, z1: 3 },
    varanda: 2,
    vaosA: {
      frente: [{ a: -3.6, b: -0.6, f0: 1, f1: 5 }, { a: 1, b: 2.2, f0: 0, f1: 5, porta: true }],
      direita: [{ a: -2.2, b: -0.4, f0: 2, f1: 5 }],
      fundos: [{ a: -2, b: 1, f0: 2, f1: 5 }],
      esquerda: [{ a: -1.6, b: 0.4, f0: 2, f1: 5 }],
    },
    vaosB: {
      frente: [{ a: -3.6, b: 1.2, f0: 0, f1: 5 }, { a: 2.5, b: 3.7, f0: 2, f1: 5 }],
      direita: [{ a: -2.2, b: -0.4, f0: 2, f1: 5 }],
      fundos: [{ a: -1, b: 2, f0: 2, f1: 5 }],
      esquerda: [{ a: -2, b: -0.4, f0: 2, f1: 5 }],
    },
    ripado: { x: 2.2, n: 12 },
    base: { x: 15, z: 14, cz: 0.6 },
    centro: [0, 2.6, 0.6],
    raio: 10.4,
    jardim: {
      caminho: { x: 1.6, n: 4 },
      cerca: [[-3.6, 4.6], [4.9, 2.8]],
      arvores: [[-6, -2.6, 1], [6.1, -1.2, 0.85], [-6.2, 3.6, 0.7]],
      gente: [[3, 7.4], [-1.4, 4.1]],
    },
  },
  casarao: {
    nome: "Casarão",
    ficha: "Casarão 15 × 10 m · 2 andares · piscina · ≈ 285 m²",
    A: { x0: -7.5, x1: 7.5, z0: -5, z1: 5 },
    B: { x0: -7.5, x1: 7.5, z0: -5, z1: 4 },
    varanda: 2.4,
    vaosA: {
      frente: [{ a: -6.6, b: -1.2, f0: 0, f1: 6 }, { a: 0.2, b: 1.8, f0: 0, f1: 6, porta: true }, { a: 3.2, b: 6.6, f0: 1, f1: 5 }],
      direita: [{ a: -3, b: 3, f0: 0, f1: 5 }],
      fundos: [{ a: -4, b: 4, f0: 0, f1: 5 }],
      esquerda: [{ a: -2, b: 2, f0: 2, f1: 5 }],
    },
    vaosB: {
      frente: [{ a: -6.6, b: -0.8, f0: 0, f1: 5 }, { a: 0.8, b: 4, f0: 0, f1: 5 }],
      direita: [{ a: -2.6, b: 2.6, f0: 0, f1: 6 }],
      fundos: [{ a: -3, b: 3, f0: 2, f1: 5 }],
      esquerda: [{ a: -2.4, b: 1.4, f0: 2, f1: 5 }],
    },
    ripado: { x: 4.6, n: 14 },
    pedra: { x: 2.5, larg: 1.2 },
    piscina: { x: 11.2, z: 0.4, lx: 3.2, lz: 7.6 },
    base: { x: 30, z: 21, cz: 1 },
    centro: [2.2, 3, 1],
    raio: 16.4,
    jardim: {
      caminho: { x: 1, n: 4 },
      cerca: [[-4.5, 6.2], [5.2, 4.6]],
      arvores: [[-10, -3.5, 1.3], [-9.6, 4.5, 1], [13.6, -6.5, 1.1], [-3, -7.2, 0.9]],
      gente: [[3.4, 9.3], [-3, 6.2], [9.4, 3.6]],
    },
  },
};

/** Linha do tempo de cada tipo (térrea é mais curta e não tem 2º andar). */
function tempos(P) {
  if (P.B) {
    return {
      paredes: [[0.12, 0.28], [0.47, 0.27]], laje: [0.4, 0.47], pilares: [0.41, 0.46], cobertura: [0.74, 0.79],
      platibanda: [0.76, 0.8], vidros: 0.8, etapas: [[0, "O Blocão vai pro lugar"], [0.12, "Paredes do térreo, fiada por fiada"],
        [0.4, "Laje e varanda"], [0.47, "Segundo andar"], [0.74, "Platibanda, vidro e madeira"], [0.86, "Pintura e jardim: casa pronta"]],
    };
  }
  return {
    paredes: [[0.12, 0.42]], laje: null, pilares: [0.52, 0.58], cobertura: [0.56, 0.64], platibanda: [0.6, 0.68], vidros: 0.7,
    etapas: [[0, "O Blocão vai pro lugar"], [0.12, "Paredes, fiada por fiada"], [0.52, "Varanda e laje"],
      [0.62, "Platibanda, janelas e porta"], [0.86, "Pintura e jardim: casa pronta"]],
  };
}

/** Gera os blocos (amarração: fiadas ímpares começam com meio bloco) e os vãos. */
function levantar(defs, yBase, andar) {
  const blocos = [];
  const vaos = [];
  const muros = [];
  let percorrido = 0;
  const comps = defs.map(([, , i, f]) => Math.abs(f - i));
  const total = comps.reduce((s, c) => s + c, 0);
  defs.forEach(([eixo, fixo, ini, fim, abert], w) => {
    const sentido = Math.sign(fim - ini);
    const comp = comps[w];
    const parede = andar * 4 + w;
    muros.push({ id: parede, eixo, fixo, ini, fim, andar, y0: yBase, fora: Math.sign(fixo || 1) });
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
            parede,
          });
        });
        s = e;
        primeiro = BL;
      }
    }
    abert.forEach((v) => vaos.push({ eixo, fixo, a: v.a, b: v.b, y0: yBase + v.f0 * BA, y1: yBase + v.f1 * BA, porta: !!v.porta, parede }));
    percorrido += comp;
  });
  return { blocos, vaos, muros };
}

/* ---------- cena ---------- */
let renderer;
let cena;
let camera;
let nivel;
let mats;
let geoBloco;
let obra;                 // Group com a casa atual (trocar de tipo = refazer só ele)
let projeto;
let T;
let blocosMesh;
let pinturaMesh;
let lista = [];
let pecas = [];
let p = 0;
let pDesenhado = -1;
let assentados = 0;
let ouvinte = null;
let guia;
let primeiro = 0;
let tipoAtual = "media";
let alvoTela = null;      // { cx, cy, larg, giro, inclinar } do Blocão no fim do "L" (px na tela)
let blocoDoSite = false;  // true = o PRÓPRIO Blocão do site (bloco3d) faz o voo; a cópia daqui não aparece
let camAng = 0;
let camElev = 0;
const _proj = new Vector3();
/* paredes móveis (casa pronta): toque numa parede → ela sai e a câmera entra pela abertura */
let muros = [];            // { id, eixo, fixo, ini, fim, andar, y0, fora }
let pinturaOrig = [];      // matriz original da pintura de cada bloco
const fora = new Map();    // id da parede → { de, para, t0 } (0 = no lugar, 1 = removida)
let revelados = new Set(); // blocos vizinhos do corte: sem pintura (mostram o Blocão cru, com o EPS na ponta)
let interior = null;       // { de: {pos, alvo, fov, off}, para: {...}, t0, volta }
let ouvinteInterior = null;
const DUR_PAREDE = 700;
const DUR_CAMERA = 1300;
const _raycast = new Raycaster();
const _ndcV = new Vector2();
const _alvoCam = new Vector3();
const _o = new Object3D();
const _ini = new Object3D();
const _fim = new Object3D();
const _dir = new Vector3();
const _raio = new Vector3();
const centro = new Vector3();

function peca(geo, mat, x, y, z, entra, tipo = "desce") {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = nivel.sombra;
  m.userData = { base: m.position.clone(), entra, tipo, alt: geo.parameters ? geo.parameters.height || 0 : 0 };
  obra.add(m);
  pecas.push(m);
  return m;
}

function criarMateriais() {
  const tCon = texConcreto(nivel.tex);
  const tGuia = texConcreto(Math.min(1024, nivel.tex * 2));
  const tSan = texSanduiche(128);
  const tMad = texMadeira(Math.max(128, nivel.tex / 2));
  mats = {
    concreto: new MeshStandardMaterial({ map: tCon, roughness: 0.92, color: "#cfcac1" }),
    topo: new MeshStandardMaterial({ map: tSan, roughness: 0.9, color: "#e2ded6" }),
    ponta: new MeshStandardMaterial({ map: texPonta(Math.min(512, nivel.tex)), roughness: 0.9 }),
    guia: new MeshStandardMaterial({ map: tGuia, roughness: 0.9, color: "#d6d1c8" }),
    pintura: new MeshStandardMaterial({ color: "#f2efe8", roughness: 0.85, transparent: true, opacity: 0 }),
    branco: new MeshStandardMaterial({ color: "#f4f2ed", roughness: 0.8 }),
    grafite: new MeshStandardMaterial({ color: "#2a2c2f", roughness: 0.55, metalness: 0.3 }),
    madeira: new MeshStandardMaterial({ map: tMad, roughness: 0.7 }),
    grama: new MeshStandardMaterial({ color: "#9aa77f", roughness: 1 }),
    pedra: new MeshStandardMaterial({ color: "#d8d3c8", roughness: 0.95 }),
    pedraEscura: new MeshStandardMaterial({ color: "#4a4743", roughness: 0.75, map: tCon }),
    vidro: new MeshStandardMaterial({ color: "#2b3a44", roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.5, emissive: new Color("#ffb867"), emissiveIntensity: 0 }),
    agua: new MeshStandardMaterial({ color: "#3d8fae", roughness: 0.05, metalness: 0.2, emissive: new Color("#1d5f7a"), emissiveIntensity: 0.25 }),
    folha: new MeshStandardMaterial({ color: "#46623f", roughness: 0.9, flatShading: true }),
    tronco: new MeshStandardMaterial({ color: "#5b4636", roughness: 1 }),
    gente: new MeshStandardMaterial({ color: "#fbfaf7", roughness: 0.6 }),
    sombra: new MeshBasicMaterial({ map: texSombra(), transparent: true, depthWrite: false }),
  };
  geoBloco = new BoxGeometry(BL - JUNTA, BA - JUNTA, BE);
  const uv = geoBloco.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4);
    if (face >= 4) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i) * 1.1); // frente/verso; pontas e topo: o sanduíche fica inteiro
  }
  // o Blocão "do site" (vira o 1º bloco de qualquer casa): mesma peça, textura mais fina
  guia = new Mesh(geoBloco, [mats.guia, mats.guia, mats.topo, mats.topo, mats.guia, mats.guia]);
  guia.castShadow = nivel.sombra;
  cena.add(guia);
}

/** Desmonta a casa atual (libera geometrias; os materiais são compartilhados entre os tipos). */
function limparObra() {
  if (!obra) return;
  obra.traverse((o) => { if (o.geometry && o.geometry !== geoBloco) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
  cena.remove(obra);
}

function montar(id) {
  limparObra();
  tipoAtual = PROJETOS[id] ? id : "media";
  projeto = PROJETOS[tipoAtual];
  T = tempos(projeto);
  obra = new Group();
  cena.add(obra);
  pecas = [];
  const P = projeto;
  const { A, B } = P;
  const M = mats;
  centro.set(...P.centro);

  // base da maquete (surge por baixo do Blocão quando ele começa a descer)
  const { x: bx, z: bz, cz } = P.base;
  for (const [g, mat, y, ent] of [
    [new BoxGeometry(bx, 0.35, bz), M.branco, -0.195, [0.02, 0.1]],
    [new BoxGeometry(bx + 0.02, 0.04, bz + 0.02), M.grafite, -0.37, [0.02, 0.1]],
    [new BoxGeometry(bx - 0.3, 0.04, bz - 0.3), M.grama, 0, [0.03, 0.1]],
  ]) {
    const m = peca(g, mat, P.centro[0] * 0.4, y, cz, ent, "sobe");
    m.castShadow = false;
  }
  if (!nivel.sombra) {
    const s = peca(new PlaneGeometry((A.x1 - A.x0) * 1.5 + 2, (A.z1 - A.z0 + P.varanda) * 1.5 + 2), M.sombra, (A.x0 + A.x1) / 2 + 0.3, 0.025, (A.z0 + A.z1) / 2, [0.06, 0.12], "sobe");
    s.rotation.x = -Math.PI / 2;
    s.castShadow = s.receiveShadow = false;
  }

  // blocos: 1 malha instanciada (concreto nas faces, sanduíche no topo e na base) + pintura por cima
  const t = levantar(paredes(A, P.vaosA), CHAO, 0);
  const Y2 = CHAO + PE + LAJE;
  const c = B ? levantar(paredes(B, P.vaosB), Y2, 1) : { blocos: [], vaos: [] };
  lista = t.blocos.concat(c.blocos);
  muros = t.muros.concat(c.muros);
  fora.clear();
  revelados = new Set();
  interior = null;
  primeiro = lista.reduce((m, bl, i) => (bl.fiada === 0 && bl.ordem < lista[m].ordem ? i : m), 0);
  // faces: +x, -x (pontas: o corte com o EPS), +y, -y (topo/base: sanduíche), +z, -z (concreto)
  blocosMesh = new InstancedMesh(geoBloco, [M.ponta, M.ponta, M.topo, M.topo, M.concreto, M.concreto], lista.length);
  blocosMesh.castShadow = blocosMesh.receiveShadow = nivel.sombra;
  blocosMesh.frustumCulled = false; // as instâncias se espalham pela casa toda
  obra.add(blocosMesh);
  pinturaMesh = new InstancedMesh(new BoxGeometry(BL, BA, BE + 0.012), M.pintura, lista.length);
  lista.forEach((bl, i) => {
    _o.position.set(bl.x, bl.y, bl.z);
    _o.rotation.set(0, bl.girado ? Math.PI / 2 : 0, 0);
    _o.scale.set(bl.comp + 0.004, 1.01, 1);
    _o.updateMatrix();
    pinturaMesh.setMatrixAt(i, _o.matrix);
    pinturaOrig[i] = _o.matrix.clone();
  });
  pinturaMesh.visible = false;
  pinturaMesh.frustumCulled = false;
  obra.add(pinturaMesh);

  const L = A.x1 - A.x0;
  const xm = (A.x0 + A.x1) / 2;
  const zFrente = A.z1 + P.varanda;               // frente da varanda
  const zMeioV = (A.z0 + zFrente) / 2;
  // alicerce (radier): a casa e a varanda
  peca(new BoxGeometry(L + 0.4, 0.12, zFrente - A.z0 + 0.4), M.pedra, xm, -0.01, zMeioV, [0, 0.06], "sobe");
  // pilares finos da varanda (3 se a casa for larga)
  const xs = L > 12 ? [A.x0 + 0.2, xm, A.x1 - 0.2] : [A.x0 + 0.2, A.x1 - 0.2];
  xs.forEach((x, i) => peca(new BoxGeometry(0.16, PE, 0.16), M.grafite, x, CHAO + PE / 2, zFrente - 0.15, [T.pilares[0] + i * 0.01, T.pilares[1] + i * 0.01], "cresce"));
  // deck de madeira na varanda do térreo
  peca(new BoxGeometry(L - 0.1, 0.06, P.varanda - 0.05), M.madeira, xm, CHAO + 0.03, A.z1 + P.varanda / 2, [T.vidros, T.vidros + 0.04], "sobe");

  let yTopo;
  let R; // retângulo coberto pela cobertura
  if (B) {
    // laje do 1º andar avançando sobre a varanda (vira o piso da varanda de cima)
    peca(new BoxGeometry(L + 0.3, LAJE, zFrente - A.z0 + 0.3), M.branco, xm, CHAO + PE + LAJE / 2, zMeioV, T.laje);
    yTopo = Y2 + PE;
    R = { x0: B.x0, x1: B.x1, z0: B.z0, z1: B.z1 + 0.6 };
    // varanda de cima: guarda-corpo de vidro (frente e laterais) com corrimão grafite
    peca(new BoxGeometry(L, 1.0, 0.02), M.vidro, xm, Y2 + 0.5, zFrente - 0.05, [0.82, 0.86], "cresce");
    peca(new BoxGeometry(L + 0.02, 0.05, 0.06), M.grafite, xm, Y2 + 1.02, zFrente - 0.05, [0.83, 0.86], "cresce");
    const fundoV = zFrente - B.z1;
    [A.x0 + 0.02, A.x1 - 0.02].forEach((x) => {
      const g = peca(new BoxGeometry(fundoV, 1.0, 0.02), M.vidro, x, Y2 + 0.5, B.z1 + fundoV / 2, [0.82, 0.86], "cresce");
      g.rotation.y = Math.PI / 2;
    });
  } else {
    yTopo = CHAO + PE;
    R = { x0: A.x0, x1: A.x1, z0: A.z0, z1: zFrente }; // térrea: a laje cobre a varanda também
  }
  // cobertura com platibanda (telhado embutido)
  const lx = R.x1 - R.x0 + 0.5;
  const lz = R.z1 - R.z0 + 0.4;
  const rx = (R.x0 + R.x1) / 2;
  const rz = (R.z0 + R.z1) / 2;
  peca(new BoxGeometry(lx, 0.2, lz), M.branco, rx, yTopo + 0.1, rz, T.cobertura);
  [[lx, 0.55, 0.14, rx, R.z1 + 0.13], [lx, 0.55, 0.14, rx, R.z0 - 0.13], [0.14, 0.55, lz, R.x0 - 0.18, rz], [0.14, 0.55, lz, R.x1 + 0.18, rz]]
    .forEach(([a, b, d, x, z], i) => peca(new BoxGeometry(a, b, d), M.branco, x, yTopo + 0.45, z, [T.platibanda[0] + i * 0.008, T.platibanda[1] + i * 0.004]));
  peca(new BoxGeometry(lx + 0.02, 0.05, 0.05), M.grafite, rx, yTopo + 0.7, R.z1 + 0.21, [T.platibanda[1] - 0.02, T.platibanda[1] + 0.01]);

  // vidros, portas e caixilhos nos vãos
  t.vaos.concat(c.vaos).forEach((v, k) => {
    const larg = v.b - v.a;
    const alt = v.y1 - v.y0;
    const meio = (v.a + v.b) / 2;
    const x = v.eixo === "x" ? meio : v.fixo;
    const z = v.eixo === "x" ? v.fixo - Math.sign(v.fixo || 1) * (BE / 2) : meio;
    const rot = v.eixo === "z";
    const ent = [T.vidros + (k % 6) * 0.006, T.vidros + 0.04 + (k % 6) * 0.006];
    const g = v.porta ? new BoxGeometry(larg - 0.04, alt - 0.02, 0.06) : new BoxGeometry(larg - 0.06, alt - 0.06, 0.03);
    const m = peca(g, v.porta ? M.madeira : M.vidro, x, v.y0 + alt / 2, z, ent, "cresce");
    m.userData.parede = v.parede;
    if (rot) m.rotation.y = Math.PI / 2;
    if (v.porta) return;
    const f = 0.05;
    const quadro = [[larg, f, 0, alt / 2 - f / 2], [larg, f, 0, -alt / 2 + f / 2], [f, alt, -larg / 2 + f / 2, 0], [f, alt, larg / 2 - f / 2, 0]];
    if (larg > 2.6) quadro.push([f, alt, 0, 0]); // pano grande: montante no meio
    quadro.forEach(([qx, qy, dx, dy]) => {
      const cx = peca(new BoxGeometry(qx, qy, 0.07), M.grafite, rot ? x : x + dx, v.y0 + alt / 2 + dy, rot ? z + dx : z, ent, "cresce");
      cx.userData.parede = v.parede;
      if (rot) cx.rotation.y = Math.PI / 2;
    });
  });

  // ripado de madeira (brise) na fachada de cima e painel de pedra (casarão)
  if (P.ripado && B) {
    for (let i = 0; i < P.ripado.n; i++) {
      peca(new BoxGeometry(0.06, PE - 0.2, 0.08), M.madeira, P.ripado.x + i * 0.19, Y2 + PE / 2, B.z1 + 0.12, [0.81 + i * 0.003, 0.85 + i * 0.003], "cresce").userData.parede = 4;
    }
  }
  if (P.pedra) peca(new BoxGeometry(P.pedra.larg, PE, 0.06), M.pedraEscura, P.pedra.x, CHAO + PE / 2, A.z1 + 0.04, [T.vidros + 0.02, T.vidros + 0.06], "cresce").userData.parede = 0;

  // piscina com deck (casarão)
  if (P.piscina) {
    const q = P.piscina;
    peca(new BoxGeometry(q.lx + 2.2, 0.1, q.lz + 1.6), M.madeira, q.x, -0.0, q.z, [0.86, 0.9], "sobe");
    peca(new BoxGeometry(q.lx, 0.05, q.lz), M.agua, q.x, 0.04, q.z, [0.88, 0.92], "sobe");
  }

  // jardim: caminho de pedra, cerca viva, árvores e bonequinhos de escala
  const J = P.jardim;
  for (let i = 0; i < J.caminho.n; i++) peca(new BoxGeometry(1.1, 0.04, 0.6), M.pedra, J.caminho.x, 0.04, zFrente + 0.6 + i * 0.85, [0.86 + i * 0.006, 0.9 + i * 0.006], "sobe");
  J.cerca.forEach(([x, larg], i) => { peca(new BoxGeometry(larg, 0.5, 0.5), M.folha, x, 0.27, zFrente + 1.6, [0.87 + i * 0.005, 0.91 + i * 0.005], "cresce").userData.jardim = true; });
  J.arvores.forEach(([x, z, s], i) => {
    const ent = [0.88 + i * 0.01, 0.93 + i * 0.01];
    peca(new BoxGeometry(0.16, 1.5 * s, 0.16), M.tronco, x, 0.75 * s, z, ent, "cresce").userData.jardim = true;
    const copa = peca(new IcosahedronGeometry(1, 1), M.folha, x, 2.3 * s, z, ent, "cresce");
    copa.userData.jardim = true;
    copa.scale.set(1.2 * s, 1.5 * s, 1.2 * s);
    copa.userData.escala = copa.scale.clone();
  });
  J.gente.forEach(([x, z], i) => {
    const ent = [0.9 + i * 0.01, 0.94 + i * 0.01];
    peca(new BoxGeometry(0.34, 1.35, 0.2), M.gente, x, 0.72, z, ent, "cresce").userData.jardim = true;
    peca(new IcosahedronGeometry(0.13, 1), M.gente, x, 1.6, z, ent, "cresce").userData.jardim = true;
  });
  pDesenhado = -1;
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
  // tela larga: a casa ocupa a parte direita (texto à esquerda) → ~70 % da largura.
  // celular: escolha de tipo em cima e textos embaixo → a maquete usa a faixa do meio
  const reserva = largaTela ? 0 : Math.min(300, h * 0.38);
  const topo = largaTela ? 0 : 118;
  const altUtil = h - reserva - topo;
  const vUtil = 2 * Math.atan(Math.tan(vfov / 2) * (altUtil / h));
  const util = Math.min(vUtil, hfov * (largaTela ? 0.7 : 1));
  const dist = (projeto.raio / Math.sin(util / 2)) * MathUtils.lerp(1.0, 0.97, suave(p));
  const ang = MathUtils.lerp(-0.6, 0.45, suave(p));
  const elev = MathUtils.lerp(0.5, 0.36, suave(p)); // começa mais de cima (vê os blocos assentando) e desce
  camAng = ang;
  camElev = elev;
  camera.position.set(centro.x + Math.sin(ang) * Math.cos(elev) * dist, centro.y + Math.sin(elev) * dist, centro.z + Math.cos(ang) * Math.cos(elev) * dist);
  camera.far = dist * 3;
  const offX = largaTela ? -w * 0.16 : 0;
  const offY = largaTela ? 0 : (reserva - topo) / 2; // celular: a maquete fica no meio da faixa livre
  let alvo = centro;
  let off = 1;
  let fov = 26;
  if (interior) {
    // câmera entrando pela parede aberta (ou voltando pra vista da rolagem)
    const k = suave((agora() - interior.t0) / DUR_CAMERA);
    const de = interior.de;
    const para = interior.volta ? { pos: camera.position.clone(), alvo: centro, fov: 26, off: 1 } : interior.para;
    camera.position.lerpVectors(de.pos, para.pos, k);
    alvo = _alvoCam.lerpVectors(de.alvo, para.alvo, k);
    fov = de.fov + (para.fov - de.fov) * k;
    off = de.off + (para.off - de.off) * k;
  }
  camera.fov = fov;
  camera.near = interior ? 0.1 : 1;
  camera.lookAt(alvo);
  ultimoAlvo.copy(alvo);
  ultimoOff = off;
  camera.setViewOffset(w, h, offX * off, offY * off, w, h);
}

/**
 * O Blocão do site vira o 1º bloco da casa: começa EXATAMENTE onde ele terminou o "L" (mesmo ponto da tela,
 * mesma largura em px, mesmo ângulo) e voa encolhendo, num arco, até o canto da obra.
 */
function moverGuia() {
  const e = suave(faixa(p, 0, 0.12));
  guia.visible = e < 1 && !blocoDoSite;
  if (!guia.visible) return;
  const el = renderer.domElement;
  const w = el.clientWidth;
  const h = el.clientHeight;
  const D = 9;
  const tan = Math.tan(MathUtils.degToRad(camera.fov) / 2);
  camera.getWorldDirection(_dir);
  let largura;
  if (alvoTela) {
    _raio.set((alvoTela.cx / w) * 2 - 1, -(alvoTela.cy / h) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    _ini.position.copy(camera.position).addScaledVector(_raio, D / Math.max(0.2, _raio.dot(_dir)));
    largura = (alvoTela.larg * 2 * D * tan) / h;
    // a câmera do bloco olha levemente pra baixo (~0,144 rad): soma na inclinação pra o ângulo bater na tela
    _o.rotation.set(alvoTela.inclinar + 0.144, alvoTela.giro, 0);
  } else {
    const asp = w / Math.max(1, h);
    _ini.position.copy(camera.position).addScaledVector(_dir, D);
    largura = Math.min((asp < 1.15 ? 0.72 : 0.36) * 2 * D * tan * asp, 0.9 * 2 * D * tan);
    _o.rotation.set(0.3, -0.55, 0);
  }
  _ini.quaternion.copy(camera.quaternion).multiply(_o.quaternion);
  const bl = lista[primeiro];
  _fim.position.set(bl.x, bl.y, bl.z);
  _fim.rotation.set(0, bl.girado ? Math.PI / 2 : 0, 0);
  const v = e * e; // fica grande na tela um pouco mais e depois "mergulha" até a obra
  guia.position.lerpVectors(_ini.position, _fim.position, v);
  guia.position.y += Math.sin(Math.PI * v) * 1.2;
  guia.quaternion.slerpQuaternions(_ini.quaternion, _fim.quaternion, e);
  const s0 = largura / BL;
  const k = s0 + (1 - s0) * v;
  guia.scale.set(bl.comp * k, k, k);
}

/* ---------- paredes móveis (casa pronta) ---------- */
const ZERO = new Matrix4().makeScale(0, 0, 0);
const agora = () => performance.now();
const muroDe = (id) => muros.find((m) => m.id === id);
const normalDe = (m) => (m.eixo === "x" ? [0, m.fora] : [m.fora, 0]);
const tangenteDe = (m) => { const s = Math.sign(m.fim - m.ini) || 1; return m.eixo === "x" ? [s, 0] : [0, s]; };

/** 0 = parede no lugar, 1 = removida (animação no tempo, não na rolagem) */
function estadoParede(id) {
  const a = fora.get(id);
  if (!a) return 0;
  return a.de + (a.para - a.de) * suave((agora() - a.t0) / DUR_PAREDE);
}

function animando() {
  const t = agora();
  for (const a of fora.values()) if (t - a.t0 < DUR_PAREDE) return true;
  return !!interior && t - interior.t0 < DUR_CAMERA;
}

/**
 * Blocos das paredes VIZINHAS que encostam na parede removida: perdem a pintura e mostram o Blocão cru —
 * no corte aparece o "recheio" (concreto | EPS | concreto) na ponta de cada bloco.
 */
function atualizarRevelados() {
  revelados = new Set();
  for (const [id, a] of fora) {
    if (a.para === 0) continue;
    const m = muroDe(id);
    const lo = m.eixo === "x" ? Math.min(m.fixo, m.fixo - m.fora * BE) : m.fixo - BE / 2;
    const hi = m.eixo === "x" ? Math.max(m.fixo, m.fixo - m.fora * BE) : m.fixo + BE / 2;
    lista.forEach((bl, i) => {
      if (bl.parede === id || Math.floor(bl.parede / 4) !== m.andar) return;
      if ((m.eixo === "x") !== bl.girado) return; // só as paredes perpendiculares encostam no corte
      const c = m.eixo === "x" ? bl.z : bl.x;
      const e0 = c - bl.comp / 2;
      const e1 = c + bl.comp / 2;
      if ((e0 > lo - 0.06 && e0 < hi + 0.06) || (e1 > lo - 0.06 && e1 < hi + 0.06)) revelados.add(i);
    });
  }
}

/** pose da câmera "entrando" pela abertura: de fora, perto de uma ponta, olhando pra dentro na diagonal */
function poseInterior(m) {
  const [nx, nz] = normalDe(m);
  const [tx, tz] = tangenteDe(m);
  const L = Math.abs(m.fim - m.ini);
  const meio = (m.ini + m.fim) / 2;
  const cx = m.eixo === "x" ? meio : m.fixo;
  const cz = m.eixo === "x" ? m.fixo : meio;
  // perto da PONTA da abertura (onde a parede vizinha foi "cortada"): o corte com o EPS aparece grande na tela,
  // e o olhar atravessa a casa na diagonal
  const jx = m.eixo === "x" ? m.ini : m.fixo;
  const jz = m.eixo === "x" ? m.fixo : m.ini;
  // celular em pé (tela estreita): olha mais pro canto e recua um pouco, senão o corte fica fora da tela
  const empe = camera.aspect < 1;
  const ir = empe ? Math.min(0.9, L * 0.15) : Math.min(2.4, L * 0.3);
  const recuo = empe ? 2.6 : 1.9;
  const dentro = empe ? 1.6 : 2.2;
  return {
    pos: new Vector3(jx - tx * (empe ? 0.6 : 0.35) + nx * recuo, m.y0 + 1.5, jz - tz * (empe ? 0.6 : 0.35) + nz * recuo),
    alvo: new Vector3(jx + tx * ir - nx * dentro, m.y0 + 1.15, jz + tz * ir - nz * dentro),
    fov: empe ? 72 : 62,
    off: 0,
  };
}

let ultimoAlvo = new Vector3();
let ultimoOff = 1;
function capturarPose() {
  return { pos: camera.position.clone(), alvo: ultimoAlvo.clone(), fov: camera.fov, off: ultimoOff };
}

function animar() {
  if (animando()) {
    desenhar(false);
    requestAnimationFrame(animar);
    return;
  }
  for (const [id, a] of fora) if (a.para === 0) fora.delete(id);
  if (interior && interior.volta) interior = null;
  atualizarRevelados();
  desenhar(true);
  if (ouvinteInterior) ouvinteInterior({ dentro: !!interior, removidas: fora.size });
}

function removerParede(id) {
  const m = muroDe(id);
  if (!m || estadoParede(id) > 0.99) return;
  fora.set(id, { de: estadoParede(id), para: 1, t0: agora() });
  atualizarRevelados();
  interior = { de: capturarPose(), para: poseInterior(m), t0: agora(), volta: false, muro: m };
  if (ouvinteInterior) ouvinteInterior({ dentro: true, removidas: fora.size });
  requestAnimationFrame(animar);
}

function recolocarParedes() {
  if (!fora.size && !interior) return;
  for (const id of [...fora.keys()]) fora.set(id, { de: estadoParede(id), para: 0, t0: agora() });
  if (interior) interior = { de: capturarPose(), t0: agora(), volta: true };
  requestAnimationFrame(animar);
}

function aplicar() {
  // blocos: cada um cai no lugar no seu tempo (fiada → volta da casa)
  assentados = 0;
  for (let i = 0; i < lista.length; i++) {
    const bl = lista[i];
    const andar = bl.fiada >= FIADAS ? 1 : 0;
    const f = bl.fiada - andar * FIADAS;
    const [t0, vao] = T.paredes[andar];
    const passo = vao / FIADAS;
    const ini = t0 + f * passo + bl.ordem * passo * 0.9;
    let e = limitar((p - ini) / 0.03);
    if (i === primeiro) e = p >= 0.12 ? 1 : 0; // o 1º é o próprio Blocão do site (o "guia" chega no lugar dele)
    if (e >= 1) assentados++;
    _o.position.set(bl.x, bl.y + (1 - pulo(e)) * 1.8, bl.z);
    _o.rotation.set((1 - e) * 0.5, (bl.girado ? Math.PI / 2 : 0) + (1 - e) * 0.4, 0);
    let s = e <= 0 ? 0.0001 : 1;
    const r = fora.size ? estadoParede(bl.parede) : 0;
    if (r > 0) { // parede saindo: desliza pra fora, sobe e some
      const [nx, nz] = normalDe(muroDe(bl.parede));
      _o.position.x += nx * r * 2.4;
      _o.position.z += nz * r * 2.4;
      _o.position.y += r * 1.2;
      s *= Math.max(0.0001, 1 - r);
    }
    _o.scale.set(bl.comp * s, s, s);
    _o.updateMatrix();
    blocosMesh.setMatrixAt(i, _o.matrix);
  }
  blocosMesh.instanceMatrix.needsUpdate = true;
  moverGuia();

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

  // vidros, portas, caixilhos e ripado saem junto com a parede deles
  if (fora.size) {
    for (const m of pecas) {
      const id = m.userData.parede;
      if (id === undefined || !m.visible) continue;
      const r = estadoParede(id);
      if (r <= 0) { m.position.x = m.userData.base.x; m.position.z = m.userData.base.z; continue; }
      const [nx, nz] = normalDe(muroDe(id));
      m.position.x = m.userData.base.x + nx * r * 2.4;
      m.position.z = m.userData.base.z + nz * r * 2.4;
      m.position.y += r * 1.2;
      m.visible = r < 0.98;
    }
  }

  // câmera dentro da casa: some o que ficar colado na lente (bonequinhos, pilares, árvores)
  if (interior) {
    for (const m of pecas) {
      if (m.visible && m.userData.parede === undefined && (m.userData.jardim || m.position.distanceTo(camera.position) < 2.6)) m.visible = false;
    }
  }

  // acabamento: pintura cobre os blocos; luz quente acende
  const tinta = suave(faixa(p, 0.86, 0.94));
  if (tinta > 0.001) {
    for (let i = 0; i < lista.length; i++) {
      const tirar = revelados.has(i) || (fora.size && estadoParede(lista[i].parede) > 0);
      pinturaMesh.setMatrixAt(i, tirar ? ZERO : pinturaOrig[i]);
    }
    pinturaMesh.instanceMatrix.needsUpdate = true;
  }
  pinturaMesh.visible = tinta > 0.001;
  mats.pintura.opacity = tinta;
  mats.pintura.transparent = tinta < 0.999;
  mats.pintura.depthWrite = tinta > 0.5;
  mats.vidro.emissiveIntensity = 0.55 * suave(faixa(p, 0.9, 1));
}

/* ---------- HD: leve enquanto rola, nítido quando para ---------- */
let ratioHD = 1;
let ratioLeve = 1;
let timerHD = 0;

function usarRatio(r) {
  if (renderer.getPixelRatio() === r) return;
  renderer.setPixelRatio(r);
  renderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight, false);
}

function desenhar(hd) {
  usarRatio(hd ? ratioHD : ratioLeve);
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

/* rolagem suave: a obra desliza até o ponto da rolagem (um dedo que dá solavanco ou a rolagem que para de repente
   não fazem a casa pular) — ~90 ms de "mola", independente da taxa de quadros do aparelho */
let pAlvo = 0;
let tUltimo = 0;
const MOLA = 90;
let pedido = false;
function pedir() {
  if (pedido || window.__gravandoVideo) return;
  pedido = true;
  requestAnimationFrame((t) => {
    pedido = false;
    if (p !== pAlvo) {
      const dt = Math.min(64, tUltimo ? t - tUltimo : 16);
      p += (pAlvo - p) * (1 - Math.exp(-dt / MOLA));
      if (Math.abs(pAlvo - p) < 0.0004) p = pAlvo;
    }
    tUltimo = p === pAlvo ? 0 : t;
    if (p !== pAlvo) pedir(); // ainda chegando: próximo quadro
    if (p === pDesenhado) return;
    desenhar(false);
    clearTimeout(timerHD);
    if (ratioHD > ratioLeve) timerHD = setTimeout(() => desenhar(true), 160);
  });
}

/** Devolve a vez pro navegador entre as etapas da preparação (a rolagem e o bloco 3D não congelam). */
function respirar() {
  if (window.__gravandoVideo) return Promise.resolve();
  return new Promise((r) => (window.requestIdleCallback ? window.requestIdleCallback(() => r(), { timeout: 300 }) : setTimeout(r, 16)));
}

/** Tudo visível uma vez: compila os materiais e envia texturas/geometrias agora (sem engasgo no meio da rolagem). */
async function aquecer() {
  const pAntes = p;
  p = 0.5;
  pecas.forEach((m) => { m.visible = true; });
  pinturaMesh.visible = true;
  mats.pintura.opacity = 0.5;
  posicionarCamera();
  if (renderer.compileAsync && renderer.extensions.has("KHR_parallel_shader_compile") && !window.__gravandoVideo) await renderer.compileAsync(cena, camera);
  else renderer.compile(cena, camera);
  await respirar();
  renderer.render(cena, camera);
  p = pAntes;
}

/**
 * Preparação em etapas curtas (cada uma num intervalo ocioso), em vez de um bloco único:
 * renderer → reflexo de ambiente (só PC/celular bom) → texturas + casa → materiais compilados → placa "aquecida".
 */
async function iniciar(canvas) {
  nivel = NIVEIS[document.documentElement.getAttribute("data-qualidade")] || NIVEIS.media;
  const nativo = window.devicePixelRatio || 1;
  ratioHD = Math.min(nivel.hd, Math.max(nivel.min, nativo));
  ratioLeve = Math.min(ratioHD, Math.max(1, Math.min(nativo, nivel.leve)));
  if (window.__gravandoVideo) ratioLeve = ratioHD;
  renderer = new WebGLRenderer({ canvas, antialias: nivel.aa, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!window.__gravandoVideo });
  renderer.setPixelRatio(ratioLeve);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  if (nivel.sombra) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap; }
  cena = new Scene();
  camera = new PerspectiveCamera(26, 1, 1, 200); // lente "fechada": perspectiva suave de maquete fotografada
  await respirar();
  if (nivel.ambiente) {
    const pm = new PMREMGenerator(renderer);
    cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    await respirar();
  }
  cena.add(new HemisphereLight("#fff6e8", "#b9b2a3", nivel.ambiente ? 0.9 : 1.6)); // chão neutro: nada de tom esverdeado nas paredes
  const sol = new DirectionalLight("#ffe7c4", 2.4);
  sol.position.set(14, 22, 12);
  if (nivel.sombra) {
    sol.castShadow = true;
    sol.shadow.mapSize.set(nivel.mapa, nivel.mapa);
    Object.assign(sol.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.03;
  }
  cena.add(sol);
  criarMateriais();
  montar(tipoAtual);
  redimensionar();
  await respirar();
  await aquecer();
  window.addEventListener("resize", () => { redimensionar(); pedir(); }, { passive: true });
  desenhar(true);
}

window.ImperioCasa3D = {
  iniciar,
  /** p = 0..1 da fase da casa (só desenha se mudou). Rolar de novo recoloca as paredes e a câmera volta. */
  progresso(novo) {
    novo = limitar(novo);
    if ((fora.size || interior) && Math.abs(novo - pAlvo) > 0.0005) recolocarParedes();
    // sem mola: no vídeo (quadro a quadro), em saltos grandes (menu "A casa") e durante o voo do Blocão do site
    // (0–0,13: a cena do bloco lê voo() a cada rolagem e o bloco tem que bater com a câmera da casa)
    if (window.__gravandoVideo || Math.abs(novo - p) > 0.3 || Math.min(novo, p) < 0.13) p = novo;
    pAlvo = novo;
    pedir();
  },
  /** toque/clique na tela (px do navegador): com a casa pronta, tira a parede tocada. Devolve true se tirou. */
  tocar(x, y) {
    if (!renderer || p < 0.95) return false;
    const r = renderer.domElement.getBoundingClientRect();
    _ndcV.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    _raycast.setFromCamera(_ndcV, camera);
    const alvos = [blocosMesh].concat(pecas.filter((m) => m.visible && m.userData.parede !== undefined));
    const hit = _raycast.intersectObjects(alvos, false)[0];
    if (!hit) return false;
    const id = hit.object === blocosMesh ? lista[hit.instanceId].parede : hit.object.userData.parede;
    if (id === undefined || estadoParede(id) > 0.5) return false;
    removerParede(id);
    return true;
  },
  recolocar() { recolocarParedes(); },
  /**
   * Onde está o corte (a ponta da parede vizinha, com o EPS à mostra) NA TELA, quando a câmera já entrou:
   * { x, y } em px do navegador, ou null (câmera andando / casa fechada).
   */
  pontoCorte() {
    if (!interior || interior.volta || agora() - interior.t0 < DUR_CAMERA || !interior.muro) return null;
    const m = interior.muro;
    const jx = m.eixo === "x" ? m.ini : m.fixo;
    const jz = m.eixo === "x" ? m.fixo : m.ini;
    const [nx, nz] = normalDe(m);
    _proj.set(jx - nx * BE * 1.5, m.y0 + 1.6, jz - nz * BE * 1.5).project(camera);
    if (_proj.z > 1) return null;
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((_proj.x + 1) / 2) * r.width, y: r.top + ((1 - _proj.y) / 2) * r.height };
  },
  /** fn({ dentro, removidas }) quando a câmera entra/sai da casa */
  aoInterior(fn) { ouvinteInterior = fn; },
  /** troca a casa ("simples" | "media" | "casarao") mantendo o ponto da rolagem */
  tipo(id) {
    if (id === tipoAtual || !PROJETOS[id]) return;
    montar(id);
    if (window.__gravandoVideo) return;
    desenhar(false);
    clearTimeout(timerHD);
    timerHD = setTimeout(() => desenhar(true), 160);
  },
  tipoAtual: () => tipoAtual,
  /** etapas do tipo atual: [[p, texto], ...] */
  etapas: () => T.etapas,
  ficha: () => projeto.ficha,
  redimensionar() { redimensionar(); pedir(); },
  /** vídeo quadro a quadro */
  renderAgora() { desenhar(true); },
  blocos() { return { assentados, total: lista.length }; },
  /** de onde o bloco da casa sai: { cx, cy, larg, giro, inclinar } do Blocão no fim do "L" */
  guiaTela(a) {
    if (!a) return;
    if (alvoTela && alvoTela.cx === a.cx && alvoTela.cy === a.cy && alvoTela.larg === a.larg) return;
    alvoTela = a;
    pDesenhado = -1;
  },
  /**
   * Voo do Blocão do site até o canto da obra (quem desenha o bloco voando é o bloco3d, sem cópia → sem "fantasma"):
   * devolve { e: 0..1 do voo, alvo: { cx, cy, larg, giro, inclinar } } = onde o 1º bloco da casa está NA TELA agora
   * (px, mesmo sistema do bloco3d), já com a câmera da casa na posição desta rolagem.
   */
  voo() {
    if (!renderer) return null;
    blocoDoSite = true;
    posicionarCamera();
    camera.updateMatrixWorld();
    const el = renderer.domElement;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const bl = lista[primeiro];
    _proj.set(bl.x, bl.y, bl.z);
    camera.getWorldDirection(_dir);
    const d = Math.max(0.1, _raio.copy(_proj).sub(camera.position).dot(_dir));
    _proj.project(camera);
    const pxPorM = h / (2 * d * Math.tan(MathUtils.degToRad(camera.fov) / 2));
    // o bloco (girado 0 no mundo) visto pela câmera que gira ang em volta: aparece girado −ang
    let giro = (bl.girado ? Math.PI / 2 : 0) - camAng;
    const ini = alvoTela ? alvoTela.giro : -0.5;
    while (giro - ini > Math.PI / 2) giro -= Math.PI; // a peça é simétrica: gira pelo caminho mais curto
    while (giro - ini < -Math.PI / 2) giro += Math.PI;
    return {
      e: suave(faixa(p, 0, 0.12)),
      alvo: { cx: ((_proj.x + 1) / 2) * w, cy: ((1 - _proj.y) / 2) * h, larg: bl.comp * pxPorM, giro, inclinar: camElev - 0.144 },
    };
  },
  /** fn({ assentados, total }) depois de cada desenho (contador de blocos da seção) */
  aoDesenhar(fn) { ouvinte = fn; },
};
window.dispatchEvent(new Event("imperio-casa3d-pronta"));

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
import { cenario, escada, fundirPorMaterial, garagem, guardaCorpo, mobiliar } from "./casa-interior.js?v=20261103d";
import { carregarTexturas, comFoto, LADO, ligarTexturas, texturasLigadas, uvMetros, uvNaCaixa } from "./texturas.js?v=20261103d";

const BLOCO_UV = 2.2; // UV da frente do bloco por metro (geoBloco)

// Resolução nítida (2× = Retina) e FIXA: rolando ou parado, a mesma — sem realocar a imagem na GPU (sem trancos).
const NIVEIS = {
  // resolução FIXA (sem trocar entre rolar/parar — a troca realocava a imagem na GPU e travava)
  alta: { hd: 2, leve: 2, min: 1, tex: 1024, sombra: true, mapa: 2048, aa: true, ambiente: true },
  media: { hd: 1.5, leve: 1.5, min: 1, tex: 512, sombra: false, mapa: 1024, aa: true, ambiente: true },
  baixa: { hd: 1.25, leve: 1.25, min: 1, tex: 256, sombra: false, mapa: 1024, aa: true, ambiente: false },
};

const R90 = Math.PI / 2;
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
    // paredes internas (também de Blocão): sala/cozinha na frente, 2 quartos e o banheiro no fundo
    internasA: [
      ["x", -0.3, -3.1, 3.1, [{ a: -2.2, b: -1.4, f0: 0, f1: 4 }, { a: 1.3, b: 2.1, f0: 0, f1: 4 }]],
      ["z", 0.5, -3.85, -0.375, []],
      ["z", 1.9, -3.85, -1.975, []],
      ["x", -1.9, 0.575, 1.825, [{ a: 0.85, b: 1.55, f0: 0, f1: 4 }]],
    ],
    mobilia: [
      ["rackTv", -2.87, 1.4, R90], ["sofa", -0.55, 1.4, -R90, 0, { w: 2.0 }], ["mesaCentro", -1.7, 1.4, R90], ["tapete", -1.6, 1.4, R90, 0, { w: 2.2, d: 1.6 }],
      ["cozinha", 2.8, 1.2, -R90, 0, { w: 2.6, alto: false }], ["geladeira", 2.73, 2.95, -R90], ["mesaJantar", 0.9, 1.0, R90, 0, { w: 1.2, lugares: 4 }],
      ["planta", -2.8, 3.0, 0],
      ["cama", -1.75, -2.75, 0], ["criado", -2.85, -3.55, 0], ["criado", -0.65, -3.55, 0], ["armario", -0.45, -0.69, Math.PI, 0, { w: 1.6 }],
      ["cama", 2.5, -2.8, 0, 0, { solteiro: true, tecido: "verde" }], ["armario", 0.875, -0.95, R90, 0, { w: 1.1 }],
      ["vaso", 1.6, -3.55, 0], ["box", 0.98, -3.4, 0, 0, { w: 0.8 }], ["pia", 0.83, -2.4, R90, 0, { w: 0.6 }],
    ],
    quadros: [[0, 1.6, -0.205, 0, 0.8, 1.0, 0], [-3.08, 1.6, -3.0, R90, 0.6, 0.8, 1], [2.5, 1.75, -3.83, 0, 0.7, 0.5, 2]],
    luzes: [[-1.5, 1.4], [1.5, 1.4], [-1.4, -2.2], [2.4, -1.4], [1.2, -2.9]],
    garagem: { x: 4.95, z: 1.4 },
    // tour (sobrevoo automático): [x, y, z, olharX, olharY, olharZ, m/s, legenda] — entra, passa por todos os
    // cômodos, mostra o Blocão por dentro, sai pela varanda e termina dando a volta na casa, do alto
    tour: [
      [0, 2.2, 9.5, 0, 1, 0, 3.5, "Casa térrea de Blocão · 6,5 × 7,5 m"],
      [-0.8, 1.45, 4.4, -1.5, 1, 0, 2.0, "Entrando pela parede aberta"],
      [-1.6, 1.55, 2.6, -2.9, 1, 1.4, 1.3, "Sala de TV"],
      [1.7, 1.65, 2.75, 2.8, 1, 0.6, 1.3, "Cozinha integrada"],
      [0.2, 1.6, 2.4, 0.9, 0.8, 1.0, 1.2, "Mesa de jantar"],
      [-2.0, 1.65, 3.05, -3.15, 1.35, 3.36, 0.9, "Dentro do Blocão: concreto + EPS + concreto"],
      [-1.7, 1.6, 0.5, -1.8, 1, -3, 1.3],
      [-1.8, 1.45, -1.3, -1.75, 0.8, -2.8, 1.0, "Quarto do casal"],
      [-0.6, 1.6, -1.6, -3.0, 1.6, -3.0, 1.0],
      [-1.8, 1.45, 0.6, 1.7, 1.2, -0.7, 1.3],
      [1.7, 1.45, -0.9, 2.5, 0.8, -2.8, 1.0, "Quarto de solteiro"],
      [1.25, 1.5, -1.4, 1.2, 0.9, -3.3, 0.9, "Banheiro"],
      [1.2, 1.5, 1.6, 0, 1.3, 9, 1.4],
      [0.2, 1.6, 4.6, 0, 1.2, 15, 1.3, "Varanda com vista"],
      [3.2, 2.2, 5.2, 4.95, 0.8, 1.4, 1.2, "Garagem coberta"],
      [-8, 8, 8, 0, 1.5, 0, 3, "Vista do alto"],
      [0, 11, 10, 0, 1.5, 0, 3],
      [8, 9, 4, 0, 1.5, 0, 3, "Feita com o Blocão do Império do EPS"],
    ],
    base: { x: 14, z: 13, cz: 0.8 },
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
    // térreo: cozinha/lavanderia no fundo, lavabo, sala/jantar e a escada encostada na parede da direita
    internasA: [
      ["x", -2.5, -4.35, 3.2, [{ a: -3.2, b: -2.4, f0: 0, f1: 4 }]],
      ["z", 1.6, -2.425, 1, []],
      ["x", -0.9, 1.675, 3.25, [{ a: 2.1, b: 2.8, f0: 0, f1: 4 }]],
      ["z", 3.25, -2.425, -0.975, []],
    ],
    // em cima: quarto de solteiro com banheiro, suíte do casal, corredor na frente (varanda) e o vão da escada
    internasB: [
      ["x", 1, -4.35, 3.2, [{ a: -3.2, b: -2.4, f0: 0, f1: 4 }, { a: 0, b: 0.8, f0: 0, f1: 4 }]],
      ["z", -1.5, -3.85, 0.925, []],
      ["z", 3.2, -3.85, 0.925, []],
      ["z", -2.8, -3.85, -2.275, [{ a: -3.1, b: -2.45, f0: 0, f1: 4 }]],
      ["x", -2.2, -4.35, -2.875, []],
    ],
    escada: { x0: 3.35, x1: 4.35, z0: -2.35, z1: 1.95, eixo: "z", sobe: 1, aberto: { x: 3.33 } },
    furo: { x0: 3.35, x1: 4.35, z0: -0.75, z1: 1.95 },
    guarda: [[3.35, -0.75, 4.35, -0.75], [3.3, 1.0, 3.3, 1.95]],
    mobilia: [
      ["cozinha", 0.6, -3.55, 0, 0, { w: 3.2, alto: false }], ["geladeira", 2.7, -3.49, 0], ["lavadora", -3.9, -3.55, 0],
      ["sofa", -3.4, -0.6, R90, 0, { w: 2.2 }], ["rackTv", 1.3, -0.6, -R90], ["mesaCentro", -1.9, -0.6, R90], ["tapete", -1.7, -0.6, R90, 0, { w: 2.6, d: 2.0 }],
      ["mesaJantar", -1.8, 1.85, 0, 0, { w: 1.6, lugares: 4 }], ["planta", 0.9, 2.5, 0], ["planta", 2.9, 2.5, 0, 0, { s: 0.8 }],
      ["vaso", 2.8, -2.1, 0], ["pia", 2.0, -2.18, 0, 0, { w: 0.6 }],
      ["cama", -2.64, -0.4, -R90, 1, { solteiro: true, tecido: "verde" }], ["escrivaninha", -3.65, 0.62, Math.PI, 1], ["armario", -2.15, -3.53, 0, 1, { w: 1.0 }],
      ["vaso", -4.05, -3.0, R90, 1], ["box", -3.25, -3.43, 0, 1, { w: 0.8 }], ["pia", -3.7, -2.52, Math.PI, 1, { w: 0.6 }],
      ["cama", 0.8, -2.75, 0, 1], ["criado", -0.3, -3.55, 0, 1], ["criado", 1.9, -3.55, 0, 1], ["armario", 2.83, -1.0, -R90, 1, { w: 1.8 }],
      ["poltrona", -0.8, 0.3, Math.PI * 0.75, 1], ["tapete", 0.8, -1.3, 0, 1, { w: 2.2, d: 1.4, cor: "azul" }],
      ["banco", -1.0, 1.28, 0, 1, { w: 1.4 }], ["planta", -4.0, 2.5, 0, 1], ["planta", 2.8, 2.5, 0, 1], ["planta", 3.8, -3.4, 0, 1, { s: 0.8 }],
    ],
    quadros: [[-1.0, 1.6, -2.4, 0, 1.0, 0.7, 1], [1.6, 1.6, 0.9, Math.PI, 0.9, 0.7, 0, 1], [-1.555, 1.6, -0.4, -R90, 0.6, 0.6, 2, 1], [-2.0, 1.6, 1.095, 0, 0.8, 0.6, 1, 1]],
    luzes: [[-2, -0.6], [-1.8, 1.8], [0.6, -3.2], [2.4, -1.7], [2.4, 1.5], [-2.8, -0.8, 1], [0.8, -1.5, 1], [-3.6, -3.1, 1], [0, 2, 1]],
    garagem: { x: 6.3, z: 2.4 },
    tour: [
      [0, 2.4, 10, 0, 1.2, 0, 3.5, "Sobrado de Blocão · 9 × 7 m, 2 andares"],
      [-0.6, 1.5, 4.3, -1.6, 1.0, 0, 2.2, "Entrando pela parede aberta"],
      [-2.9, 1.6, 0.4, -3.4, 0.7, -0.6, 1.4, "Sala de estar"],
      [-0.6, 1.55, -1.2, 1.3, 1.1, -0.6, 1.4, "Sala de TV"],
      [-1.4, 1.6, 1.0, -1.8, 0.8, 1.85, 1.2, "Mesa de jantar"],
      [-3.3, 1.5, 2.2, -4.36, 1.35, 2.95, 0.9, "Dentro do Blocão: concreto + EPS + concreto"],
      [-2.8, 1.55, -1.4, -2.8, 1.2, -4, 1.4, "Cozinha e lavanderia"],
      [-2.8, 1.55, -3.0, 2.5, 1.2, -3.2, 1.3],
      [2.2, 1.45, -2.95, 3.85, 2.6, -1.0, 1.4, "Escada"],
      [3.85, 1.6, -3.0, 3.85, 3.0, 0.5, 1.0],
      [3.85, 3.3, -0.1, 3.85, 4.6, 2.6, 0.9, "Subindo pro 2º andar"],
      [3.85, 4.75, 2.3, 0, 4.5, 2.2, 0.9],
      [0.4, 4.75, 1.9, 0.4, 4.4, -1, 1.1, "Corredor"],
      [0.4, 4.8, 0.4, 0.8, 3.8, -2.75, 1.0, "Suíte do casal"],
      [0.4, 4.75, 1.9, -2.8, 4.5, 1.9, 1.0],
      [-2.8, 4.75, 1.9, -2.8, 4.3, -1, 1.0],
      [-2.8, 4.8, 0.3, -2.64, 3.8, -0.6, 1.0, "Quarto com banheiro"],
      [-2.8, 4.75, 1.9, -1.2, 4.4, 5, 1.0],
      [-1.2, 4.8, 4.0, -1.2, 4.0, 14, 1.2, "Varanda com vista"],
      [-1.8, 5.6, 6.5, 6.3, 1.0, 2.4, 1.6, "Garagem coberta"],
      [-9, 10, 9, 0, 2, 0, 3.5, "Vista do alto"],
      [0, 13, 12, 0, 2, 0, 3.5],
      [9, 11, 6, 0, 2, 0, 3.5, "Feito com o Blocão do Império do EPS"],
    ],
    vaosB: {
      frente: [{ a: -3.6, b: 1.2, f0: 0, f1: 5 }, { a: 2.5, b: 3.7, f0: 2, f1: 5 }],
      direita: [{ a: -2.2, b: -0.4, f0: 2, f1: 5 }],
      fundos: [{ a: -1, b: 2, f0: 2, f1: 5 }],
      esquerda: [{ a: -2, b: -0.4, f0: 2, f1: 5 }],
    },
    ripado: { x: 2.2, n: 12 },
    base: { x: 17, z: 14, cz: 0.6 },
    centro: [0, 2.6, 0.6],
    raio: 10.4,
    jardim: {
      caminho: { x: 1.6, n: 4 },
      cerca: [[-3.6, 4.6], [4.9, 2.8]],
      arvores: [[-6, -2.6, 1], [6.6, -2.6, 0.85], [-6.2, 3.6, 0.7]],
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
    // térreo: escritório com lavabo e quarto de hóspedes à esquerda, sala integrada com escada, cozinha com ilha à direita
    internasA: [
      ["z", -4.5, -4.85, 1.5, []],
      ["x", 2.6, -7.35, -4.425, [{ a: -6.4, b: -5.6, f0: 0, f1: 4 }]],
      ["z", 4.6, -4.85, 1, []],
      ["z", -5.6, -4.85, -3.275, [{ a: -4.4, b: -3.7, f0: 0, f1: 4 }]],
      ["x", -3.2, -7.35, -5.525, []],
    ],
    // em cima: 2 suítes com banheiro nos cantos, sala íntima no meio (chega a escada), corredor na frente
    internasB: [
      ["z", -4, -4.85, 1.525, []],
      ["z", 4, -4.85, 1.525, []],
      ["x", 1.6, -7.35, 4.075, [{ a: -6, b: -5.2, f0: 0, f1: 4 }, { a: -1, b: -0.2, f0: 0, f1: 4 }]],
      ["x", -2.6, -7.35, -4.075, [{ a: -5.8, b: -5.0, f0: 0, f1: 4 }]],
      ["x", -3.0, 4.075, 7.35, [{ a: 5.0, b: 5.8, f0: 0, f1: 4 }]],
    ],
    escada: { x0: -2.0, x1: 2.3, z0: -4.85, z1: -3.85, eixo: "x", sobe: 1, aberto: { z: -3.83 } },
    furo: { x0: -0.4, x1: 2.3, z0: -4.85, z1: -3.85 },
    guarda: [[-0.4, -3.82, 2.3, -3.82], [-0.42, -4.85, -0.42, -3.82]],
    mobilia: [
      ["escrivaninha", -7.05, -1.0, R90], ["estante", -4.75, -2.0, -R90, 0, { w: 1.6 }], ["poltrona", -6.6, 0.8, R90 + 0.4],
      ["vaso", -7.05, -3.8, R90], ["box", -6.1, -4.43, 0, 0, { w: 0.8 }], ["pia", -6.3, -3.52, Math.PI, 0, { w: 0.6 }],
      ["cama", -6.29, 3.8, R90, 0, { solteiro: true }], ["planta", -4.9, 4.4, 0, 0, { s: 0.8 }],
      ["rackTv", -4.21, -0.8, R90, 0, { w: 2.2 }], ["sofa", -1.5, -0.8, -R90, 0, { w: 2.8 }], ["mesaCentro", -2.9, -0.8, R90], ["tapete", -2.7, -0.8, R90, 0, { w: 3.0, d: 2.4 }],
      ["poltrona", -2.9, 1.1, Math.PI], ["mesaJantar", 2.0, 1.6, 0, 0, { w: 2.2, lugares: 6 }], ["planta", 3.9, 4.3, 0], ["planta", -3.9, 4.3, 0],
      ["geladeira", 5.1, -4.48, 0], ["cozinha", 6.43, -4.55, 0, 0, { w: 1.7 }], ["ilha", 6.0, -1.6, 0, 0, { w: 2.0 }],
      ["cama", -5.15, -0.5, -R90, 1], ["criado", -4.4, -1.6, -R90, 1], ["criado", -4.4, 0.6, -R90, 1], ["armario", -6.6, -2.22, 0, 1, { w: 1.2 }],
      ["vaso", -7.05, -4.3, R90, 1], ["box", -4.48, -4.43, 0, 1, { w: 0.8 }], ["pia", -5.8, -4.6, 0, 1, { w: 0.9 }],
      ["cama", 5.15, -0.8, R90, 1, { tecido: "verde" }], ["criado", 4.4, -1.9, R90, 1], ["criado", 4.4, 0.3, R90, 1], ["poltrona", 6.6, 2.8, -Math.PI * 0.75, 1],
      ["vaso", 7.05, -4.3, -R90, 1], ["box", 4.48, -4.43, 0, 1, { w: 0.8 }], ["pia", 5.8, -4.6, 0, 1, { w: 0.9 }],
      ["rackTv", 1.0, 1.31, Math.PI, 1, { w: 2.0 }], ["sofa", 1.0, -1.6, 0, 1, { w: 2.4 }], ["tapete", 1.0, -0.2, 0, 1, { w: 2.6, d: 1.8, cor: "azul" }],
      ["estante", -3.7, -1.5, R90, 1, { w: 1.4 }], ["planta", -7.0, 3.4, 0, 1], ["planta", 4.5, 3.4, 0, 1],
    ],
    quadros: [[4.505, 1.7, -2.0, -R90, 1.4, 0.9, 0], [-5.0, 1.6, 2.695, 0, 0.5, 0.6, 2], [-4.095, 1.75, -0.5, -R90, 1.0, 0.6, 1, 1], [4.095, 1.75, -0.8, R90, 1.0, 0.6, 2, 1], [3.905, 1.6, -1.5, -R90, 0.9, 1.1, 0, 1]],
    luzes: [[-6, -1.5], [-6, 3.7], [-2.5, -0.8], [2, 1.6], [6, -1.5], [-6.5, -4.0], [-5.7, -0.5, 1], [5.7, -0.8, 1], [0, -1.5, 1], [-5.7, -3.8, 1], [5.7, -4.0, 1], [0, 2.7, 1]],
    garagem: { x: -10.0, z: 1.0 },
    tour: [
      [0, 3, 15, 0, 1.5, 0, 4, "Casarão de Blocão · 15 × 10 m, 2 andares e piscina"],
      [-1.0, 1.6, 6.3, -1.5, 1.2, 0, 2.2, "Entrando pela parede aberta"],
      [-3.0, 1.6, 2.4, -4.2, 1.1, -0.8, 1.4, "Sala de estar"],
      [0.4, 1.7, 3.7, 2.0, 0.85, 1.6, 1.4, "Sala de jantar"],
      [4.0, 1.5, 2.2, 6.0, 1.0, -1.6, 1.4, "Cozinha com ilha"],
      [6.4, 1.5, 4.0, 7.36, 1.35, 4.86, 0.9, "Dentro do Blocão: concreto + EPS + concreto"],
      [-3.4, 1.6, 1.9, -6, 1.1, -1, 1.4, "Escritório"],
      [2.0, 1.6, -1.8, -2.0, 1.4, -4.35, 1.4],
      [-2.6, 1.6, -4.35, 2.3, 3.0, -4.35, 1.0, "Escada"],
      [0.2, 3.3, -4.35, 2.8, 4.7, -4.35, 0.9, "Subindo pro 2º andar"],
      [2.9, 4.75, -4.3, 0.5, 4.4, -1.0, 0.9],
      [0.6, 4.75, -0.6, 1.0, 4.1, 1.31, 1.1, "Sala íntima"],
      [-0.6, 4.75, 0.9, -0.6, 4.6, 3.0, 1.0],
      [-0.6, 4.75, 2.6, 5, 4.5, 2.6, 1.0, "Corredor das suítes"],
      [5.2, 4.8, 2.4, 5.15, 3.9, -0.8, 1.0, "Suíte com vista"],
      [2.4, 4.8, 3.2, 2.4, 4.2, 12, 1.0],
      [2.4, 4.9, 5.6, 11.2, 0.5, 0.4, 1.1, "Varanda com vista pra piscina"],
      [-2.0, 5.6, 7.6, -10, 1.0, 1.0, 1.3, "Garagem coberta"],
      [-14, 12, 12, 0, 2, 0, 4, "Vista do alto"],
      [0, 17, 16, 0, 2, 0, 4],
      [14, 13, 6, 0, 2, 0, 4, "Feito com o Blocão do Império do EPS"],
    ],
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
      arvores: [[-10, -3.5, 1.3], [-12.5, 6.5, 1], [13.6, -6.5, 1.1], [-3, -7.2, 0.9]],
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
function levantar(defs, yBase, andar, internas = []) {
  const blocos = [];
  const vaos = [];
  const muros = [];
  let percorrido = 0;
  // externas primeiro (a volta da casa), depois as internas (ficam no meio: sem recuo pra dentro, sem janela)
  const todas = defs.map((d) => [...d, false]).concat(internas.map((d) => [...d, true]));
  const comps = todas.map(([, , i, f]) => Math.abs(f - i));
  const total = comps.reduce((s, c) => s + c, 0);
  todas.forEach(([eixo, fixo, ini, fim, abert, interna], w) => {
    const sentido = Math.sign(fim - ini);
    const comp = comps[w];
    const parede = andar * 20 + w;
    muros.push({ id: parede, eixo, fixo, ini, fim, andar, y0: yBase, fora: Math.sign(fixo || 1), interna });
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
            z: eixo === "x" ? (interna ? fixo : fixo - Math.sign(fixo || 1) * (BE / 2)) : meio,
            y: yBase + f * BA + BA / 2,
            comp: b - a,
            girado: eixo === "z",
            fiada: andar * FIADAS + f,
            ordem: (percorrido + Math.abs(meio - ini)) / total, // posição na volta da casa (0..1)
            parede,
            interna,
          });
        });
        s = e;
        primeiro = BL;
      }
    }
    if (!interna) abert.forEach((v) => vaos.push({ eixo, fixo, a: v.a, b: v.b, y0: yBase + v.f0 * BA, y1: yBase + v.f1 * BA, porta: !!v.porta, parede }));
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
let giroUser = 0;          // giro da maquete pelo dedo/mouse (rad, em volta da casa)
let elevUser = 0;          // inclinação pelo mouse (rad)
let pRemocao = -1;         // ponto da rolagem quando a parede saiu (rolar de verdade recoloca)
let mobilia = null;        // móveis, eletros, quadros e portas (só aparecem com a casa aberta)
let paisagem = null;       // o que se vê pela janela: gramado, morros, árvores, vizinhos, rua
let solidos = [];          // escada e guarda-corpos: o drone não atravessa
let zoomUser = 1;          // pinça por fora: aproxima/afasta a maquete (só o 3D — a página não tem zoom)
let passeio = null;        // por dentro: a câmera parada num ponto { pos, alvo, andar } — voa por toque
let voo = null;            // voo de câmera em andamento (toque, troca de andar, tour): caminho suave por pontos
let tour = null;           // tour automático pela casa { legendas, legenda, ini }
let ouvinteTour = null;
let foco = null;           // ponto estratégico em foco: { id, pos, alvo, fov } (câmera perto da casa)
let margemTopo = null;      // celular: px livres em cima (cabeçalho) e embaixo (textos) — a maquete fica no meio
let margemBase = null;
let saidaFoco = null;          // saindo do zoom de um ponto: mistura a pose do zoom com a da maquete (que o dedo já gira)
const DUR_SAIDA = 550;
let semTinta = { de: 0, para: 0, t0: 0 }; // "Blocão aparente": tira a pintura das paredes (1 = sem tinta)
const DUR_TINTA = 600;
let destaque = null;       // corte do ponto em foco: { furo, borda } — blocos que saem da parede e os da volta, sem tinta (miolo à mostra)
const DUR_DESTAQUE = 500;
const _eixo = new Vector3();
const _c = new Vector3();
let pontos = [];           // pontos estratégicos da casa atual (vantagens do Blocão)
let ouvintePonto = null;
let extrasProntos = false; // móveis e paisagem: montados num momento ocioso (não pesa na abertura do site)
const OLHO = 1.5;          // altura da câmera por dentro (m acima do piso)
let giroVel = 0;           // inércia do giro por fora (rad/s)
// drone por fora: o dedo move o "alvo" e a câmera persegue suave, inclinando na curva e planando ao soltar
let giroAlvo = 0;
let elevAlvo = 0;
let rollFora = 0;          // inclinação lateral da câmera (rad), como drone fazendo a curva
let orbitaViva = false;    // loop do drone rodando
let arrastando = false;    // dedo na tela
const _ctrl = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const PRONTA = 0.88;       // a partir daqui dá pra tirar parede (a casa já está toda de pé)
const limitarEntre = (x, a, b) => (x < a ? a : x > b ? b : x);
const DUR_CAMERA = 1800;   // o mergulho do drone pela parede aberta
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
  uvNaCaixa(geo, mat); // caixa com foto: UV em metros (tamanho real)
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = nivel.sombra;
  m.userData = { base: m.position.clone(), entra, tipo, alt: geo.parameters ? geo.parameters.height || 0 : 0 };
  obra.add(m);
  pecas.push(m);
  return m;
}

/** laje/piso retangular com um vão (o da escada): até 4 caixas em volta do furo */
function lajeFurada(R, f, y, h, mat, entra, tipo) {
  const partes = !f ? [[R.x0, R.x1, R.z0, R.z1]] : [
    [R.x0, R.x1, R.z0, f.z0], [R.x0, R.x1, f.z1, R.z1], [R.x0, f.x0, f.z0, f.z1], [f.x1, R.x1, f.z0, f.z1],
  ];
  partes.forEach(([a, b, c, d]) => {
    if (b - a < 0.01 || d - c < 0.01) return;
    const m = peca(new BoxGeometry(b - a, h, d - c), mat, (a + b) / 2, y, (c + d) / 2, entra, tipo);
    if (mat === mats.piso || mat === mats.porcelanato) { m.castShadow = false; m.userData.piso = true; } // o toque por dentro "pousa" no piso
  });
}

/** um Group montado (escada, garagem…) entra na linha do tempo como uma peça */
function grupoPeca(g, entra, tipo) {
  g.userData = { base: g.position.clone(), entra, tipo, alt: 0, fixo: true };
  g.traverse((o) => { if (o.isMesh) { o.castShadow = nivel.sombra; o.receiveShadow = nivel.sombra; } });
  obra.add(g);
  pecas.push(g);
  return g;
}

function criarMateriais() {
  const tCon = texConcreto(nivel.tex);
  const tGuia = texConcreto(Math.min(1024, nivel.tex * 2));
  const tSan = texSanduiche(128);
  const tMad = texMadeira(Math.max(128, nivel.tex / 2));
  const real = true; // fotos realistas em todo aparelho com 3D (o fraco recebe só a cor, sem relevo)
  ligarTexturas(real, nivel === NIVEIS.baixa);
  mats = {
    concreto: new MeshStandardMaterial({ map: tCon, roughness: 0.92, color: "#cfcac1" }),
    topo: new MeshStandardMaterial({ map: tSan, roughness: 0.9, color: "#e2ded6" }),
    ponta: new MeshStandardMaterial({ map: texPonta(Math.min(512, nivel.tex)), roughness: 0.9 }),
    guia: new MeshStandardMaterial({ map: tGuia, roughness: 0.9, color: "#d6d1c8" }),
    pintura: new MeshStandardMaterial({ color: "#f2efe8", roughness: 0.85, transparent: true, opacity: 0 }),
    branco: new MeshStandardMaterial({ color: "#f4f2ed", roughness: 0.8 }),
    grafite: new MeshStandardMaterial({ color: "#2a2c2f", roughness: 0.55, metalness: 0.3 }),
    madeira: new MeshStandardMaterial({ map: tMad, roughness: 0.7 }),
    // piso de madeira dos cômodos (tábuas mais miúdas que o ripado) — dá leitura de escala no passeio por dentro
    // (com UV em metros — texturas realistas — a repetição do canvas cai pra 1, até a foto chegar)
    piso: new MeshStandardMaterial({ map: (() => { const t = tMad.clone(); const r = real ? 1 : 3; t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(r, r); t.rotation = Math.PI / 2; t.needsUpdate = true; return t; })(), roughness: 0.6, color: "#d9c3a5" }),
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
  // térreo de porcelanato, laje de concreto, telhado de telha e deck: até a foto chegar, iguais ao que eram
  mats.porcelanato = mats.piso.clone();
  mats.laje = mats.branco.clone();
  mats.telha = mats.branco.clone();
  mats.deck = mats.madeira.clone();
  // fotos (texturas.js): o Blocão por fora tem UV 2,2 por metro — a repetição devolve o tamanho real da foto
  comFoto(mats.concreto, "concreto", { rep: 1 / (BLOCO_UV * LADO.concreto), porPosicao: BLOCO_UV, cor: "#ebe6de", relevo: 1.2 });
  comFoto(mats.pintura, "reboco", { uv: false, porPosicao: 1 / LADO.reboco, cor: "#fdfbf6", relevo: 1.0 });
  comFoto(mats.laje, "concreto", { cor: "#f4f2ec", relevo: 0.9 });
  comFoto(mats.branco, "reboco", { cor: "#fbfaf6", relevo: 0.8 });
  comFoto(mats.piso, "madeira", { rugosidade: 0.9 });
  comFoto(mats.porcelanato, "porcelanato", { rugosidade: 0.55, relevo: 0.5 });
  comFoto(mats.telha, "telha", { cor: "#f0e2d6", relevo: 1.4 });
  comFoto(mats.grama, "grama", { cor: "#c3cca9", relevo: 1.5 }); // puxa pro verde-sálvia da maquete
  comFoto(mats.pedra, "calcada", { cor: "#f2efe9", relevo: 1.2 });
  comFoto(mats.madeira, "teca", { cor: "#c99a72", rugosidade: 0.8 }); // portas e ripado
  comFoto(mats.deck, "deck", { cor: "#efe2d4", rugosidade: 0.85 });
  comFoto(mats.pedraEscura, "pedra-fachada", { cor: "#d9d4cc" });
  comFoto(mats.tronco, "casca");
  comFoto(mats.folha, "folhagem", { cor: "#7f9a6f" });
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
  const t = levantar(paredes(A, P.vaosA), CHAO, 0, P.internasA);
  const Y2 = CHAO + PE + LAJE;
  const c = B ? levantar(paredes(B, P.vaosB), Y2, 1, P.internasB) : { blocos: [], vaos: [], muros: [] };
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
  const geoPintura = new BoxGeometry(BL, BA, BE + 0.012);
  if (texturasLigadas()) uvMetros(geoPintura, LADO.reboco);
  pinturaMesh = new InstancedMesh(geoPintura, M.pintura, lista.length);
  lista.forEach((bl, i) => {
    _o.position.set(bl.x, bl.y, bl.z);
    _o.rotation.set(0, bl.girado ? Math.PI / 2 : 0, 0);
    _o.scale.set(bl.comp + 0.004, 1.01, 1);
    _o.updateMatrix();
    pinturaMesh.setMatrixAt(i, _o.matrix);
    pinturaOrig[i] = _o.matrix.clone();
  });
  // parede interna com tinta de outro tom (areia): por dentro dá pra ler os cômodos; por fora tudo branco
  const corFora = new Color("#ffffff");
  const corDentro = new Color("#efe2cc");
  lista.forEach((bl, i) => pinturaMesh.setColorAt(i, bl.interna ? corDentro : corFora));
  pinturaMesh.visible = false;
  pinturaMesh.frustumCulled = false;
  obra.add(pinturaMesh);

  // piso por dentro: porcelanato no térreo (junto com as paredes) e madeira em cima (por cima da laje)
  for (const [R, y, ent, furo, mat] of [[A, CHAO + 0.012, [0.12, 0.16], null, M.porcelanato], ...(B ? [[B, Y2 + 0.012, [0.47, 0.5], P.furo, M.piso]] : [])]) {
    lajeFurada({ x0: R.x0 + BE, x1: R.x1 - BE, z0: R.z0 + BE, z1: R.z1 - BE }, furo, y, 0.02, mat, ent, "sobe");
  }

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
  peca(new BoxGeometry(L - 0.1, 0.06, P.varanda - 0.05), M.deck, xm, CHAO + 0.03, A.z1 + P.varanda / 2, [T.vidros, T.vidros + 0.04], "sobe");

  let yTopo;
  let R; // retângulo coberto pela cobertura
  if (B) {
    // laje do 1º andar avançando sobre a varanda (vira o piso da varanda de cima)
    lajeFurada({ x0: xm - (L + 0.3) / 2, x1: xm + (L + 0.3) / 2, z0: zMeioV - (zFrente - A.z0 + 0.3) / 2, z1: zMeioV + (zFrente - A.z0 + 0.3) / 2 }, P.furo, CHAO + PE + LAJE / 2, LAJE, M.laje, T.laje, "desce");
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
  // cobertura com platibanda (telhado embutido, de telha cerâmica por cima)
  const lx = R.x1 - R.x0 + 0.5;
  const lz = R.z1 - R.z0 + 0.4;
  const rx = (R.x0 + R.x1) / 2;
  const rz = (R.z0 + R.z1) / 2;
  peca(new BoxGeometry(lx, 0.2, lz), [M.branco, M.branco, M.telha, M.branco, M.branco, M.branco], rx, yTopo + 0.1, rz, T.cobertura);
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
      peca(new BoxGeometry(0.06, PE - 0.2, 0.08), M.madeira, P.ripado.x + i * 0.19, Y2 + PE / 2, B.z1 + 0.12, [0.81 + i * 0.003, 0.85 + i * 0.003], "cresce").userData.parede = 20;
    }
  }
  if (P.pedra) peca(new BoxGeometry(P.pedra.larg, PE, 0.06), M.pedraEscura, P.pedra.x, CHAO + PE / 2, A.z1 + 0.04, [T.vidros + 0.02, T.vidros + 0.06], "cresce").userData.parede = 0;

  // piscina com deck (casarão)
  if (P.piscina) {
    const q = P.piscina;
    peca(new BoxGeometry(q.lx + 2.2, 0.1, q.lz + 1.6), M.deck, q.x, -0.0, q.z, [0.86, 0.9], "sobe");
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
  // garagem coberta com o carro (na maquete também)
  if (P.garagem) {
    const g = grupoPeca(garagem(P.garagem, M.branco, M.grafite, M.pedra), [0.88, 0.93], "sobe");
    peca(new BoxGeometry(2.6, 0.03, Math.max(0.1, P.base.cz + P.base.z / 2 - (P.garagem.z + 2.85))), M.pedra, P.garagem.x, 0.03,
      (P.garagem.z + 2.85 + P.base.cz + P.base.z / 2) / 2, [0.88, 0.93], "sobe"); // entrada de carro até a calçada
    g.castShadow = false;
  }
  // escada (sobrado e casarão) e guarda-corpo em volta do vão no andar de cima
  solidos = [];
  if (P.escada && B) {
    const pisoA = CHAO + 0.022;
    solidos.push(grupoPeca(escada(P.escada, pisoA, Y2 + 0.022 - pisoA, M.branco, M.piso), T.laje, "sobe"));
    if (P.guarda) solidos.push(grupoPeca(guardaCorpo(P.guarda, Y2 + 0.022), [T.paredes[1][0], T.paredes[1][0] + 0.04], "sobe"));
  }
  // móveis, eletros, quadros, luminárias e portas + a paisagem: montados depois, num momento ocioso
  mobilia = null;
  placas = null;
  paisagem = null;
  extrasProntos = false;
  passeio = null;
  voo = null;
  tour = null;
  foco = null;
  montarPontos();
  prepararExtrasOcioso();
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
  // celular: espaço livre entre o cabeçalho e o bloco de texto (medido pela página); sem medida, um padrão
  const reserva = largaTela ? 0 : (margemBase ?? Math.min(300, h * 0.38));
  const topo = largaTela ? 0 : (margemTopo ?? 118);
  const altUtil = h - reserva - topo;
  const vUtil = 2 * Math.atan(Math.tan(vfov / 2) * (altUtil / h));
  const util = Math.min(vUtil, hfov * (largaTela ? 0.7 : 1));
  // casa pronta: afasta um pouco pra sobrar margem pras etiquetas dos pontos (elas não ficam na frente do 3D)
  const respiro = 1 + suave(faixa(p, 0.93, 1)) * (largaTela ? 0.16 : 0.34);
  const dist = (projeto.raio / Math.sin(util / 2)) * MathUtils.lerp(1.0, 0.97, suave(p)) * (interior ? 1 : zoomUser) * respiro;
  // giro do dedo/mouse: só depois do voo do Blocão (senão ele não bate com o lugar dele na obra)
  const livre = suave(faixa(p, 0.12, 0.2));
  const ang = MathUtils.lerp(-0.6, 0.45, suave(p)) + giroUser * livre;
  const elev = limitarEntre(MathUtils.lerp(0.5, 0.36, suave(p)) + elevUser * livre, 0.08, 1.1); // começa mais de cima e desce
  camAng = ang;
  camElev = elev;
  camera.position.set(centro.x + Math.sin(ang) * Math.cos(elev) * dist, centro.y + Math.sin(elev) * dist, centro.z + Math.cos(ang) * Math.cos(elev) * dist);
  camera.far = dist * 3;
  const offX = largaTela ? -w * 0.16 : 0;
  const offY = largaTela ? 0 : (reserva - topo) / 2; // celular: a maquete fica no meio da faixa livre
  let alvo = centro;
  let off = 1;
  let fov = 26;
  let rolagemCam = 0;
  if (interior) {
    // câmera entrando pela parede aberta (ou voltando pra vista da rolagem)
    const k = suave((agora() - interior.t0) / DUR_CAMERA);
    const de = interior.de;
    const para = interior.volta ? { pos: camera.position.clone(), alvo: centro, fov: 26, off: 1 } : interior.para;
    // voo de drone: arco (sobe, faz a curva e mergulha pela abertura), não uma reta
    const dist = de.pos.distanceTo(para.pos);
    _ctrl.lerpVectors(de.pos, para.pos, 0.5);
    _ctrl.y = Math.max(de.pos.y, para.pos.y) + Math.min(3, 0.6 + dist * 0.18);
    const a = (1 - k) * (1 - k);
    const b = 2 * (1 - k) * k;
    const c = k * k;
    camera.position.set(de.pos.x * a + _ctrl.x * b + para.pos.x * c, de.pos.y * a + _ctrl.y * b + para.pos.y * c, de.pos.z * a + _ctrl.z * b + para.pos.z * c);
    alvo = _alvoCam.lerpVectors(de.alvo, para.alvo, suave(k * 1.15));
    fov = de.fov + (para.fov - de.fov) * k;
    off = de.off + (para.off - de.off) * k;
    rolagemCam = Math.sin(k * Math.PI) * 0.14 * (interior.volta ? -1 : 1); // inclina na curva, como drone
    // chegou: a câmera fica parada mostrando o lugar (o próximo toque voa de novo)
    if (!interior.volta && k >= 1) {
      if (!passeio) passeio = { pos: interior.para.pos.clone(), alvo: interior.para.alvo.clone(), andar: interior.muro.andar, fov: interior.para.fov };
      camera.position.copy(passeio.pos);
      alvo = _alvoCam.copy(passeio.alvo);
      fov = passeio.fov;
      rolagemCam = 0;
    }
  }
  // ponto em foco: a câmera fica perto da casa, olhando o ponto
  if (foco && !voo) {
    camera.position.copy(foco.pos);
    alvo = _alvoCam.copy(foco.alvo);
    fov = foco.fov;
  }
  // voo de câmera (toque por dentro, troca de andar, tour): manda em tudo enquanto dura
  if (voo) {
    const r = posVoo(voo, camera.position, _alvoCam);
    alvo = _alvoCam;
    fov = r.fov;
    off = r.off;
    rolagemCam = voo.roll;
    if (voo.tourPontos) olharTour(camera.position, alvo);
  }
  if (saidaFoco && !foco && !voo) {
    const k = suave(Math.min(1, (agora() - saidaFoco.t0) / DUR_SAIDA));
    camera.position.lerpVectors(saidaFoco.pos, camera.position, k);
    alvo = _alvoCam.lerpVectors(saidaFoco.alvo, alvo, k);
    fov = saidaFoco.fov + (fov - saidaFoco.fov) * k;
    off = saidaFoco.off + (off - saidaFoco.off) * k;
    if (k >= 1) saidaFoco = null;
  }
  camera.fov = fov;
  camera.near = modoDentro() ? 0.1 : 1;
  if (paisagem && paisagem.visible) camera.far = Math.max(camera.far, 800); // céu e morros lá longe
  camera.lookAt(alvo);
  if (!interior && !voo && !foco) rolagemCam += rollFora * suave(faixa(p, 0.12, 0.2));
  if (rolagemCam) camera.rotateZ(rolagemCam); // inclina na curva, como drone
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
  if (destaque && t - destaque.t0 < DUR_DESTAQUE) return true;
  if (t - semTinta.t0 < DUR_TINTA) return true;
  return !!interior && t - interior.t0 < DUR_CAMERA;
}

/** casa aberta (drone dentro) ou tour: móveis, paisagem, vidro claro */
const modoDentro = () => !!interior || !!tour;

const pisoDe = (andar) => (andar ? CHAO + PE + LAJE : CHAO);
const _passo = new Vector3();
const anguloEntre = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // -π..π

/** a 1ª coisa sólida na frente (parede, porta, janela, móvel, escada), até "longe" metros */
function obstaculo(origem, dir, longe) {
  _raycast.set(origem, dir);
  _raycast.far = longe;
  const alvos = [blocosMesh].concat(pecas.filter((m) => m.visible && m.userData.parede !== undefined));
  let d = Infinity;
  const hit = _raycast.intersectObjects(alvos, false)[0];
  if (hit) d = hit.distance;
  const outros = solidos.filter((g) => g.visible);
  if (mobilia && mobilia.visible) outros.push(mobilia);
  const h2 = outros.length ? _raycast.intersectObjects(outros, true)[0] : null;
  if (h2 && h2.distance < d) d = h2.distance;
  _raycast.far = Infinity;
  return d;
}

/* ---------- VOO DE CÂMERA: curva suave (Catmull-Rom) por pontos, acelera e freia, inclina na curva ---------- */
function catmull(out, p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  out.x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  out.y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  out.z = 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
  return out;
}

/**
 * pts / alvos: Vector3 (onde a câmera passa / pra onde olha); vels: m/s de cada trecho (chegando no ponto i).
 * extra: { fov: [de, para], off: [de, para], tour, aoFim }
 */
function criarVoo(pts, alvos, vels, extra = {}) {
  const ts = [0];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.max(pts[i].distanceTo(pts[i - 1]), alvos[i].distanceTo(alvos[i - 1]) * 0.3, 0.35);
    ts.push(ts[i - 1] + d / (vels[i] || 1.5));
  }
  let T = ts[ts.length - 1];
  if (extra.duracao) { // voo com tempo fixo (clique num ponto: rápido, não importa a distância)
    const f = (extra.duracao * 0.75) / T;
    for (let i = 0; i < ts.length; i++) ts[i] *= f;
    T = ts[ts.length - 1];
  }
  const R = extra.rampa !== undefined ? extra.rampa : extra.duracao ? T / 3 : Math.min(1.1, T / 3); // decola e pousa devagar
  return { pts, alvos, ts, T, R, D: T + R, t0: agora(), roll: 0, yawAntes: null, tAntes: 0, seg: -1, ...extra };
}

/**
 * Ponto vizinho da curva, no máximo a 1,5× o trecho atual: um vizinho muito longe (a maquete lá do alto, antes de
 * entrar na casa) "embalava" a curva e o drone passava do ponto — mergulhava abaixo do piso e a tela ficava preta.
 */
const _viz0 = new Vector3();
const _viz1 = new Vector3();
function vizinho(out, viz, base, outro) {
  const lim = Math.max(0.5, base.distanceTo(outro) * 1.5);
  const d = viz.distanceTo(base);
  return d > lim ? out.copy(base).lerp(viz, lim / d) : viz;
}

function posVoo(v, pos, olhar) {
  const e = Math.min(v.D, (agora() - v.t0) / 1000);
  const { T, R, D } = v;
  const sTempo = e < R ? (e * e) / (2 * R) : e < D - R ? e - R / 2 : T - ((D - e) * (D - e)) / (2 * R);
  let i = 0;
  while (i < v.ts.length - 2 && sTempo > v.ts[i + 1]) i++;
  const t = limitarEntre((sTempo - v.ts[i]) / Math.max(1e-6, v.ts[i + 1] - v.ts[i]), 0, 1);
  const P = v.pts;
  const A = v.alvos;
  const n = P.length - 1;
  catmull(pos, vizinho(_viz0, P[Math.max(0, i - 1)], P[i], P[i + 1]), P[i], P[i + 1], vizinho(_viz1, P[Math.min(n, i + 2)], P[i + 1], P[i]), t);
  catmull(olhar, vizinho(_viz0, A[Math.max(0, i - 1)], A[i], A[i + 1]), A[i], A[i + 1], vizinho(_viz1, A[Math.min(n, i + 2)], A[i + 1], A[i]), t);
  // aparelho lento pode pular trechos curtos num quadro só: cada trecho pulado ainda dispara a sua ação, em ordem
  if (v.seg !== i) {
    const de = v.seg;
    v.seg = i;
    if (v.aoTrecho) for (let k = Math.min(de + 1, i); k <= i; k++) v.aoTrecho(k);
  }
  // inclina na curva (como drone): rola pro lado em que está virando
  const yaw = Math.atan2(olhar.x - pos.x, olhar.z - pos.z);
  if (v.yawAntes !== null && e > v.tAntes) {
    const taxa = anguloEntre(yaw - v.yawAntes) / Math.max(0.008, e - v.tAntes);
    v.roll += (limitarEntre(-taxa * 0.09, -0.16, 0.16) - v.roll) * 0.12;
  }
  v.yawAntes = yaw;
  v.tAntes = e;
  v.roll *= e > D - 0.4 ? 0.85 : 1;
  // fov / deslocamento da tela: no tour abre no 1º trecho e fecha no último; nos outros voos, de → para
  let k = 1;
  if (v.tour) k = i === 0 ? suave(t) : i === n - 1 ? suave(1 - t) : 1;
  else k = suave(sTempo / Math.max(1e-6, T));
  const fov = v.fov ? (v.tour ? v.fov[0] + (v.fov[1] - v.fov[0]) * k : v.fov[0] + (v.fov[1] - v.fov[0]) * k) : camera.fov;
  const off = v.off ? (v.tour ? v.off[0] + (v.off[1] - v.off[0]) * k : v.off[0] + (v.off[1] - v.off[0]) * k) : 0;
  return { fov, off, fim: e >= D };
}

function quadroVoo() {
  if (!voo) return;
  pDesenhado = -1;
  const fim = (agora() - voo.t0) / 1000 >= voo.D;
  desenhar(fim);
  if (!fim) { requestAnimationFrame(quadroVoo); return; }
  const f = voo.aoFim;
  voo = null;
  if (f) f();
  pDesenhado = -1;
  desenhar(true);
}

function iniciarVoo(v) {
  const andando = !!voo;
  voo = v;
  if (!andando && !window.__gravandoVideo) requestAnimationFrame(quadroVoo); // no vídeo quem anda o tempo é o gravador
}

/** voa (rasante) até o ponto tocado: para 1,2 m antes, na altura dos olhos, virando pra ele; não atravessa nada */
function voarAte(ponto) {
  const de = passeio.pos.clone();
  const deA = passeio.alvo.clone();
  const piso = pisoDe(passeio.andar);
  _passo.set(ponto.x - de.x, 0, ponto.z - de.z);
  let L = _passo.length();
  if (L > 0.01) _passo.divideScalar(L);
  const livre = L > 0.01 ? obstaculo(_a.set(de.x, de.y, de.z), _passo, L + 1) : Infinity;
  L = Math.max(0, Math.min(L - 1.2, livre - 0.6));
  const R = passeio.andar && projeto.B ? projeto.B : projeto.A;
  const para = new Vector3(limitarEntre(de.x + _passo.x * L, R.x0 - 2.5, R.x1 + 2.5), piso + OLHO, limitarEntre(de.z + _passo.z * L, R.z0 - 2.5, R.z1 + 2.5));
  const olhar = new Vector3(ponto.x, Math.max(piso + 0.7, Math.min(ponto.y + 0.25, piso + 2.2)), ponto.z);
  if (olhar.distanceTo(para) < 0.6) olhar.addScaledVector(_passo, 1.5);
  // rasante: no meio do caminho a câmera desce um pouco e já vai virando
  const meio = de.clone().lerp(para, 0.5);
  meio.y = Math.min(de.y, para.y) - (L > 1.5 ? 0.22 : 0);
  const meioA = deA.clone().lerp(olhar, 0.65);
  meioA.y = (deA.y + olhar.y) / 2;
  const pts = L > 0.15 ? [de, meio, para] : [de, de.clone(), para];
  iniciarVoo(criarVoo(pts, [deA, meioA, olhar], [0, 1.9, 1.9], {
    fov: [passeio.fov, passeio.fov], off: [0, 0],
    aoFim: () => { passeio.pos.copy(para); passeio.alvo.copy(olhar); avisar(); },
  }));
  avisar();
}

/** troca de andar: o drone sobe/desce pelo vão (ou direto, numa casa sem escada) no mesmo ponto da planta */
function voarAndar() {
  if (!passeio || !projeto.B) return;
  const de = passeio.pos.clone();
  const deA = passeio.alvo.clone();
  passeio.andar = passeio.andar ? 0 : 1;
  const R = passeio.andar ? projeto.B : projeto.A;
  const para = new Vector3(limitarEntre(de.x, R.x0 + 0.8, R.x1 - 0.8), pisoDe(passeio.andar) + OLHO, limitarEntre(de.z, R.z0 + 0.8, R.z1 - 0.8));
  const sobe = para.y > de.y ? 1 : -1;
  const meio = de.clone().lerp(para, 0.5);
  const olhar = deA.clone();
  olhar.y += para.y - de.y;
  const meioA = deA.clone().lerp(olhar, 0.5);
  meioA.y += sobe * 1.2; // olha pra onde vai
  iniciarVoo(criarVoo([de, meio, para], [deA, meioA, olhar], [0, 2.2, 2.2], {
    fov: [passeio.fov, passeio.fov], off: [0, 0],
    aoFim: () => { passeio.pos.copy(para); passeio.alvo.copy(olhar); avisar(); },
  }));
  avisar();
}

/** por dentro, tocar numa parede: ela desliza pro outro lado e mostra o Blocão por dentro (concreto + EPS + concreto) */
function tirarParedeDentro(id) {
  const m = muroDe(id);
  if (!m || estadoParede(id) > 0.5) return false;
  m.fora = (m.eixo === "x" ? Math.sign(m.fixo - camera.position.z) : Math.sign(m.fixo - camera.position.x)) || 1; // sai longe de quem olha
  fora.set(id, { de: estadoParede(id), para: 1, t0: agora() });
  atualizarRevelados();
  requestAnimationFrame(animar);
  if (ouvinteInterior) ouvinteInterior({ dentro: true, removidas: fora.size, corte: true });
  return true;
}

function avisar() { if (ouvinteInterior) ouvinteInterior({ dentro: !!interior, removidas: fora.size, voando: !!voo }); }

/* ---------- TOUR: sobrevoo automático pela casa (o cliente só assiste) ---------- */
/**
 * Tour do SITE (sem botão, começa quando a maquete fica pronta): o mesmo voo do vídeo — entra na casa, passa pelos
 * cômodos e sai — no ritmo de um drone de verdade (VEL_DENTRO dentro da casa), com as vantagens do Blocão em quadros nas paredes do
 * caminho (placas). Sem legenda nem cartão; o dedo só gira a vista (olharTour) e o drone não para.
 */
const TOUR_LER = 2.0;      // s deslizando devagar em frente a cada quadro, com a parede fechada (tempo de ler)
const TOUR_RECUAR = 1.4;   // s depois de ler: o drone recua e vira pro lado do quadro (parede ainda fechada)
const TOUR_VER = 2.2;      // s já lá atrás, quase parado: a parede abre e mostra o miolo do Blocão
const VEL_DENTRO = 2.6;    // m/s entre um quadro e outro, dentro da casa (drone de verdade, voo tranquilo)
const VEL_FORA = 4.5;      // m/s chegando e saindo da casa (do lado de fora pode correr)
let placas = null;
let tourAcoes = null;       // tour do site: o que cada trecho faz na parede (abrir o corte / tirar a tinta)

/**
 * Arte dos quadros: se `quadrosVantagens` (config.js) aponta pra uma imagem 3 × 2 (as 6 vantagens na ORDEM, linha
 * por linha — ex.: gerada no Gemini), ela é recortada em 6; sem imagem, cada quadro é desenhado aqui (canvas).
 */
let artesQuadros = null;   // { tex: [6 texturas], aspecto } quando a imagem carregou
let arteCarregando = false;
function carregarArteQuadros() {
  const url = (window.IMPERIO_CONFIG || {}).quadrosVantagens;
  if (!url || arteCarregando) return;
  arteCarregando = true;
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    const pw = img.naturalWidth / 3;
    const ph = img.naturalHeight / 2;
    const corte = 0.015; // tira a borda/espaço entre os painéis
    const tex = [];
    for (let k = 0; k < 6; k++) {
      const cv = document.createElement("canvas");
      cv.width = 768;
      cv.height = Math.round((768 * ph) / pw);
      const sx = (k % 3) * pw + pw * corte;
      const sy = Math.floor(k / 3) * ph + ph * corte;
      cv.getContext("2d").drawImage(img, sx, sy, pw * (1 - 2 * corte), ph * (1 - 2 * corte), 0, 0, cv.width, cv.height);
      const t = new CanvasTexture(cv);
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
      tex.push(t);
    }
    artesQuadros = { tex, aspecto: pw / ph };
  };
  img.src = url;
}

/** quadro desenhado (sem a imagem): passe-partout claro, número, título azul, fio fino, texto e assinatura */
function texturaPlaca(k, titulo, texto) {
  const cv = document.createElement("canvas");
  cv.width = 768;
  cv.height = 512;
  const c = cv.getContext("2d");
  c.fillStyle = "#f4f1ea";
  c.fillRect(0, 0, 768, 512);
  c.fillStyle = "#fbfaf7";
  c.fillRect(34, 34, 700, 444);
  c.strokeStyle = "rgba(20, 22, 26, 0.18)";
  c.lineWidth = 2;
  c.strokeRect(34, 34, 700, 444);
  c.fillStyle = "#8a877f";
  c.font = "700 24px Archivo, Arial, sans-serif";
  c.fillText(`0${k + 1} / 06`, 74, 98);
  c.fillStyle = "#1f4bd8";
  c.font = "800 60px Archivo, Arial, sans-serif";
  c.fillText(titulo, 72, 176);
  c.fillStyle = "#14161a";
  c.fillRect(74, 204, 64, 4);
  c.fillStyle = "#2a2c30";
  c.font = "500 33px Archivo, Arial, sans-serif";
  let linha = "";
  let y = 262;
  for (const p0 of texto.split(" ")) {
    const t = linha ? `${linha} ${p0}` : p0;
    if (c.measureText(t).width > 610) { c.fillText(linha, 74, y); linha = p0; y += 46; } else linha = t;
  }
  c.fillText(linha, 74, y);
  c.fillStyle = "#8a877f";
  c.font = "700 21px Archivo, Arial, sans-serif";
  c.fillText("BLOCÃO · IMPÉRIO DO EPS", 74, 444);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** quadro de verdade: moldura grafite com profundidade + a arte (sem luz: sempre nítida) */
function criarQuadro(k, larg, alt) {
  const g = new Group();
  const moldura = new Mesh(new BoxGeometry(larg + 0.05, alt + 0.05, 0.035), new MeshStandardMaterial({ color: "#1d1f23", roughness: 0.55 }));
  moldura.position.z = 0.0175;
  const [titulo, texto] = VANTAGENS[ORDEM[k]];
  const mapa = artesQuadros ? artesQuadros.tex[k] : texturaPlaca(k, titulo, texto);
  const arte = new Mesh(new PlaneGeometry(larg, alt), new MeshBasicMaterial({ map: mapa, toneMapped: false }));
  arte.position.z = 0.0362;
  g.add(moldura, arte);
  return g;
}

/** os blocos da parede em volta do quadro: perdem a tinta enquanto o drone lê (o Blocão cru aparece em volta da moldura) */
function blocosEmVolta(centro, n) {
  const volta = new Set();
  lista.forEach((bl, i) => {
    if (bl.parede === 0) return;
    const fora = Math.abs((bl.x - centro.x) * n.x + (bl.z - centro.z) * n.z);
    const along = Math.abs((bl.x - centro.x) * -n.z + (bl.z - centro.z) * n.x);
    if (fora < 0.3 && along < 1.5 && Math.abs(bl.y - centro.y) < 1.0) volta.add(i);
  });
  return volta;
}

/** um bloco da mesma parede logo ao lado do quadro (na altura dele): é ali que a parede abre durante o tour */
function blocoAoLado(centro, n, larg) {
  const tx = -n.z;
  const tz = n.x;
  let melhor = -1;
  let dMin = Infinity;
  lista.forEach((bl, i) => {
    if (bl.parede === 0) return; // a parede da frente sai inteira no tour
    const along = (bl.x - centro.x) * tx + (bl.z - centro.z) * tz;
    const fora = Math.abs((bl.x - centro.x) * n.x + (bl.z - centro.z) * n.z);
    if (fora > 0.3 || Math.abs(bl.y - centro.y) > 0.6) return;
    const lado = Math.abs(along);
    if (lado < larg / 2 + 0.4 || lado > larg / 2 + 1.2) return;
    if (lado < dMin) { dMin = lado; melhor = i; }
  });
  return melhor;
}

/**
 * Os 6 quadros nas paredes que o drone olha DENTRO da casa (um por vantagem, na ORDEM): o raio da câmera até o que
 * ela olha acha a parede; o quadro fica nela, na altura dos olhos, virado pro cômodo.
 */
function montarPlacas() {
  if (placas) {
    obra.remove(placas);
    placas.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      if (o.material.map && !(artesQuadros && artesQuadros.tex.includes(o.material.map))) o.material.map.dispose();
      o.material.dispose();
    });
  }
  placas = new Group();
  placas.visible = false;
  obra.add(placas);
  obra.updateMatrixWorld(true);
  blocosMesh.computeBoundingSphere(); // a esfera das instâncias pode ter sido medida com a casa ainda no chão
  const paradas = new Map(); // índice do trecho do tour → [{ pos do quadro, [2 pontos de onde o drone lê] }, ...]
  const P = projeto;
  const caixas = [P.A, P.B].filter(Boolean);
  const dentro = (x, z) => caixas.some((c) => x > c.x0 + 0.2 && x < c.x1 - 0.2 && z > c.z0 + 0.2 && z < c.z1 - 0.2);
  const LARG = 0.9;
  const ALT = artesQuadros ? limitarEntre(LARG / artesQuadros.aspecto, 0.45, 0.9) : 0.6;
  const raio = (de, para) => {
    const dir = para.clone().sub(de);
    const d = dir.length();
    _raycast.set(de, dir.divideScalar(d));
    _raycast.far = d + 0.4;
    // móveis, TV e quadros de decoração também contam: o quadro da vantagem não pode ficar atrás nem em cima deles
    const h = _raycast.intersectObjects(mobilia ? [blocosMesh, mobilia] : [blocosMesh], true)
      .find((x) => x.object !== blocosMesh || (lista[x.instanceId] && lista[x.instanceId].parede !== 0));
    _raycast.far = Infinity;
    return h && h.object === blocosMesh ? h : null;
  };
  /** cabe um quadro inteiro aqui? os 4 cantos têm que cair na MESMA parede (nada de janela, porta ou quina) */
  const cabe = (cam, centro, n, idParede) => {
    const tx = -n.z;
    const tz = n.x;
    return [[1, 1], [1, -1], [-1, 1], [-1, -1]].every(([a, b]) => {
      const canto = new Vector3(centro.x + tx * (LARG / 2) * a, centro.y + (ALT / 2) * b, centro.z + tz * (LARG / 2) * a);
      const h = raio(cam, canto);
      return h && lista[h.instanceId].parede === idParede && h.point.distanceTo(canto) < 0.25;
    });
  };
  const usados = [];
  // 3 passadas: na casa pequena as seguintes aceitam ler um pouco mais de perto e quadros um pouco mais juntos
  for (const [perto, junto] of [[1.6, 1.2], [1.25, 0.95], [1.05, 0.8]]) for (let i = 0; i < P.tour.length && usados.length < ORDEM.length; i++) {
    const [x, y, z, lx, ly, lz] = P.tour[i];
    if (!dentro(x, z)) continue;
    const cam = new Vector3(x, y, z);
    const olhar = new Vector3(lx, ly, lz).sub(cam).normalize();
    // procura um pedaço inteiro de parede pra onde o drone olha (ou um pouco pros lados; desliza se cair em janela/porta)
    let centro = null;
    let n = null;
    for (const gira of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) {
      const dir = olhar.clone().applyAxisAngle(_eixo.set(0, 1, 0), gira);
      const hit = raio(cam, cam.clone().addScaledVector(dir, 9));
      if (!hit || hit.distance < perto) continue; // sem espaço pro drone ler de longe
      const idParede = lista[hit.instanceId].parede;
      const m = muroDe(idParede);
      n = m.eixo === "x" ? new Vector3(0, 0, Math.sign(cam.z - hit.point.z) || 1) : new Vector3(Math.sign(cam.x - hit.point.x) || 1, 0, 0);
      const piso = pisoDe(m.andar);
      for (const desloca of [0, 0.5, -0.5, 1.0, -1.0]) {
        const c = hit.point.clone().addScaledVector(new Vector3(-n.z, 0, n.x), desloca).addScaledVector(n, 0.03);
        c.y = limitarEntre(hit.point.y, piso + 1.35, piso + 1.8);
        if (usados.some((u) => u.distanceTo(c) < junto)) continue;
        if (cabe(cam, c.clone().addScaledVector(n, -0.03), n, idParede)) { centro = c; break; }
      }
      if (centro) break;
    }
    if (!centro) continue;
    const k = usados.length;
    usados.push(centro);
    const placa = criarQuadro(k, LARG, ALT);
    placa.position.copy(centro).addScaledVector(n, -0.02);
    placa.rotation.y = Math.atan2(n.x, n.z);
    placas.add(placa);
    // o que acontece na parede em volta do quadro: o "Acabamento" tira a tinta da casa; os outros abrem a parede ao
    // lado do quadro e mostram o miolo do Blocão (concreto + EPS + concreto)
    const acao = ORDEM[k] === "acabamento" ? { tinta: true } : { iBloco: blocoAoLado(centro, n, LARG), volta: blocosEmVolta(centro, n) };
    // o drone chega pelo caminho livre (o raio até a parede) e desliza devagar enquanto dá pra ler; depois RECUA o
    // máximo que o cômodo deixa, virando pro lado do quadro, e só lá atrás a parede abre (no celular em pé a tela é
    // estreita: de perto só o quadro cabia e a parede abrindo ficava fora do enquadramento)
    const visto = centro.clone().sub(cam).normalize();
    const d = Math.min(cam.distanceTo(centro) - 0.1, 2.6);
    const olho = (k) => centro.clone().addScaledVector(visto, -d * k).setY(centro.y - 0.08);
    const bl = acao.iBloco >= 0 ? lista[acao.iBloco] : null;
    const abre = bl ? new Vector3(bl.x, centro.y, bl.z).addScaledVector(n, 0.03) : centro.clone();
    const meio = abre.clone().lerp(centro, 0.3); // a abertura no meio da tela, com o quadro ainda na beirada
    // espaço livre na frente da abertura. Na altura do olho é limite (o drone não entra no armário); na dos móveis
    // baixos (vaso, cadeira, sofá) ele fica na frente deles se ainda sobrar distância pra ver a parede abrir
    const livreEm = (dy) => {
      _raycast.set(meio.clone().addScaledVector(n, 0.2).setY(centro.y + dy), n);
      _raycast.far = 6;
      const h = _raycast.intersectObjects([blocosMesh].concat(mobilia ? [mobilia] : [], solidos), true)
        .find((x) => x.object !== blocosMesh || (lista[x.instanceId] && lista[x.instanceId].parede !== 0)); // a da frente sai no tour
      _raycast.far = Infinity;
      return h ? h.distance + 0.2 : 6;
    };
    let dVer = Math.min(livreEm(0) - 0.5, 3.6);
    const baixo = Math.min(livreEm(-0.45), livreEm(-0.85)) - 0.4;
    if (baixo >= 1.3) dVer = Math.min(dVer, baixo);
    dVer = Math.max(dVer, 0.9);
    const recuo = meio.clone().addScaledVector(n, dVer).setY(centro.y - 0.05);
    const parado = meio.clone().addScaledVector(n, dVer + 0.15).setY(centro.y - 0.05); // deriva de leve enquanto abre
    paradas.set(i, (paradas.get(i) || []).concat({ pos: centro, ver: [olho(1), olho(0.88), recuo, parado], alvos: [centro, centro, meio, meio], acao }));
  }
  return paradas;
}

function iniciarTour(site = false) {
  if (!renderer || !projeto.tour || p < PRONTA) return false;
  if (site && (voo || foco || interior || tour)) return false;
  garantirExtras();
  if (interior || fora.size) { fora.clear(); revelados = new Set(); interior = null; passeio = null; }
  const ini = capturarPose();
  const V = (x, y, z) => new Vector3(x, y, z);
  const pts = [ini.pos.clone()];
  const alvos = [ini.alvo.clone()];
  const vels = [0];
  const legendas = [null];
  if (site) {
    // site: o drone desliza devagar em frente a cada quadro (dá pra ler) e voa entre eles na velocidade de um drone real
    const paradas = montarPlacas();
    placas.visible = true;
    Object.assign(olhoTour, { giro: 0, elev: 0, giroAlvo: 0, elevAlvo: 0, t: 0, dedo: false });
    const ler = [false];
    const recua = [false];  // trecho em que o drone se afasta do quadro (depois de ler)
    const mostra = [false]; // trecho em que a parede fica aberta (já lá atrás)
    const acoes = [null];
    // só até sair da casa (o resto do voo do vídeo, pelo alto, gastaria o tempo do tour)
    const caixas = [projeto.A, projeto.B].filter(Boolean);
    const naCasa = ([x, , z]) => caixas.some((c) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1);
    let ultimo = 0;
    projeto.tour.forEach((w, i) => { if (naCasa(w)) ultimo = i; });
    const fixo = [true]; // os pontos de leitura de cada quadro nunca saem do caminho
    projeto.tour.slice(0, ultimo + 2).forEach(([x, y, z, lx, ly, lz], i) => {
      const pa = paradas.get(i);
      // chega (ver[0]) → lê com a parede fechada (ver[1]) → recua e vira, ainda fechada (ver[2]) → a parede abre (ver[3])
      if (pa) pa.forEach((q) => { pts.push(...q.ver); alvos.push(...q.alvos); ler.push(false, true, false, false); recua.push(false, false, true, false); mostra.push(false, false, false, true); acoes.push(null, null, null, q.acao); fixo.push(true, true, true, true); });
      else { pts.push(V(x, y, z)); alvos.push(V(lx, ly, lz)); ler.push(false); recua.push(false); mostra.push(false); acoes.push(null); fixo.push(false); }
    });
    pts.push(ini.pos.clone());
    alvos.push(ini.alvo.clone());
    ler.push(false);
    recua.push(false);
    mostra.push(false);
    acoes.push(null);
    fixo.push(true);
    // atalho: o drone pula os desvios do caminho do vídeo quando a reta até mais adiante está livre (sem parede nem
    // móvel, com folga pros lados) — voa devagar como um drone de verdade sem o tour ficar longo
    const livre = (a, b) => {
      const d = a.distanceTo(b);
      if (d < 0.05) return true;
      // só dentro da casa e no mesmo andar: por fora cortaria pela janela, entre andares pela laje
      if (!naCasa([a.x, 0, a.z]) || !naCasa([b.x, 0, b.z]) || Math.abs(a.y - b.y) > 0.4) return false;
      const dir = b.clone().sub(a).divideScalar(d);
      const lado = new Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(0.3);
      const alvosRaio = [blocosMesh].concat(mobilia ? [mobilia] : [], solidos);
      return [[0, 0], [1, 0], [-1, 0], [0, -0.3]].every(([k, dy]) => {
        _raycast.set(a.clone().addScaledVector(lado, k).setY(a.y + dy), dir);
        _raycast.far = d;
        const h = _raycast.intersectObjects(alvosRaio, true).find((x) => x.object !== blocosMesh || (lista[x.instanceId] && lista[x.instanceId].parede !== 0));
        _raycast.far = Infinity;
        return !h;
      });
    };
    const fica = [0];
    for (let i = 0; i < pts.length - 1;) {
      let j = i + 1;
      for (let k = i + 2; k < pts.length; k++) {
        if (fixo[k - 1] || !livre(pts[i], pts[k])) break;
        j = k;
      }
      fica.push(j);
      i = j;
    }
    const pegar = (l) => fica.map((i) => l[i]);
    pts.splice(0, pts.length, ...pegar(pts));
    alvos.splice(0, alvos.length, ...pegar(alvos));
    ler.splice(0, ler.length, ...pegar(ler));
    recua.splice(0, recua.length, ...pegar(recua));
    mostra.splice(0, mostra.length, ...pegar(mostra));
    acoes.splice(0, acoes.length, ...pegar(acoes));
    tourAcoes = { acoes, mostra };
    const dist = (i) => Math.max(pts[i].distanceTo(pts[i - 1]), alvos[i].distanceTo(alvos[i - 1]) * 0.3, 0.35);
    // dentro da casa o drone voa devagar como um de verdade; do lado de fora pode correr
    const dentroDaCasa = (v) => caixas.some((c) => v.x > c.x0 && v.x < c.x1 && v.z > c.z0 && v.z < c.z1);
    for (let i = 1; i < pts.length; i++) {
      const dentro = dentroDaCasa(pts[i]) && dentroDaCasa(pts[i - 1]);
      vels.push(ler[i] ? dist(i) / TOUR_LER : recua[i] ? dist(i) / TOUR_RECUAR : mostra[i] ? dist(i) / TOUR_VER : dentro ? Math.min(VEL_DENTRO, dist(i) / 0.5) : Math.max(VEL_FORA, dist(i) / 2.2));
    }
    legendas.push(...pts.slice(1).map(() => null)); // sem legenda: as vantagens estão nos quadros
  } else {
    projeto.tour.forEach(([x, y, z, lx, ly, lz, v, leg]) => { pts.push(V(x, y, z)); alvos.push(V(lx, ly, lz)); vels.push(v || 1.5); legendas.push(leg || null); });
    pts.push(ini.pos.clone());
    alvos.push(ini.alvo.clone());
    vels.push(4);
    legendas.push(null);
  }
  // a parede da frente sai (o corte mostra o Blocão por dentro) e volta no fim
  fora.set(0, { de: 0, para: 1, t0: agora() });
  atualizarRevelados();
  pRemocao = pAlvo;
  tour = { legendas, legenda: null, ini, site };
  iniciarVoo(criarVoo(pts, alvos, vels, {
    tour: true, fov: [ini.fov, site ? 56 : 62], off: [ini.off, 0], tourPontos: site, rampa: site ? 0.6 : undefined,
    aoTrecho: (i) => {
      if (site && tourAcoes) {
        // leu o quadro: a parede em volta dele abre (ou a casa perde a tinta); saindo do quadro: fecha
        if (tourAcoes.mostra[i]) fecharPonto(); // primeiro fecha o quadro que ficou pra trás...
        const a = tourAcoes.acoes[i + 1]; // ...depois abre o que acabou de ser lido
        if (a && a.tinta) definirSemTinta(true);
        else if (a && a.volta) {
          const c = a.iBloco >= 0 ? montarCorte(a.iBloco, 0.55, 0.55, 1.6, 1.0) : { furo: new Set(), borda: new Set() };
          for (const k of a.volta) if (!c.furo.has(k)) c.borda.add(k);
          destaque = { i: a.iBloco, ...c, de: 0, para: 1, t0: agora() };
        }
      }
      const l = legendas[i + 1] !== undefined && legendas[i + 1] !== null ? legendas[i + 1] : tour && tour.legenda;
      if (!tour || l === tour.legenda) return;
      tour.legenda = l;
      if (ouvinteTour) ouvinteTour({ ativo: true, legenda: l });
    },
    aoFim: () => fimTour(),
  }));
  requestAnimationFrame(animar);
  if (ouvinteTour) ouvinteTour({ ativo: true, legenda: legendas[1], site });
  return true;
}

function fimTour() {
  const site = tour && tour.site;
  tour = null;
  for (const id of [...fora.keys()]) fora.set(id, { de: estadoParede(id), para: 0, t0: agora() });
  requestAnimationFrame(animar);
  if (ouvinteTour) ouvinteTour({ ativo: false, legenda: null, site });
  if (!site) return;
  if (placas) placas.visible = false;
  tourAcoes = null;
  fecharPonto();
  animarOrbita();
  // acabou o tour do site: a chamada pra comprar e o site continua
  if (ouvintePonto) ouvintePonto({ ativo: false, fim: true, acabou: true, id: "fim", titulo: FIM_TOUR[0], texto: FIM_TOUR[1] });
}

/** parar no meio: volta voando pra vista de fora */
function pararTour() {
  if (!tour) return;
  const ini = tour.ini;
  const de = camera.position.clone();
  const deA = ultimoAlvo.clone();
  const meio = de.clone().lerp(ini.pos, 0.5);
  meio.y = Math.max(de.y, ini.pos.y) + 1.5;
  voo = null;
  iniciarVoo(criarVoo([de, meio, ini.pos.clone()], [deA, deA.clone().lerp(ini.alvo, 0.6), ini.alvo.clone()], [0, 5, 5], {
    fov: [camera.fov, ini.fov], off: [0, ini.off], aoFim: () => fimTour(),
  }));
}

/* ---------- PONTOS ESTRATÉGICOS: cada um mostra uma vantagem de construir com o Blocão ---------- */
const VANTAGENS = {
  fresca: ["Casa mais fresca", "O miolo de EPS segura o calor do sol: a casa fica mais fresca no verão e menos fria no inverno."],
  silencio: ["Mais silêncio", "O EPS abafa o barulho da rua: quartos e home office bem mais silenciosos."],
  rapida: ["Obra rápida", "Bloco grande e leve: a parede sobe em poucos dias, com menos gente na obra."],
  leve: ["Bem mais leve", "Menos peso sobre a laje e a fundação: a estrutura fica mais econômica."],
  acabamento: ["Acabamento fácil", "Parede reta e lisa: menos massa, menos sujeira e menos desperdício."],
  mofo: ["Sem mofo", "O EPS não absorve água: parede sem mofo e sem infiltração."],
};
/** passo a passo e tour: a ordem em que as vantagens são mostradas (o "Acabamento" tira a tinta: fecha o tour) */
const ORDEM = ["rapida", "leve", "fresca", "silencio", "mofo", "acabamento"];
const FIM_TOUR = ["Gostou? A sua pode ser assim.", "Obra rápida, casa fresca e silenciosa, sem mofo: construa com o Blocão do Império do EPS."];

/** pontos nas faces que aparecem de frente pra câmera (frente e lado direito), calculados pela planta de cada casa */
/** 0 = parede inteira, 1 = corte aberto no meio da parede (miolo do Blocão à mostra) */
function estadoDestaque() {
  if (!destaque) return 0;
  const k = suave(Math.min(1, (agora() - destaque.t0) / DUR_DESTAQUE));
  return destaque.de + (destaque.para - destaque.de) * k;
}

/** blocos das fachadas viradas pro lado do ponto (qualquer andar), do mais perto do ponto pro mais longe */
function blocosDoPonto(pt, n) {
  const fachada = new Set(muros.filter((m) => { const [nx, nz] = normalDe(m); return !m.interna && nx * n.x + nz * n.z > 0.3; }).map((m) => m.id));
  const l = [];
  lista.forEach((bl, i) => {
    if (!fachada.has(bl.parede) || bl.comp < 0.5) return;
    l.push([(bl.x - pt.x) ** 2 + (bl.y - pt.y) ** 2 * 1.5 + (bl.z - pt.z) ** 2, i]);
  });
  return l.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
}

/** tira (true) ou repõe (false) a pintura da casa inteira — devagar, mostrando o Blocão */
function definirSemTinta(on) {
  const alvo = on ? 1 : 0;
  if (semTinta.para === alvo) return !!on;
  const de = semTinta.de + (semTinta.para - semTinta.de) * suave(Math.min(1, (agora() - semTinta.t0) / DUR_TINTA));
  semTinta = { de, para: alvo, t0: agora() };
  requestAnimationFrame(animar);
  return !!on;
}

/** de onde a câmera olha o corte no meio da parede (de frente, um pouco de cima) */
function poseDestaque(i, de) {
  const bl = lista[i];
  const [mx, mz] = normalDe(muroDe(bl.parede));
  const alvo = new Vector3(bl.x, bl.y, bl.z);
  // de ~40° de lado (do lado em que a pessoa já está): a borda do corte mostra a espessura — concreto + EPS + concreto
  const lado = Math.sign((de.pos.x - alvo.x) * -mz + (de.pos.z - alvo.z) * mx) || 1;
  const dir = _a.set(mx * 0.77 - mz * 0.64 * lado, 0.55, mz * 0.77 + mx * 0.64 * lado).normalize();
  // distância pela LARGURA da tela: ~6 m de parede visíveis em volta do corte
  const meiaV = Math.tan(MathUtils.degToRad(30) / 2);
  const D = Math.max(18, 4.2 / (meiaV * Math.min(1.4, camera.aspect))); // ~8 m de casa na largura e ~10 m na altura: dá contexto
  return { i, alvo, pos: alvo.clone().addScaledVector(dir, D), dir: dir.clone(), D, n: { x: mx, z: mz } };
}

/** nada (telhado da garagem, varanda, pilar) entre a câmera e o corte — no meio e nos cantos? */
function vistaLivre(pose) {
  const alvos = [blocosMesh].concat(pecas.filter((m) => m.visible));
  const { n } = pose;
  for (const [a, b] of [[0, 0], [1, 0.5], [-1, 0.5], [1, -0.5], [-1, -0.5]]) {
    // um pouco à frente da parede (a própria parede não conta)
    _c.set(pose.alvo.x - n.z * a + n.x * 0.3, pose.alvo.y + b, pose.alvo.z + n.x * a + n.z * 0.3);
    const d = _c.distanceTo(pose.pos);
    _raycast.set(pose.pos, _c.sub(pose.pos).divideScalar(d));
    _raycast.far = d;
    const hit = _raycast.intersectObjects(alvos, true)[0];
    _raycast.far = Infinity;
    if (hit) return false;
  }
  return true;
}

/** o corte: ~2 blocos × 3 fiadas saem da parede; os da volta perdem a tinta (o miolo aparece na borda) */
function montarCorte(i, meia = 0.95, alt = 0.55, bordaMeia = 1.9, bordaAlt = 1.1) {
  const c = lista[i];
  const m = muroDe(c.parede);
  const ao = (bl) => (m.eixo === "x" ? bl.x : bl.z);
  const furo = new Set();
  const borda = new Set();
  lista.forEach((bl, k) => {
    if (bl.parede !== c.parede) return;
    const da = Math.abs(ao(bl) - ao(c));
    const dy = Math.abs(bl.y - c.y);
    if (da < meia && dy < alt) furo.add(k);
    else if (da < bordaMeia && dy < bordaAlt) borda.add(k);
  });
  return { furo, borda };
}

/** parede externa onde o ponto está (pra abrir e mostrar o Blocão por dentro) */
function paredeDoPonto(pt, nn) {
  const andar = projeto.B && pt.y > CHAO + PE + LAJE * 0.5 ? 1 : 0;
  let melhor = null;
  let dMin = Infinity;
  for (const m of muros) {
    if (m.interna || m.andar !== andar) continue;
    const [nx, nz] = normalDe(m);
    if (nx * nn.x + nz * nn.z < 0.5) continue;
    const ao = m.eixo === "x" ? pt.x : pt.z;
    if (ao < Math.min(m.ini, m.fim) - 0.5 || ao > Math.max(m.ini, m.fim) + 0.5) continue;
    const d = Math.abs((m.eixo === "x" ? pt.z : pt.x) - m.fixo);
    if (d < dMin) { dMin = d; melhor = m; }
  }
  return melhor && dMin < 4 ? melhor.id : undefined; // varanda na frente: a parede fica recuada do ponto
}

function montarPontos() {
  const P = projeto;
  const { A } = P;
  const R = P.B || A;
  const Y2 = CHAO + PE + LAJE;
  const topo = P.B ? Y2 + PE : CHAO + PE;
  const jan = (P.vaosA.frente || []).find((v) => !v.porta) || { a: A.x0 + 1, b: A.x0 + 2, f0: 2, f1: 5 };
  const V = (x, y, z) => new Vector3(x, y, z);
  const n = (x, y, z) => V(x, y, z).normalize();
  pontos = [
    { id: "fresca", p: V(A.x1 - 0.05, CHAO + 1.4, A.z1 - 0.05), n: n(1, 0, 1), dist: 5.2, parede: 0 },
    { id: "silencio", p: V((jan.a + jan.b) / 2, CHAO + ((jan.f0 + jan.f1) / 2) * BA, A.z1 + 0.02), n: n(0, 0, 1), dist: 6 },
    { id: "rapida", p: V(A.x1 + 0.02, CHAO + 0.9, (A.z0 + A.z1) / 2 - 0.8), n: n(1, 0, 0), dist: 6 },
    { id: "leve", p: V(A.x1 + 0.15, CHAO + PE + LAJE / 2, A.z0 + 1.2), n: n(1, 0, 0), dist: 6.5 },
    { id: "acabamento", p: V(R.x1 + 0.02, topo - 1.1, (R.z0 + R.z1) / 2 + 0.9), n: n(1, 0, 0), dist: 6, caixa: R, semTinta: true },
    { id: "mofo", p: V(A.x0 + 1.0, CHAO + 0.25, A.z1 + 0.02), n: n(0, 0, 1), dist: 5 },
  ].map((q) => {
    // o mesmo ponto espelhado do outro lado da casa: girando 360°, as vantagens nunca somem da tela
    const c = q.caixa || A;
    const espelho = { p: V(c.x0 + c.x1 - q.p.x, q.p.y, c.z0 + c.z1 - q.p.z), n: V(-q.n.x, q.n.y, -q.n.z) };
    if (q.parede !== undefined) {
      const m0 = muros.find((m) => m.id === q.parede);
      const oposta = m0 && muros.find((m) => m.andar === m0.andar && !m.interna && m.eixo === m0.eixo && m.fora === -m0.fora);
      if (oposta) espelho.parede = oposta.id;
    }
    const cands = [{ p: q.p, n: q.n, parede: q.parede }, espelho];
    cands.forEach((c) => { if (c.parede === undefined) c.parede = paredeDoPonto(c.p, c.n); });
    q.parede = cands[0].parede;
    return { ...q, cands, titulo: VANTAGENS[q.id][0], texto: VANTAGENS[q.id][1] };
  });
}

function avisarPonto() {
  if (!ouvintePonto) return;
  const q = foco && pontos.find((x) => x.id === foco.id);
  ouvintePonto(q ? { ativo: true, id: q.id, titulo: q.titulo, texto: q.texto, passo: ORDEM.indexOf(q.id) + 1, total: ORDEM.length } : { ativo: false, voando: !!voo });
}

/**
 * onde a câmera olha cada ponto: um corte no meio da parede (o miolo do Blocão: concreto + EPS + concreto),
 * no lugar mais perto do ponto que a câmera consiga ver inteiro (sem telhado de garagem/varanda na frente)
 */
function planoPonto(q, de) {
  let iBloco = -1;
  let pose = null;
  if (q.parede !== undefined) {
    for (const i of blocosDoPonto(q.p, q.n)) {
      const ps = poseDestaque(i, de);
      if (!pose) { pose = ps; iBloco = i; }
      if (vistaLivre(ps)) { pose = ps; iBloco = i; break; }
    }
  }
  return {
    iBloco,
    alvo: pose ? pose.alvo : q.p.clone(),
    pos: pose ? pose.pos : q.p.clone().addScaledVector(q.n, 9).setY(q.p.y + 5),
  };
}

/** abre o corte do ponto (ou, no "Acabamento", tira a tinta da casa inteira e mostra o Blocão) */
function mostrarPonto(q, iBloco, atraso) {
  if (destaque && destaque.i !== iBloco) destaque = null;
  if (iBloco >= 0 && !q.semTinta) destaque = { i: iBloco, ...montarCorte(iBloco), de: estadoDestaque(), para: 1, t0: agora() + atraso };
  definirSemTinta(!!q.semTinta);
  requestAnimationFrame(animar);
}

/** fecha o corte aberto (devagar) e repõe a pintura */
function fecharPonto() {
  if (destaque) destaque = { ...destaque, de: estadoDestaque(), para: 0, t0: agora() };
  definirSemTinta(false);
  requestAnimationFrame(animar);
}

/**
 * Dedo durante o tour: gira a vista em volta do que o drone está filmando (o drone NÃO para); ao soltar, a vista
 * volta devagar pro enquadramento do drone.
 */
const olhoTour = { giro: 0, elev: 0, giroAlvo: 0, elevAlvo: 0, t: 0, dedo: false };
function olharTour(pos, alvo) {
  const t = agora();
  const dt = olhoTour.t ? Math.min(0.1, (t - olhoTour.t) / 1000) : 0.016;
  olhoTour.t = t;
  if (!olhoTour.dedo) {
    const volta = Math.exp(-dt / 1.1);
    olhoTour.giroAlvo *= volta;
    olhoTour.elevAlvo *= volta;
  }
  const k = 1 - Math.exp(-dt / 0.14);
  olhoTour.giro += (olhoTour.giroAlvo - olhoTour.giro) * k;
  olhoTour.elev += (olhoTour.elevAlvo - olhoTour.elev) * k;
  if (Math.abs(olhoTour.giro) < 1e-4 && Math.abs(olhoTour.elev) < 1e-4) return;
  const dx = pos.x - alvo.x;
  const dz = pos.z - alvo.z;
  const h = Math.hypot(dx, dz);
  const R = Math.hypot(h, pos.y - alvo.y);
  const ang = Math.atan2(dx, dz) + olhoTour.giro;
  const el = limitarEntre(Math.atan2(pos.y - alvo.y, h) + olhoTour.elev, 0.05, 1.3);
  pos.set(alvo.x + Math.sin(ang) * Math.cos(el) * R, alvo.y + Math.sin(el) * R, alvo.z + Math.cos(ang) * Math.cos(el) * R);
}
/** clicou num ponto: a câmera voa até perto dele (sem entrar na casa) e mostra a vantagem */
function irPonto(id) {
  const q = pontos.find((x) => x.id === id);
  if (!q || !renderer || p < PRONTA || tour || interior) return false;
  if (foco && foco.id === id) return true;
  for (const k of [...fora.keys()]) fora.set(k, { de: estadoParede(k), para: 0, t0: agora() });
  const de = capturarPose();
  const { iBloco, alvo, pos } = planoPonto(q, de);
  mostrarPonto(q, iBloco, 120);
  const meio = de.pos.clone().lerp(pos, 0.5);
  meio.y = Math.max(de.pos.y, pos.y) + 0.6;
  const meioA = de.alvo.clone().lerp(alvo, 0.6);
  foco = null;
  saidaFoco = null;
  pRemocao = pAlvo;
  iniciarVoo(criarVoo([de.pos, meio, pos], [de.alvo, meioA, alvo], [0, 1, 1], {
    fov: [de.fov, 30], off: [de.off, de.off], duracao: 0.8, ponto: true,
    aoFim: () => {
      // em volta do ponto o dedo continua girando a câmera (ângulo/altura/distância a partir do alvo)
      const d = pos.clone().sub(alvo);
      const R = d.length();
      const ang = Math.atan2(d.x, d.z);
      const el = Math.asin(limitarEntre(d.y / R, -1, 1));
      foco = { id, pos, alvo, fov: 30, R, ang0: ang, ang, el, angAlvo: ang, elAlvo: el };
      avisarPonto();
    },
  }));
  requestAnimationFrame(animar);
  avisarPonto();
  return true;
}

/** volta pra vista da maquete inteira (rápido e suave; se o dedo estiver girando, já volta girando) */
function voltarPonto() {
  if (!foco && !(voo && voo.ponto)) return;
  saidaFoco = { ...capturarPose(), t0: agora() };
  foco = null;
  voo = null;
  for (const k of [...fora.keys()]) fora.set(k, { de: estadoParede(k), para: 0, t0: agora() });
  fecharPonto();
  animarOrbita();
  avisarPonto();
}

const _tela = new Vector3();
const _olho = new Vector3();
/** onde cada ponto está na tela (px da janela) e se está virado pra câmera */
function pontosNaTela() {
  if (!renderer || !pontos.length) return [];
  const r = renderer.domElement.getBoundingClientRect();
  camera.updateMatrixWorld();
  return pontos.map((q) => {
    // usa o lado do ponto que está virado pra câmera (com folga, pra não ficar trocando no meio do giro)
    if (!foco && !voo) {
      const nota = (c) => _olho.copy(camera.position).sub(c.p).normalize().dot(c.n);
      const atual = q.cands.find((c) => c.p === q.p);
      const outro = q.cands.find((c) => c !== atual);
      if (outro && nota(outro) > nota(atual) + 0.25) { q.p = outro.p; q.n = outro.n; q.parede = outro.parede; }
    }
    const onde = foco && foco.id === q.id ? foco.alvo : q.p; // em foco: o ponto é o Blocão que saiu da parede
    _olho.copy(camera.position).sub(q.p).normalize();
    _tela.copy(onde).project(camera);
    const frente = q.n.dot(_olho) > 0.2 && _tela.z < 1;
    return { id: q.id, titulo: q.titulo, x: r.left + ((_tela.x + 1) / 2) * r.width, y: r.top + ((1 - _tela.y) / 2) * r.height, visivel: frente };
  });
}

/** drone por fora: a câmera persegue o alvo do dedo (mola), inclina na curva e, ao soltar, plana e vai parando */
let tGiro = 0;
function quadroOrbita(t) {
  const dt = Math.min(0.05, tGiro ? (t - tGiro) / 1000 : 0.016);
  tGiro = t;
  if (interior || tour) { orbitaViva = false; tGiro = 0; rollFora = 0; return; }
  if (!arrastando) {
    // planando: o embalo do dedo continua e vai perdendo força (no zoom de um ponto, em volta do ponto)
    if (foco) foco.angAlvo = limitarEntre(foco.angAlvo + giroVel * dt, foco.ang0 - 1.1, foco.ang0 + 1.1);
    else giroAlvo += giroVel * dt;
    giroVel *= Math.exp(-dt / 0.5);
  }
  const k = 1 - Math.exp(-dt / 0.14);
  let focoAndando = false;
  if (foco && foco.R) { // drone em volta do corte: persegue o dedo e recalcula a posição da câmera
    foco.ang += (foco.angAlvo - foco.ang) * k;
    foco.el += (foco.elAlvo - foco.el) * k;
    const c = Math.cos(foco.el);
    foco.pos.set(foco.alvo.x + Math.sin(foco.ang) * c * foco.R, foco.alvo.y + Math.sin(foco.el) * foco.R, foco.alvo.z + Math.cos(foco.ang) * c * foco.R);
    focoAndando = Math.abs(foco.angAlvo - foco.ang) > 0.0005 || Math.abs(foco.elAlvo - foco.el) > 0.0005;
  }
  giroUser += (giroAlvo - giroUser) * k;
  elevUser += (elevAlvo - elevUser) * k;
  // inclinação pela distância até o alvo do dedo (suave; a velocidade por quadro tremia no celular)
  rollFora += (limitarEntre(-(giroAlvo - giroUser) * 0.35, -0.1, 0.1) - rollFora) * (1 - Math.exp(-dt / 0.25));
  const parado = !focoAndando && !saidaFoco && !arrastando && Math.abs(giroVel) < 0.02 && Math.abs(giroAlvo - giroUser) < 0.0005 && Math.abs(elevAlvo - elevUser) < 0.0005 && Math.abs(rollFora) < 0.002;
  pDesenhado = -1;
  if (parado) {
    giroUser = giroAlvo; elevUser = elevAlvo; rollFora = 0; giroVel = 0;
    orbitaViva = false; tGiro = 0;
    desenhar(true);
    return;
  }
  desenhar(false);
  requestAnimationFrame(quadroOrbita);
}
function animarOrbita() {
  if (orbitaViva || window.__gravandoVideo) return;
  orbitaViva = true;
  tGiro = 0;
  requestAnimationFrame(quadroOrbita);
}

/** móveis e paisagem: montados uma vez por casa, num momento ocioso (ou na hora, se precisar já) */
function garantirExtras() {
  if (extrasProntos || !projeto) return;
  if (!mobilia) montarMoveis();
  if (!paisagem) montarPaisagem();
}

// móveis, eletros e quadros: o tour do drone entra na casa
function montarMoveis() {
  const P = projeto;
  const Y2 = CHAO + PE + LAJE;
  mobilia = fundirPorMaterial(mobiliar(P, [CHAO + 0.022, Y2 + 0.022], BE, [CHAO + PE, P.B ? Y2 + PE : CHAO + PE]));
  mobilia.visible = false;
  obra.add(mobilia);
  pDesenhado = -1;
}

function montarPaisagem() {
  const P = projeto;
  carregarArteQuadros();
  paisagem = cenario(P.base, P.A.z1 + P.varanda, P.centro[0] * 0.4);
  paisagem.visible = false;
  obra.add(paisagem);
  extrasProntos = true;
  pDesenhado = -1;
}

/**
 * Móveis e paisagem em duas etapas, só num respiro de verdade: nunca com a obra subindo na rolagem nem no meio de
 * um voo (montar tudo de uma vez, forçado pelo prazo, travava a casa logo no começo da construção).
 */
let ultimaRolagem = 0;
/** fn num momento sem voo nem rolagem (trocar texturas recompila os materiais) */
function quandoParado(fn) {
  if (voo || agora() - ultimaRolagem < 400) setTimeout(() => quandoParado(fn), 300);
  else fn();
}
function prepararExtrasOcioso() {
  const proj = projeto;
  const agendar = () => (window.requestIdleCallback ? window.requestIdleCallback(passo, { timeout: 3000 }) : setTimeout(passo, 700));
  const passo = (prazo) => {
    if (extrasProntos || projeto !== proj) return;
    const parado = !voo && !pedido && agora() - ultimaRolagem > 700;
    if (parado && (!prazo || prazo.didTimeout || prazo.timeRemaining() > 10)) {
      if (!mobilia) montarMoveis();
      else montarPaisagem();
    }
    if (!extrasProntos) agendar();
  };
  agendar();
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
      if (bl.parede === id || Math.floor(bl.parede / 20) !== m.andar) return;
      if ((m.eixo === "x") !== bl.girado) return; // só as paredes perpendiculares encostam no corte
      const c = m.eixo === "x" ? bl.z : bl.x;
      const e0 = c - bl.comp / 2;
      const e1 = c + bl.comp / 2;
      if ((e0 > lo - 0.06 && e0 < hi + 0.06) || (e1 > lo - 0.06 && e1 < hi + 0.06)) revelados.add(i);
    });
  }
}

/**
 * Onde as paredes INTERNAS encostam na parede tirada (no mesmo andar): ali o corte mostra o miolo do Blocão
 * (concreto + EPS + concreto) bem de frente pra quem olha pela abertura. Ordenados do meio da parede pra fora.
 */
function cortesInternos(m) {
  const face = m.eixo === "x" ? m.fixo - m.fora * BE : m.fixo - m.fora * (BE / 2); // face de dentro da parede tirada
  const meio = (m.ini + m.fim) / 2;
  return muros
    .filter((w) => w.interna && w.andar === m.andar && w.eixo !== m.eixo && Math.min(Math.abs(w.ini - face), Math.abs(w.fim - face)) < 0.2)
    .map((w) => (m.eixo === "x" ? { x: w.fixo, z: face } : { x: face, z: w.fixo }))
    .sort((a, b) => Math.abs((m.eixo === "x" ? a.x : a.z) - meio) - Math.abs((m.eixo === "x" ? b.x : b.z) - meio));
}

/**
 * Pose da câmera "entrando" pela abertura: de frente pra uma parede interna cortada (o EPS dentro do Blocão grande
 * na tela) e o olhar atravessando os cômodos na diagonal. Sem parede interna ali: pelo meio da abertura.
 */
function poseInterior(m) {
  const [nx, nz] = normalDe(m);
  const [tx, tz] = tangenteDe(m);
  const meio = (m.ini + m.fim) / 2;
  const empe = camera.aspect < 1; // celular em pé: recua um pouco mais e abre o ângulo
  const c = cortesInternos(m)[0];
  if (c) {
    const lado = Math.sign(meio - (m.eixo === "x" ? c.x : c.z)) || 1; // fica do lado do cômodo maior
    const de = empe ? 1.25 : 1.6;
    return {
      pos: new Vector3(c.x + tx * lado * de + nx * (empe ? 1.6 : 1.3), m.y0 + 1.55, c.z + tz * lado * de + nz * (empe ? 1.6 : 1.3)),
      alvo: new Vector3(c.x - tx * lado * 0.9 - nx * 2.6, m.y0 + 1.1, c.z - tz * lado * 0.9 - nz * 2.6),
      fov: empe ? 76 : 64,
      off: 0,
      corte: new Vector3(c.x, m.y0 + 1.6, c.z),
    };
  }
  const cx = m.eixo === "x" ? meio : m.fixo;
  const cz = m.eixo === "x" ? m.fixo : meio;
  return {
    pos: new Vector3(cx + nx * (empe ? 2.2 : 1.6), m.y0 + 1.55, cz + nz * (empe ? 2.2 : 1.6)),
    alvo: new Vector3(cx - nx * 4, m.y0 + 1.1, cz - nz * 4),
    fov: empe ? 78 : 64,
    off: 0,
    corte: null,
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
  pRemocao = pAlvo;
  passeio = null;
  garantirExtras();
  interior = { de: capturarPose(), para: poseInterior(m), t0: agora(), volta: false, muro: m };
  if (ouvinteInterior) ouvinteInterior({ dentro: true, removidas: fora.size });
  requestAnimationFrame(animar);
}

function recolocarParedes() {
  if (!fora.size && !interior) return;
  for (const id of [...fora.keys()]) fora.set(id, { de: estadoParede(id), para: 0, t0: agora() });
  if (interior) interior = { de: capturarPose(), t0: agora(), volta: true };
  passeio = null;
  requestAnimationFrame(animar);
}

function aplicar() {
  const dentro = modoDentro();
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
    if (destaque && destaque.furo.has(i)) { // corte: o bloco sai da parede pra fora e some
      const r = estadoDestaque();
      if (r > 0) {
        const [nx, nz] = normalDe(muroDe(bl.parede));
        _o.position.x += nx * r * 1.4;
        _o.position.z += nz * r * 1.4;
        _o.position.y += r * 0.3;
        s *= Math.max(0.0001, 1 - r);
      }
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
  if (dentro) {
    for (const m of pecas) {
      if (m.visible && m.userData.jardim && m.position.distanceTo(camera.position) < 1.6) m.visible = false;
    }
  }

  // acabamento: pintura cobre os blocos; luz quente acende
  const kSem = semTinta.de + (semTinta.para - semTinta.de) * suave(Math.min(1, (agora() - semTinta.t0) / DUR_TINTA));
  const tinta = suave(faixa(p, 0.86, 0.94)) * (1 - kSem);
  if (tinta > 0.001) {
    for (let i = 0; i < lista.length; i++) {
      const tirar = revelados.has(i) || (fora.size && estadoParede(lista[i].parede) > 0) || (destaque && estadoDestaque() > 0.02 && (destaque.furo.has(i) || destaque.borda.has(i)));
      pinturaMesh.setMatrixAt(i, tirar ? ZERO : pinturaOrig[i]);
    }
    pinturaMesh.instanceMatrix.needsUpdate = true;
  }
  pinturaMesh.visible = tinta > 0.001;
  mats.pintura.opacity = tinta;
  mats.pintura.transparent = tinta < 0.999;
  mats.pintura.depthWrite = tinta > 0.5;
  mats.vidro.emissiveIntensity = dentro ? 0 : 0.55 * suave(faixa(p, 0.9, 1));
  // casa aberta / tour: móveis aparecem e o vidro fica claro (vê o jardim lá fora)
  if (mobilia) mobilia.visible = dentro;
  mats.vidro.opacity = dentro ? 0.12 : 0.5;
  mats.vidro.color.set(dentro ? "#dfeef3" : "#2b3a44");
  // casa pronta: a paisagem (céu, gramado, morros, árvores, vizinhos) vira o FUNDO da seção, surgindo devagar
  const kP = dentro ? 1 : suave(faixa(p, 0.9, 0.98));
  if (kP > 0 && !extrasProntos) garantirExtras();
  if (paisagem) {
    paisagem.visible = kP > 0;
    if (kP > 0) paisagem.userData.surgir(kP);
    // por fora: o que ficar entre o drone e a maquete abaixa (por dentro, tudo de pé pela janela)
    if (kP > 0) {
      const vx = camera.position.x - centro.x;
      const vz = camera.position.z - centro.z;
      const n = Math.hypot(vx, vz) || 1;
      paisagem.userData.vista(vx / n, vz / n, dentro ? 0 : 1);
    }
  }
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

let tamAntes = "";
function redimensionar() {
  const el = renderer.domElement;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (!w || !h || `${w}x${h}` === tamAntes) return; // mesmo tamanho: não realoca a imagem
  tamAntes = `${w}x${h}`;
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

const _tamTela = new Vector2();
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
  // render de aquecimento num pixel só (envia texturas pra placa): a casa pela metade nunca pisca na tela e some
  const tam = renderer.getSize(_tamTela);
  renderer.setScissorTest(true);
  renderer.setScissor(0, 0, 1, 1);
  renderer.setViewport(0, 0, 1, 1);
  renderer.render(cena, camera);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, tam.x, tam.y);
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
  await respirar(); // etapas curtas: a animação do bloco não congela enquanto a casa é preparada
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
    if (novo !== pAlvo) ultimaRolagem = agora();
    if (novo > 0) carregarTexturas(quandoParado, () => { pDesenhado = -1; pedir(); }); // a obra começou: as fotos descem agora
    // rolar DE VERDADE (não um tremidinho do dedo ou da barra do navegador) recoloca as paredes e tira a câmera
    if (Math.abs(novo - pRemocao) > 0.03) {
      if (tour) pararTour();
      else if (foco || (voo && voo.ponto)) voltarPonto(); // rolou: sai do ponto / interrompe o tour
      else if (fora.size || interior) recolocarParedes();
    }
    // sem mola: no vídeo (quadro a quadro), em saltos grandes (menu "A casa") e durante o voo do Blocão do site
    // (0–0,13: a cena do bloco lê voo() a cada rolagem e o bloco tem que bater com a câmera da casa)
    if (window.__gravandoVideo || Math.abs(novo - p) > 0.3 || Math.min(novo, p) < 0.13) p = novo;
    pAlvo = novo;
    pedir();
  },
  /** toque/clique na tela (px do navegador): com a casa pronta, tira a parede tocada. Devolve true se tirou. */
  tocar(x, y) {
    if (!renderer || p < PRONTA) return false;
    const r = renderer.domElement.getBoundingClientRect();
    _ndcV.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    if (tour) return false;
    if (interior) {
      // por dentro: tocou numa parede = ela sai e mostra o Blocão por dentro; na escada = troca de andar;
      // no chão / num móvel / no vazio = a câmera voa (rasante) até lá
      if (!passeio || voo) return false;
      camera.updateMatrixWorld();
      _raycast.setFromCamera(_ndcV, camera);
      blocosMesh.computeBoundingSphere();
      const alvos = [blocosMesh].concat(pecas.filter((m) => m.visible && (m.userData.parede !== undefined || m.userData.piso)), solidos.filter((g) => g.visible));
      if (mobilia && mobilia.visible) alvos.push(mobilia);
      const hit = _raycast.intersectObjects(alvos, true)[0];
      if (hit) {
        const idP = hit.object === blocosMesh ? lista[hit.instanceId].parede : hit.object.userData.parede;
        if (idP !== undefined && muroDe(idP) && hit.distance < 9) return tirarParedeDentro(idP);
        let o = hit.object;
        while (o && !solidos.includes(o)) o = o.parent;
        if (o && solidos[0] === o && projeto.B) { voarAndar(); return true; }
        voarAte(hit.point);
        return true;
      }
      const d = _raycast.ray.direction;
      voarAte(_b.copy(passeio.pos).addScaledVector(d, 3));
      return true;
    }
    // por fora: com um ponto em foco, tocar na casa volta pra vista inteira (não entra mais na casa)
    if (voo && voo.tourPontos) return true; // tour: tocar não faz nada (só o arraste gira a vista)
    if (foco) { voltarPonto(); return true; } // com ponto aberto: volta pra maquete inteira
    return false;
  },
  recolocar() { recolocarParedes(); },
  /** testes: paredes internas da casa atual e o giro do dedo */
  internas() { return muros.filter((m) => m.interna).length; },
  giro() { return giroAlvo; },
  /** arrasto do dedo/mouse (px): gira a casa em volta; dentro dela, vira o olhar */
girar(dx, dy = 0, dtMs = 16) {
    if (!renderer || p < 0.12) return;
    if (voo && voo.tourPontos) { // tour do site: o dedo gira a vista em volta do que o drone filma — o drone segue
      olhoTour.dedo = true;
      olhoTour.giroAlvo = limitarEntre(olhoTour.giroAlvo - dx * 0.008, -2.6, 2.6);
      olhoTour.elevAlvo = limitarEntre(olhoTour.elevAlvo + dy * 0.004, -0.5, 0.7);
      return;
    }
    if (tour) return;
    if (interior) {
      // por dentro: arrastar gira a vista EM VOLTA do ponto mostrado (igual girar a maquete por fora)
      if (!passeio || voo) return;
      const d = _a.copy(passeio.pos).sub(passeio.alvo);
      const R = Math.max(0.8, d.length());
      const ang = Math.atan2(d.x, d.z) - dx * 0.008;
      const el = limitarEntre(Math.atan2(d.y, Math.hypot(d.x, d.z)) + dy * 0.004, -0.5, 0.95);
      const piso = pisoDe(passeio.andar);
      _passo.set(Math.sin(ang) * Math.cos(el), Math.sin(el), Math.cos(ang) * Math.cos(el));
      // parede/móvel entre o ponto e a câmera: ela encosta antes (nunca entra na parede nem vê por dentro dela)
      const livre = obstaculo(passeio.alvo, _passo, R + 0.4);
      const r = livre < R + 0.3 ? Math.max(0.5, livre - 0.35) : R;
      passeio.pos.copy(passeio.alvo).addScaledVector(_passo, r);
      passeio.pos.y = limitarEntre(passeio.pos.y, piso + 0.5, piso + 2.7);
      pDesenhado = -1;
      pedir();
      return;
    }
    if (voo && voo.ponto) return; // chegando no ponto (0,8 s): o dedo gira assim que a câmera pousa
    if (foco && foco.R) { // no zoom de um ponto: o dedo gira a câmera em volta do corte (sem sair do zoom)
      arrastando = true;
      giroVel = giroVel * 0.5 + ((-dx * 0.008) / (Math.max(8, dtMs) / 1000)) * 0.5;
      foco.angAlvo = limitarEntre(foco.angAlvo - dx * 0.008, foco.ang0 - 1.1, foco.ang0 + 1.1); // não vai pra trás da parede
      foco.elAlvo = limitarEntre(foco.elAlvo + dy * 0.004, 0.08, 1.25);
      animarOrbita();
      return;
    }
    const dts = Math.max(8, dtMs) / 1000;
    arrastando = true;
    giroAlvo -= dx * 0.008;
    giroVel = giroVel * 0.5 + ((-dx * 0.008) / dts) * 0.5; // média curta: o embalo não depende de um único evento
    elevAlvo = limitarEntre(elevAlvo + dy * 0.004, -0.12, 0.6); // não desce rente ao chão (o cenário taparia a maquete)
    if (window.__gravandoVideo) { giroUser = giroAlvo; elevUser = elevAlvo; pDesenhado = -1; pedir(); return; }
    animarOrbita();
  },
  /** dedo saiu da tela: a maquete continua o giro e vai parando — inércia */
  soltar() {
    arrastando = false;
    olhoTour.dedo = false;
    if (interior || tour) return;
    giroVel = Math.abs(giroVel) < 0.05 ? 0 : limitarEntre(giroVel, -4, 4);
    animarOrbita(); // a câmera termina de alcançar o dedo, desinclina e plana até parar
  },
  /** pinça (fator > 1 = abrindo os dedos): por fora aproxima/afasta a maquete (zoom só no 3D) */
  pinca(f) {
    if (!renderer || p < 0.12 || !(f > 0) || interior || tour) return;
    zoomUser = limitarEntre(zoomUser / f, 0.4, 1.5);
    pDesenhado = -1;
    pedir();
  },
  /** troca de andar (sobrado e casarão): a câmera sobe/desce voando */
  trocarAndar() { if (passeio && !voo) voarAndar(); },
  /** tour automático pela casa (o cliente só assiste); devolve false se a casa ainda não está pronta */
  tour() { return iniciarTour(); },
  pararTour() { pararTour(); },
  emTour: () => !!tour,
  /** vídeo: em que fração (0..1) do tempo do tour a câmera passa por cada ponto (0 = vista de fora inicial) */
  __tourMarcos() {
    if (!voo || !tour) return null;
    const { T, R, D } = voo;
    return voo.ts.map((sT) => {
      const e = sT < R / 2 ? Math.sqrt(2 * R * sT) : sT < T - R / 2 ? sT + R / 2 : D - Math.sqrt(Math.max(0, 2 * R * (T - sT)));
      return e / D;
    });
  },
  /** testes / vídeo: pula o tour pra fração f (0..1) do sobrevoo e devolve a legenda daquele ponto */
  __irTour(f) {
    if (!voo || !tour) return null;
    voo.t0 = agora() - limitar(f) * voo.D * 1000;
    pDesenhado = -1;
    desenhar(true);
    const leg = tour.legenda;
    if (f >= 1 && window.__gravandoVideo) { voo = null; fimTour(); desenhar(true); } // vídeo: acabou o tour
    return leg;
  },
  /** fn({ ativo, legenda }) durante o tour */
  aoTour(fn) { ouvinteTour = fn; },
  /** pontos estratégicos: posição na tela, ir até um, voltar, ouvir */
  pontosNaTela: () => pontosNaTela(),
  irPonto: (id) => irPonto(id),
  /** tour do drone pelos pontos (sozinho, ≤ 20 s); devolve false se não deu pra começar agora */
  tourPontos: () => iniciarTour(true),
  emTourPontos: () => !!(voo && voo.tourPontos),
  /** testes: quantos quadros abrem a parede ao lado (os outros: acabamento tira a tinta) */
  cortesTour: () => (tourAcoes ? tourAcoes.acoes.filter((x) => x && x.iBloco >= 0).length : 0),
  /** parede aberta ao lado de um quadro agora (0..1) — testes e vídeo */
  corteAberto: () => (destaque ? estadoDestaque() : 0),
  /** testes: quantos quadros de vantagem o tour pendurou nas paredes */
  placasTour: () => (placas ? placas.children.length : 0),
  /** testes: quanto o dedo girou a vista durante o tour */
  olharTour: () => olhoTour.giroAlvo,
  /** "Blocão aparente": true tira a pintura das paredes (mostra o Blocão cru), false pinta de novo */
  semTinta: (on) => definirSemTinta(on),
  /** celular: px ocupados em cima e embaixo da tela (a maquete é enquadrada no espaço livre entre eles) */
  margens(topoPx, basePx) {
    if (margemTopo === topoPx && margemBase === basePx) return;
    margemTopo = topoPx;
    margemBase = basePx;
    pDesenhado = -1;
    if (renderer) pedir();
  },
  /** testes: ângulo do dedo em volta do ponto em foco (null fora do zoom) */
  focoGiro: () => (foco && foco.R ? foco.angAlvo : null),
  voltarPonto: () => voltarPonto(),
  emFoco: () => (foco ? foco.id : null),
  aoPonto(fn) { ouvintePonto = fn; },
  /** estado do passeio (pra os botões e testes): null fora; { andar, andares, voando } dentro */
  passeioInfo() { return passeio ? { andar: passeio.andar, andares: projeto.B ? 2 : 1, voando: !!voo } : null; },
  /**
   * Onde está o corte (a ponta da parede vizinha, com o EPS à mostra) NA TELA, quando a câmera já entrou:
   * { x, y } em px do navegador, ou null (câmera andando / casa fechada).
   */
  pontoCorte() {
    if (!interior || interior.volta || agora() - interior.t0 < DUR_CAMERA || !interior.muro) return null;
    const m = interior.muro;
    if (interior.para && interior.para.corte) _proj.copy(interior.para.corte);
    else {
      // sem parede interna no corte: a ponta da parede vizinha (canto da abertura)
      const [nx, nz] = normalDe(m);
      _proj.set((m.eixo === "x" ? m.ini : m.fixo) - nx * BE * 1.5, m.y0 + 1.6, (m.eixo === "x" ? m.fixo : m.ini) - nz * BE * 1.5);
    }
    _proj.project(camera);
    if (_proj.z > 1) return null;
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((_proj.x + 1) / 2) * r.width, y: r.top + ((1 - _proj.y) / 2) * r.height };
  },
  /** fn({ dentro, removidas }) quando a câmera entra/sai da casa */
  aoInterior(fn) { ouvinteInterior = fn; },
  /** troca a casa ("simples" | "media" | "casarao") mantendo o ponto da rolagem */
  tipo(id) {
    if (id === tipoAtual || !PROJETOS[id]) return;
    const estavaDentro = !!interior || fora.size > 0;
    if (foco || (voo && voo.ponto)) { voltarPonto(); saidaFoco = null; } // trocou de casa: sai do ponto / do tour
    destaque = null;
    montar(id);
    passeio = null;
    zoomUser = 1;
    if (estavaDentro && ouvinteInterior) ouvinteInterior({ dentro: false, removidas: 0 }); // casa nova: começa por fora
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

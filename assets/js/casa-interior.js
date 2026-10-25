/**
 * Interior e cenário das casas de Blocão (usado pelo casa3d.js).
 * - mobiliar(): móveis, eletros, quadros, portas internas e luminárias de cada cômodo — visível só com a casa aberta
 *   (o drone dentro dela); tudo em caixas low-poly, no mesmo estilo da maquete.
 * - escada(): escada de concreto com piso de madeira e guarda-corpo de vidro (casas de 2 andares).
 * - cenario(): o que se vê pelas janelas — gramado até o horizonte, morros, árvores, casas vizinhas, rua e céu.
 * - garagem(): carro na garagem coberta (fica na maquete também).
 * Convenção dos móveis: origem no chão, no meio da peça; a FRENTE olha pra +z local; rot = giro em y (rad).
 */
import {
  BoxGeometry, CanvasTexture, Color, Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshStandardMaterial,
  Object3D, PlaneGeometry, SRGBColorSpace,
} from "../vendor/three-imperio.min.js";
import { comFoto, LADO, texturasLigadas, uvNaCaixa } from "./texturas.js?v=20261104e";

const R90 = Math.PI / 2;
let M = null;

function mat(cor, extra = {}) { return new MeshStandardMaterial({ color: cor, roughness: 0.75, ...extra }); }

function tela(w, h, desenhar) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  desenhar(c.getContext("2d"), w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** quadros abstratos (3 estilos), feitos na hora em canvas — sem baixar imagem */
function texQuadro(v) {
  const paletas = [["#1f3a5f", "#e9c46a", "#f4a261", "#e76f51", "#f1ece2"], ["#2a9d8f", "#264653", "#e9c46a", "#fefae0", "#d4a373"], ["#3d405b", "#e07a5f", "#f2cc8f", "#81b29a", "#f4f1de"]];
  const P = paletas[v % 3];
  return tela(256, 320, (g, w, h) => {
    g.fillStyle = P[4];
    g.fillRect(0, 0, w, h);
    if (v % 3 === 0) { // formas geométricas
      g.fillStyle = P[0]; g.fillRect(24, 40, 130, 170);
      g.fillStyle = P[1]; g.beginPath(); g.arc(170, 200, 62, 0, Math.PI * 2); g.fill();
      g.fillStyle = P[3]; g.fillRect(90, 230, 140, 46);
    } else if (v % 3 === 1) { // paisagem (sol, morros)
      g.fillStyle = P[2]; g.beginPath(); g.arc(180, 90, 38, 0, Math.PI * 2); g.fill();
      g.fillStyle = P[0]; g.beginPath(); g.moveTo(0, 230); g.quadraticCurveTo(90, 140, 256, 210); g.lineTo(256, 320); g.lineTo(0, 320); g.fill();
      g.fillStyle = P[1]; g.beginPath(); g.moveTo(0, 270); g.quadraticCurveTo(140, 200, 256, 280); g.lineTo(256, 320); g.lineTo(0, 320); g.fill();
    } else { // faixas
      for (let i = 0; i < 6; i++) { g.fillStyle = P[i % 4]; g.fillRect(0, 30 + i * 46, w, 30 + (i % 2) * 10); }
    }
  });
}

function materiais() {
  if (M) return M;
  M = {
    branco: mat("#f6f5f1", { roughness: 0.6 }),
    ceramica: mat("#ffffff", { roughness: 0.25 }),
    preto: mat("#1d1e20", { roughness: 0.4 }),
    tela: mat("#0d1420", { roughness: 0.2, emissive: new Color("#1b2d4a"), emissiveIntensity: 0.35 }),
    inox: mat("#c9cdd1", { roughness: 0.3, metalness: 0.6 }),
    pedra: mat("#3b3a38", { roughness: 0.35 }),
    madeiraClara: mat("#caa57a", { roughness: 0.6 }),
    madeiraEscura: mat("#6b4a33", { roughness: 0.6 }),
    tecidoCinza: mat("#8d9298", { roughness: 0.95 }),
    tecidoAzul: mat("#4c6283", { roughness: 0.95 }),
    tecidoBege: mat("#ddd2bd", { roughness: 0.95 }),
    tecidoVerde: mat("#6f8b6a", { roughness: 0.95 }),
    colchao: mat("#fbfaf6", { roughness: 0.9 }),
    tapete: mat("#b8a68b", { roughness: 1 }),
    tapete2: mat("#8b9aa6", { roughness: 1 }),
    vidro: new MeshStandardMaterial({ color: "#cfe3ea", roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false }),
    folha: mat("#4f7a46", { roughness: 0.9, flatShading: true }),
    vaso: mat("#b5654a", { roughness: 0.8 }),
    luz: new MeshStandardMaterial({ color: "#fff6e0", emissive: new Color("#ffe2a8"), emissiveIntensity: 0.9 }),
    espelho: mat("#cfd8dc", { roughness: 0.05, metalness: 0.9 }),
    quadros: [0, 1, 2].map((v) => new MeshStandardMaterial({ map: texQuadro(v), roughness: 0.8 })),
    moldura: mat("#2b2724", { roughness: 0.5 }),
    // cenário
    gramado: mat("#8ea36f", { roughness: 1 }),
    morro: mat("#7e9a76", { roughness: 1, flatShading: true }),
    morroLonge: mat("#a8bba6", { roughness: 1, flatShading: true }),
    asfalto: mat("#55575a", { roughness: 0.95 }),
    calcada: mat("#cfcac0", { roughness: 0.95 }),
    flores: [mat("#d9485f"), mat("#f2c14e"), mat("#e58fb4"), mat("#ffffff")],
    vizinha: mat("#ece6dc", { roughness: 0.85 }),
    vizinhaTelhado: mat("#9c5b45", { roughness: 0.8 }),
    carro: mat("#2f5d8a", { roughness: 0.35, metalness: 0.4 }),
    carroVidro: mat("#1c2a33", { roughness: 0.1, metalness: 0.3 }),
    pneu: mat("#151515", { roughness: 0.9, flatShading: true }),
    farol: new MeshStandardMaterial({ color: "#fffbe8", emissive: new Color("#fff3c4"), emissiveIntensity: 0.6 }),
    lanterna: new MeshStandardMaterial({ color: "#a01818", emissive: new Color("#7a0d0d"), emissiveIntensity: 0.5 }),
  };
  // fotos realistas (texturas.js; aparelho fraco fica com a cor lisa). Tecido, tapete e folha: a foto é cinza e
  // a cor de cada material dá o tom
  comFoto(M.branco, "reboco", { cor: "#fbfaf6", relevo: 0.25, rugosidade: 0.7 });
  comFoto(M.madeiraClara, "madeira-clara", { rugosidade: 0.7 });
  comFoto(M.madeiraEscura, "madeira-clara", { cor: "#8a6448", rugosidade: 0.7 });
  comFoto(M.moldura, "madeira-clara", { cor: "#4a3a30", rugosidade: 0.6 });
  for (const t of [M.tecidoCinza, M.tecidoAzul, M.tecidoBege, M.tecidoVerde, M.colchao]) comFoto(t, "tecido", { manterCor: true, relevo: 0.6 });
  for (const t of [M.tapete, M.tapete2]) comFoto(t, "tapete", { manterCor: true, relevo: 0.8 });
  comFoto(M.pedra, "granito", { rugosidade: 0.4 });
  comFoto(M.folha, "folhagem", { manterCor: true });
  comFoto(M.gramado, "grama", { cor: "#c3cca9" });
  for (const t of [M.morro, M.morroLonge]) comFoto(t, "grama", { manterCor: true, rep: 4 });
  comFoto(M.asfalto, "asfalto", { cor: "#d8d8d8" });
  comFoto(M.calcada, "calcada", { cor: "#f2efe9" });
  comFoto(M.vizinha, "reboco", { manterCor: true, relevo: 0.4 });
  comFoto(M.vizinhaTelhado, "telha", { cor: "#e6d2c4" });
  return M;
}

/* ---------- peças ---------- */
function cx(g, w, h, d, m, x, y, z, ry = 0) {
  const b = new Mesh(uvNaCaixa(new BoxGeometry(w, h, d), m), m);
  b.position.set(x, y, z);
  b.rotation.y = ry;
  b.castShadow = false;
  b.receiveShadow = true;
  g.add(b);
  return b;
}
function bola(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) {
  const b = new Mesh(new IcosahedronGeometry(r, 1), m);
  b.position.set(x, y, z);
  b.scale.set(sx, sy, sz);
  g.add(b);
  return b;
}

const MOVEIS = {
  cama(g, o = {}) {
    const w = o.solteiro ? 0.95 : 1.6;
    const tec = { verde: M.tecidoVerde, bege: M.tecidoBege }[o.tecido] || M.tecidoAzul;
    cx(g, w + 0.08, 0.3, 2.05, M.madeiraClara, 0, 0.15, 0);
    cx(g, w, 0.24, 1.98, M.colchao, 0, 0.42, 0.02);
    cx(g, w + 0.02, 0.06, 1.2, tec, 0, 0.55, 0.4); // manta
    cx(g, w + 0.24, 1.05, 0.08, M.madeiraEscura, 0, 0.52, -1.04); // cabeceira
    const n = o.solteiro ? 1 : 2;
    for (let i = 0; i < n; i++) cx(g, o.solteiro ? 0.6 : 0.62, 0.14, 0.38, M.colchao, n === 1 ? 0 : (i ? 0.38 : -0.38), 0.6, -0.72);
  },
  criado(g) {
    cx(g, 0.46, 0.5, 0.4, M.madeiraClara, 0, 0.25, 0);
    cx(g, 0.16, 0.3, 0.16, M.luz, 0, 0.66, 0); // abajur
  },
  armario(g, o = {}) {
    const w = o.w || 1.8;
    cx(g, w, 2.2, 0.6, M.madeiraClara, 0, 1.1, 0);
    const portas = Math.max(2, Math.round(w / 0.6));
    for (let i = 1; i < portas; i++) cx(g, 0.012, 2.1, 0.01, M.madeiraEscura, -w / 2 + (w / portas) * i, 1.1, 0.305);
    for (let i = 0; i < portas; i++) cx(g, 0.02, 0.35, 0.03, M.inox, -w / 2 + (w / portas) * (i + 0.5) + (i % 2 ? -0.08 : 0.08), 1.15, 0.32);
  },
  sofa(g, o = {}) {
    const w = o.w || 2.2;
    const t = M.tecidoCinza;
    cx(g, w, 0.42, 0.95, t, 0, 0.21, 0);
    cx(g, w, 0.5, 0.22, t, 0, 0.6, -0.36);
    [-1, 1].forEach((s) => cx(g, 0.2, 0.62, 0.95, t, s * (w / 2 - 0.1), 0.31, 0));
    const n = Math.round(w / 0.75);
    for (let i = 0; i < n; i++) cx(g, w / n - 0.06, 0.12, 0.62, M.tecidoBege, -w / 2 + (w / n) * (i + 0.5), 0.47, 0.06);
  },
  rackTv(g, o = {}) {
    const w = o.w || 1.8;
    cx(g, w, 0.45, 0.42, M.madeiraEscura, 0, 0.225, 0);
    cx(g, 1.35, 0.78, 0.05, M.preto, 0, 1.1, -0.12);
    cx(g, 1.3, 0.73, 0.01, M.tela, 0, 1.1, -0.092);
  },
  mesaCentro(g) {
    cx(g, 1.0, 0.06, 0.55, M.madeiraClara, 0, 0.4, 0);
    cx(g, 0.9, 0.36, 0.45, M.preto, 0, 0.19, 0);
  },
  tapete(g, o = {}) { cx(g, o.w || 2.4, 0.012, o.d || 1.7, o.cor === "azul" ? M.tapete2 : M.tapete, 0, 0.006, 0); },
  mesaJantar(g, o = {}) {
    const w = o.w || 1.6;
    const lugares = o.lugares || 4;
    cx(g, w, 0.05, 0.9, M.madeiraEscura, 0, 0.75, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cx(g, 0.06, 0.73, 0.06, M.preto, a * (w / 2 - 0.1), 0.365, b * 0.35));
    const porLado = lugares / 2;
    for (let i = 0; i < porLado; i++) {
      const x = -w / 2 + (w / porLado) * (i + 0.5);
      [-1, 1].forEach((s) => {
        cx(g, 0.44, 0.05, 0.44, M.tecidoBege, x, 0.46, s * 0.62);
        cx(g, 0.44, 0.5, 0.05, M.madeiraEscura, x, 0.72, s * 0.83);
        cx(g, 0.04, 0.44, 0.04, M.preto, x - 0.18, 0.22, s * 0.62);
        cx(g, 0.04, 0.44, 0.04, M.preto, x + 0.18, 0.22, s * 0.62);
      });
    }
    cx(g, 0.22, 0.25, 0.22, M.vaso, 0, 0.9, 0); // vaso de flor
    bola(g, 0.18, M.flores[0], 0, 1.1, 0);
  },
  cozinha(g, o = {}) {
    const w = o.w || 2.4;
    cx(g, w, 0.86, 0.6, M.branco, 0, 0.43, 0); // armários de baixo
    cx(g, w + 0.02, 0.04, 0.62, M.pedra, 0, 0.88, 0.01); // bancada
    for (let i = 1; i < Math.floor(w / 0.6); i++) cx(g, 0.01, 0.78, 0.01, M.inox, -w / 2 + i * 0.6, 0.43, 0.302);
    cx(g, 0.55, 0.02, 0.4, M.inox, w * 0.18, 0.905, 0.02); // pia
    cx(g, 0.04, 0.3, 0.04, M.inox, w * 0.18, 1.05, -0.2); // torneira
    cx(g, 0.6, 0.02, 0.5, M.preto, -w * 0.22, 0.905, 0.02); // cooktop
    [[-0.12, -0.1], [0.12, -0.1], [-0.12, 0.12], [0.12, 0.12]].forEach(([a, b]) => cx(g, 0.12, 0.005, 0.12, M.pedra, -w * 0.22 + a, 0.918, 0.02 + b));
    if (o.micro !== false) cx(g, 0.5, 0.3, 0.38, M.preto, w / 2 - 0.35, 1.05, -0.08); // micro-ondas
    if (o.alto !== false) {
      cx(g, w, 0.7, 0.35, M.branco, 0, 1.85, -0.125); // armários de cima
      cx(g, 0.7, 0.35, 0.36, M.inox, -w * 0.22, 1.55, -0.12); // coifa
    }
  },
  ilha(g, o = {}) {
    const w = o.w || 2.0;
    cx(g, w, 0.88, 0.9, M.madeiraEscura, 0, 0.44, 0);
    cx(g, w + 0.2, 0.04, 1.0, M.pedra, 0, 0.9, 0);
    for (let i = 0; i < 3; i++) {
      cx(g, 0.36, 0.05, 0.36, M.tecidoCinza, -w / 3 + (w / 3) * i, 0.7, 0.75);
      cx(g, 0.05, 0.68, 0.05, M.preto, -w / 3 + (w / 3) * i, 0.34, 0.75);
    }
  },
  geladeira(g) {
    cx(g, 0.78, 1.85, 0.72, M.inox, 0, 0.925, 0);
    cx(g, 0.76, 0.012, 0.01, M.preto, 0, 1.25, 0.362);
    cx(g, 0.03, 0.5, 0.03, M.preto, 0.3, 1.5, 0.38);
    cx(g, 0.03, 0.3, 0.03, M.preto, 0.3, 0.95, 0.38);
  },
  lavadora(g) {
    cx(g, 0.6, 0.85, 0.6, M.ceramica, 0, 0.425, 0);
    const p = bola(g, 0.2, M.preto, 0, 0.46, 0.3, 1, 1, 0.12);
    p.rotation.x = 0;
    cx(g, 0.5, 0.08, 0.02, M.inox, 0, 0.78, 0.305);
  },
  vaso(g) { // vaso sanitário
    cx(g, 0.38, 0.4, 0.55, M.ceramica, 0, 0.2, 0.05);
    cx(g, 0.4, 0.06, 0.6, M.ceramica, 0, 0.42, 0.05);
    cx(g, 0.42, 0.4, 0.18, M.ceramica, 0, 0.62, -0.25); // caixa acoplada
  },
  pia(g, o = {}) {
    const w = o.w || 0.9;
    cx(g, w, 0.5, 0.48, M.madeiraClara, 0, 0.6, 0);
    cx(g, w, 0.04, 0.5, M.ceramica, 0, 0.87, 0);
    cx(g, 0.42, 0.12, 0.34, M.ceramica, 0, 0.93, 0.02); // cuba
    cx(g, 0.03, 0.22, 0.03, M.inox, 0, 1.0, -0.2);
    cx(g, w * 0.85, 0.75, 0.02, M.espelho, 0, 1.55, -0.24); // espelho
  },
  box(g, o = {}) { // box de vidro + chuveiro (cantos em -x/-z)
    const w = o.w || 0.9;
    cx(g, w, 0.04, w, M.ceramica, 0, 0.02, 0);
    cx(g, w, 1.95, 0.012, M.vidro, 0, 1.0, w / 2);
    cx(g, 0.012, 1.95, w, M.vidro, w / 2, 1.0, 0);
    cx(g, 0.22, 0.03, 0.22, M.inox, 0, 2.05, -w / 2 + 0.2);
    cx(g, 0.03, 0.3, 0.03, M.inox, 0, 2.2, -w / 2 + 0.2);
  },
  escrivaninha(g) {
    cx(g, 1.2, 0.04, 0.6, M.madeiraClara, 0, 0.75, 0);
    cx(g, 0.04, 0.73, 0.56, M.branco, -0.58, 0.365, 0);
    cx(g, 0.04, 0.73, 0.56, M.branco, 0.58, 0.365, 0);
    cx(g, 0.55, 0.33, 0.03, M.preto, 0, 1.0, -0.18);
    cx(g, 0.52, 0.3, 0.01, M.tela, 0, 1.0, -0.163);
    cx(g, 0.46, 0.06, 0.46, M.tecidoCinza, 0, 0.48, 0.55); // cadeira
    cx(g, 0.46, 0.5, 0.05, M.tecidoCinza, 0, 0.75, 0.78);
    cx(g, 0.06, 0.45, 0.06, M.preto, 0, 0.23, 0.55);
  },
  estante(g, o = {}) {
    const w = o.w || 1.2;
    cx(g, w, 2.0, 0.35, M.madeiraEscura, 0, 1.0, 0);
    for (let i = 0; i < 4; i++) {
      cx(g, w - 0.08, 0.36, 0.02, M.madeiraClara, 0, 0.3 + i * 0.46, 0.17);
      for (let k = 0; k < 5; k++) cx(g, 0.05, 0.25 + ((k * 7 + i) % 3) * 0.04, 0.22, [M.tecidoAzul, M.vaso, M.tecidoVerde, M.branco][(k + i) % 4], -w / 2 + 0.15 + k * 0.1, 0.27 + i * 0.46, 0.04);
    }
  },
  planta(g, o = {}) {
    const s = o.s || 1;
    cx(g, 0.34 * s, 0.4 * s, 0.34 * s, M.vaso, 0, 0.2 * s, 0);
    bola(g, 0.38 * s, M.folha, 0, 0.75 * s, 0, 1, 1.25, 1);
  },
  poltrona(g, o = {}) {
    const t = M.tecidoVerde;
    cx(g, 0.85, 0.42, 0.85, t, 0, 0.21, 0);
    cx(g, 0.85, 0.5, 0.18, t, 0, 0.62, -0.34);
    cx(g, 0.16, 0.6, 0.85, t, -0.35, 0.3, 0);
    cx(g, 0.16, 0.6, 0.85, t, 0.35, 0.3, 0);
  },
  banco(g, o = {}) {
    const w = o.w || 1.4;
    cx(g, w, 0.06, 0.4, M.madeiraClara, 0, 0.45, 0);
    cx(g, 0.06, 0.42, 0.36, M.preto, -w / 2 + 0.1, 0.21, 0);
    cx(g, 0.06, 0.42, 0.36, M.preto, w / 2 - 0.1, 0.21, 0);
  },
};

/** quadro na parede: (x, z) na FACE da parede, rot = pra onde ele olha */
function quadro(g, x, y, z, rot, w, h, v) {
  const q = new Group();
  cx(q, w + 0.06, h + 0.06, 0.03, M.moldura, 0, 0, 0);
  const t = new Mesh(new PlaneGeometry(w, h), M.quadros[v % 3]);
  t.position.z = 0.017;
  q.add(t);
  q.position.set(x, y, z);
  q.rotation.y = rot;
  g.add(q);
}

/** luminária de teto (disco de luz) */
function luminaria(g, x, y, z) { cx(g, 0.5, 0.03, 0.5, M.luz, x, y - 0.015, z); }

/** batente + porta aberta em cada vão de porta das paredes internas */
function portasInternas(g, internas, yPiso, BE) {
  (internas || []).forEach(([eixo, fixo, , , vaos]) => {
    vaos.filter((v) => v.f0 === 0).forEach((v) => {
      const larg = v.b - v.a;
      const alt = v.f1 * 0.5;
      const meio = (v.a + v.b) / 2;
      const p = new Group();
      // batente (dois montantes + travessa), na espessura da parede
      cx(p, 0.05, alt, BE + 0.04, M.branco, -larg / 2 + 0.025, alt / 2, 0);
      cx(p, 0.05, alt, BE + 0.04, M.branco, larg / 2 - 0.025, alt / 2, 0);
      cx(p, larg, 0.05, BE + 0.04, M.branco, 0, alt - 0.025, 0);
      // folha aberta a 90° (dobradiça no lado "a")
      const folha = cx(p, larg - 0.1, alt - 0.06, 0.035, M.madeiraClara, 0, (alt - 0.06) / 2, 0);
      folha.geometry.translate((larg - 0.1) / 2, 0, 0);
      folha.position.set(-larg / 2 + 0.05, (alt - 0.06) / 2, BE / 2 + 0.02);
      folha.rotation.y = -R90;
      if (eixo === "x") p.position.set(meio, yPiso, fixo);
      else { p.position.set(fixo, yPiso, meio); p.rotation.y = R90; }
      g.add(p);
    });
  });
}

/**
 * Móveis, eletros, quadros, luzes e portas de um projeto. P.mobilia = [[tipo, x, z, rot, andar, opções], ...],
 * P.quadros = [[x, y, z, rot, w, h, estilo, andar], ...], P.luzes = [[x, z, andar], ...].
 */
export function mobiliar(P, pisos, BE, tetos) {
  materiais();
  const g = new Group();
  (P.mobilia || []).forEach(([tipo, x, z, rot, andar, o]) => {
    const peca = new Group();
    MOVEIS[tipo](peca, o || {});
    peca.position.set(x, pisos[andar || 0], z);
    peca.rotation.y = rot || 0;
    g.add(peca);
  });
  (P.quadros || []).forEach(([x, y, z, rot, w, h, v, andar]) => quadro(g, x, pisos[andar || 0] + y, z, rot, w, h, v));
  (P.luzes || []).forEach(([x, z, andar]) => luminaria(g, x, tetos[andar || 0], z));
  portasInternas(g, P.internasA, pisos[0], BE);
  if (P.B) portasInternas(g, P.internasB, pisos[1], BE);
  g.traverse((o) => { if (o.isMesh) o.matrixAutoUpdate = true; });
  return g;
}

/**
 * Escada reta de concreto (degraus maciços brancos + piso de madeira) com corrimão e guarda-corpo de vidro.
 * E = { x0, x1, z0, z1, eixo: "x"|"z", sobe: +1|-1 }; sobe "altura" metros em degraus de ~18 cm.
 */
export function escada(E, yBase, altura, matBranco, matMadeira) {
  materiais();
  const g = new Group();
  const n = Math.round(altura / 0.18);
  const espelho = altura / n;
  const comp = E.eixo === "x" ? E.x1 - E.x0 : E.z1 - E.z0;
  const larg = E.eixo === "x" ? E.z1 - E.z0 : E.x1 - E.x0;
  const piso = comp / n;
  for (let i = 0; i < n; i++) {
    const h = espelho * (i + 1);
    const t = (E.sobe > 0 ? i : n - 1 - i) * piso + piso / 2; // posição ao longo da escada
    const cxs = E.eixo === "x" ? [E.x0 + t, (E.z0 + E.z1) / 2] : [(E.x0 + E.x1) / 2, E.z0 + t];
    const dims = E.eixo === "x" ? [piso, h, larg] : [larg, h, piso];
    cx(g, dims[0], dims[1], dims[2], matBranco, cxs[0], yBase + h / 2, cxs[1]);
    const dimsM = E.eixo === "x" ? [piso + 0.01, 0.03, larg] : [larg, 0.03, piso + 0.01];
    cx(g, dimsM[0], dimsM[1], dimsM[2], matMadeira, cxs[0], yBase + h + 0.015, cxs[1]);
  }
  // guarda-corpo de vidro no lado aberto, inclinado junto com a escada (em painéis por degrau, escalonados)
  const lado = E.aberto; // { x } ou { z } do lado aberto
  if (lado) {
    for (let i = 0; i < n; i += 2) {
      const h = espelho * (i + 1);
      const t = (E.sobe > 0 ? i : n - 1 - i) * piso + piso;
      const c = E.eixo === "x" ? [E.x0 + t, lado.z] : [lado.x, E.z0 + t];
      const d = E.eixo === "x" ? [piso * 2, 0.95, 0.015] : [0.015, 0.95, piso * 2];
      cx(g, d[0], d[1], d[2], M.vidro, c[0], yBase + h + 0.5, c[1]);
      const dr = E.eixo === "x" ? [piso * 2, 0.04, 0.05] : [0.05, 0.04, piso * 2];
      cx(g, dr[0], dr[1], dr[2], M.preto, c[0], yBase + h + 0.98, c[1]);
    }
  }
  return g;
}

/** guarda-corpo de vidro em volta do vão da escada no andar de cima: linhas [[x0, z0, x1, z1], ...] */
export function guardaCorpo(linhas, y) {
  materiais();
  const g = new Group();
  linhas.forEach(([x0, z0, x1, z1]) => {
    const L = Math.hypot(x1 - x0, z1 - z0);
    const rot = Math.atan2(-(z1 - z0), x1 - x0);
    cx(g, L, 1.0, 0.015, M.vidro, (x0 + x1) / 2, y + 0.5, (z0 + z1) / 2, rot);
    cx(g, L, 0.04, 0.05, M.preto, (x0 + x1) / 2, y + 1.02, (z0 + z1) / 2, rot);
  });
  return g;
}

/** carro low-poly (frente pra +z) + garagem coberta (pérgola de laje fina em 4 pilares) + piso */
export function garagem(G, matBranco, matGrafite, matPedra) {
  materiais();
  const g = new Group();
  cx(g, 2.9, 0.03, 5.6, matPedra, 0, 0.035, 0);
  [[-1.3, -2.6], [1.3, -2.6], [-1.3, 2.6], [1.3, 2.6]].forEach(([x, z]) => cx(g, 0.12, 2.45, 0.12, matGrafite, x, 1.24, z));
  cx(g, 3.0, 0.12, 5.7, matBranco, 0, 2.5, 0);
  const c = new Group();
  cx(c, 1.82, 0.55, 4.3, M.carro, 0, 0.52, 0);
  cx(c, 1.6, 0.48, 2.3, M.carroVidro, 0, 1.02, -0.25);
  cx(c, 1.62, 0.06, 2.1, M.carro, 0, 1.28, -0.25);
  [[-0.92, 1.35], [0.92, 1.35], [-0.92, -1.35], [0.92, -1.35]].forEach(([x, z]) => {
    const r = bola(c, 0.34, M.pneu, x, 0.34, z, 0.55, 1, 1);
    r.rotation.z = 0;
  });
  cx(c, 0.32, 0.12, 0.04, M.farol, -0.6, 0.62, 2.16);
  cx(c, 0.32, 0.12, 0.04, M.farol, 0.6, 0.62, 2.16);
  cx(c, 0.36, 0.1, 0.04, M.lanterna, -0.62, 0.66, -2.16);
  cx(c, 0.36, 0.1, 0.04, M.lanterna, 0.62, 0.66, -2.16);
  c.position.z = -0.3;
  g.add(c);
  g.position.set(G.x, 0, G.z);
  g.rotation.y = G.rot || 0;
  return g;
}

/** céu: degradê (vira o fundo da cena quando o drone está dentro da casa) */
export function texCeu() {
  return tela(16, 512, (g, w, h) => {
    const d = g.createLinearGradient(0, 0, 0, h);
    d.addColorStop(0, "#5f9fd6");
    d.addColorStop(0.55, "#a9cfe9");
    d.addColorStop(0.8, "#e6eff2");
    d.addColorStop(1, "#f3efe4");
    g.fillStyle = d;
    g.fillRect(0, 0, w, h);
  });
}

/**
 * Junta todas as malhas de um grupo que usam o MESMO material numa malha só (centenas de caixinhas viram ~20
 * desenhos): o celular desenha os móveis e a paisagem sem engasgar. Malhas instanciadas ficam como estão.
 */
export function fundirPorMaterial(g) {
  g.updateMatrixWorld(true);
  const Geo = Object.getPrototypeOf(BoxGeometry.prototype).constructor; // BufferGeometry
  const porMat = new Map();
  const manter = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh || o.userData.manter) { manter.push(o); return; }
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    if (!porMat.has(o.material)) porMat.set(o.material, []);
    porMat.get(o.material).push(geo);
  });
  const saida = new Group();
  porMat.forEach((geos, material) => {
    let n = 0;
    geos.forEach((q) => { n += q.attributes.position.count; });
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    let k = 0;
    geos.forEach((q) => {
      const c = q.attributes.position.count;
      pos.set(q.attributes.position.array, k * 3);
      if (q.attributes.normal) nor.set(q.attributes.normal.array, k * 3);
      if (q.attributes.uv) uv.set(q.attributes.uv.array, k * 2);
      k += c;
      q.dispose();
    });
    const A = geos[0].attributes.position.constructor;
    const m = new Geo();
    m.setAttribute("position", new A(pos, 3));
    m.setAttribute("normal", new A(nor, 3));
    m.setAttribute("uv", new A(uv, 2));
    m.computeBoundingSphere();
    const malha = new Mesh(m, material);
    malha.receiveShadow = true;
    saida.add(malha);
  });
  manter.forEach((o) => {
    o.updateMatrixWorld(true);
    o.matrixWorld.decompose(o.position, o.quaternion, o.scale);
    saida.add(o);
  });
  return saida;
}

/**
 * Paisagem em volta (só aparece com o drone dentro: é o que se vê pela janela). Fica fora da base da maquete.
 * base = { x, z, cz } (tamanho da base), frente = z da frente da varanda.
 */
export function cenario(base, frente, cxCasa) {
  materiais();
  const g = new Group();
  // céu: degradê em CSS atrás do canvas (.casa__ceu) — uma esfera 3D do tamanho da tela pesava no celular
  // gramado até o horizonte (um pouco abaixo da grama da maquete)
  const matChao = M.gramado.clone();
  matChao.transparent = true;
  matChao.opacity = 0;
  matChao.depthWrite = false;
  const chao = new Mesh(new PlaneGeometry(700, 700), matChao);
  chao.rotation.x = -R90;
  chao.position.set(cxCasa, -0.01, base.cz);
  chao.renderOrder = -5;
  chao.userData.manter = true;
  chao.visible = false; // fundo branco: o gramado até o horizonte saiu (cor só em volta da casa)
  g.add(chao);
  // o resto (gramado em volta, árvores ao fundo, canteiros) "brota" do chão quando a casa fica pronta.
  // fundo branco e leve: cor só em volta da casa (gramado que some em degradê) e poucas árvores lá atrás
  const relevo = new Group();
  g.add(relevo);
  const raioGrama = Math.max(base.x, base.z) * 0.5 + 7;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const cx2 = cv.getContext("2d");
  const grad = cx2.createRadialGradient(64, 64, 20, 64, 64, 64);
  grad.addColorStop(0, "rgba(160,178,112,1)");
  grad.addColorStop(0.7, "rgba(178,192,138,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  cx2.fillStyle = grad;
  cx2.fillRect(0, 0, 128, 128);
  const tGrama = new CanvasTexture(cv);
  tGrama.colorSpace = SRGBColorSpace;
  const matGrama = mat("#ffffff", { map: tGrama, transparent: true, depthWrite: false, roughness: 1 });
  if (texturasLigadas()) {
    // com foto: a grama de verdade no lugar do degradê, que vira só a transparência da borda (alphaMap)
    const cvA = document.createElement("canvas");
    cvA.width = cvA.height = 128;
    const ga = cvA.getContext("2d");
    const gradA = ga.createRadialGradient(64, 64, 20, 64, 64, 64);
    gradA.addColorStop(0, "#fff");
    gradA.addColorStop(0.5, "#999");
    gradA.addColorStop(1, "#000");
    ga.fillStyle = gradA;
    ga.fillRect(0, 0, 128, 128);
    matGrama.alphaMap = new CanvasTexture(cvA);
    comFoto(matGrama, "grama", { cor: "#c3cca9", rep: (raioGrama * 2) / LADO.grama });
  }
  const grama = new Mesh(new PlaneGeometry(raioGrama * 2, raioGrama * 2), matGrama);
  grama.rotation.x = -R90;
  grama.position.set(cxCasa, 0.005, base.cz);
  grama.renderOrder = -4;
  grama.userData.manter = true;
  relevo.add(grama);
  // poucas árvores, longe (no fundo branco), instanciadas: 2 desenhos só
  const sorte = ((sm) => () => { sm = (sm * 16807) % 2147483647; return sm / 2147483647; })(7);
  const pos = [];
  while (pos.length < 12) {
    const a = sorte() * Math.PI * 2;
    const r = raioGrama + 4 + sorte() * 26;
    pos.push([cxCasa + Math.cos(a) * r, base.cz + Math.sin(a) * r, 0.8 + sorte() * 0.9]);
  }
  const troncos = new InstancedMesh(new BoxGeometry(0.22, 1, 0.22), comFoto(mat("#8a7a6c", { roughness: 1 }), "casca", { manterCor: true, uv: false }), pos.length);
  const copas = new InstancedMesh(new IcosahedronGeometry(1, 1), comFoto(mat("#ffffff", { roughness: 0.9 }), "folhagem", { manterCor: true, uv: false }), pos.length);
  const o = new Object3D();
  // a = quanto a árvore está de pé (1) ou recolhida no chão (0): some quando fica entre a câmera e a casa
  const plantar = (i, a) => {
    const [x, z, sc] = pos[i];
    const sy = Math.max(0.001, a);
    o.position.set(x, 1.0 * sc * sy, z); o.scale.set(sc, 2 * sc * sy, sc); o.rotation.set(0, 0, 0); o.updateMatrix(); troncos.setMatrixAt(i, o.matrix);
    o.position.set(x, 2.6 * sc * sy, z); o.scale.set(1.4 * sc, 1.8 * sc * sy, 1.4 * sc); o.rotation.set(0, i, 0); o.updateMatrix(); copas.setMatrixAt(i, o.matrix);
  };
  pos.forEach((_, i) => {
    plantar(i, 1);
    // verde bem claro: combina com o fundo branco (com a foto da folhagem por cima, um verde de folha de verdade)
    copas.setColorAt(i, texturasLigadas() ? new Color().setHSL(0.27, 0.32, 0.5 + (i % 4) * 0.04) : new Color().setHSL(0.26, 0.16, 0.62 + (i % 4) * 0.04));
  });
  relevo.add(troncos, copas);
  const vizinhas = [];
  // canteiros floridos na beira da base
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const x = cxCasa - base.x / 2 + 0.6 + t * (base.x - 1.2);
    bola(relevo, 0.22, M.flores[i % 4], x, 0.2, base.cz + base.z / 2 - 0.5, 1, 0.8, 1);
    if (i % 2) bola(relevo, 0.35, M.folha, x + 0.2, 0.25, base.cz - base.z / 2 + 0.6, 1, 0.8, 1);
  }
  // junta tudo do relevo por material (poucos desenhos) e deixa os instanciados como estão
  const fundido = fundirPorMaterial(relevo);
  g.remove(relevo);
  g.add(fundido);
  vizinhas.forEach((v) => fundido.add(v.g));
  g.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
  /** k = 0..1: céu e gramado aparecem, o resto brota do chão */
  g.userData.surgir = (k) => {
    matChao.opacity = 0;
    fundido.scale.y = Math.max(0.001, k);
    fundido.visible = k > 0.01;
  };
  /**
   * vista livre pro drone: o que fica entre a câmera e a casa (vizinha, árvore) abaixa até o chão, e volta
   * quando a câmera passa — a maquete nunca fica escondida, em nenhum ângulo do giro.
   * (ux, uz) = direção horizontal do centro da casa até a câmera; k = 0 desliga (tudo de pé)
   */
  const cz = base.cz;
  const meia = Math.hypot(base.x, base.z) / 2;
  const suav = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const dePe = (x, z, r, ux, uz, k) => {
    const dx = x - cxCasa;
    const dz = z - cz;
    const ao = dx * ux + dz * uz;                 // quanto está pro lado da câmera
    const lado = Math.abs(dx * uz - dz * ux);     // quanto está fora da linha câmera → casa
    const bloqueia = (1 - suav(meia + r, meia + r + 6, lado)) * suav(-2, meia * 0.6, ao);
    return 1 - bloqueia * k;
  };
  let ultimo = "";
  g.userData.vista = (ux, uz, k) => {
    const chave = `${ux.toFixed(3)},${uz.toFixed(3)},${k.toFixed(2)}`;
    if (chave === ultimo) return;
    ultimo = chave;
    vizinhas.forEach((v) => { v.g.scale.y = Math.max(0.001, dePe(v.x, v.z, v.r, ux, uz, k)); });
    pos.forEach(([x, z, s], i) => plantar(i, dePe(x, z, 1.4 * s, ux, uz, k)));
    troncos.instanceMatrix.needsUpdate = true;
    copas.instanceMatrix.needsUpdate = true;
  };
  return g;
}

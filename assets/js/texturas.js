/**
 * Texturas realistas das maquetes: fotos CC0 da Poly Haven (WebP) em assets/img/texturas.
 * Cada foto tem 3 mapas: -cor, -normal (relevo) e -rugosidade. Usado pelo casa3d.js e pelo casa-interior.js.
 *
 * - comFoto(material, nome, opções): o material JÁ nasce com os mapas (provisórios: a cor média da foto) — o
 *   shader é compilado uma vez só. Quando a foto chega, só a imagem da textura é trocada: sem recompilar, sem
 *   esperar a tela parar (antes as fotos esperavam o tour acabar e, no celular, nunca apareciam).
 * - uvNaCaixa(geo, material): caixa com foto ganha UV em metros — a foto fica no tamanho real em qualquer peça.
 * - carregarTexturas(pronto): baixa as fotos (uma de cada vez na GPU, 1 por quadro) e chama pronto() pra redesenhar.
 * Celular: fotos reduzidas (cor 512, relevo 256) — leve na memória; aparelho fraco: só a cor.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "../vendor/three-imperio.min.js";

// lado real de cada foto (m): a textura repete nesse tamanho
export const LADO = {
  concreto: 3, reboco: 2, madeira: 1.7, porcelanato: 1.5, telha: 2.5, grama: 2, calcada: 1.8,
  "madeira-clara": 1.83, teca: 1, deck: 1.8, tecido: 0.27, tapete: 0.6, granito: 2.3, "pedra-fachada": 2,
  casca: 1, folhagem: 3, asfalto: 3,
};
// cor média e rugosidade média de cada foto: o material já começa no tom certo enquanto a foto não chega
const MEDIA = {
  asfalto: ["#5a5954", 196], calcada: ["#7f7466", 219], casca: ["#5e563f", 230], concreto: ["#afaba3", 138],
  deck: ["#664128", 112], folhagem: ["#c1c1c1", 238], grama: ["#6e9f4e", 174], granito: ["#4d4e4e", 138],
  madeira: ["#9b8063", 96], "madeira-clara": ["#a17e57", 135], "pedra-fachada": ["#5f452f", 209],
  porcelanato: ["#b09d79", 128], reboco: ["#edebe7", 234], tapete: ["#c2c2c2", 207], teca: ["#af8256", 166],
  tecido: ["#d6d6d6", 183], telha: ["#914f2a", 233],
};
const MAPAS = ["cor", "normal", "rugosidade"];

let ligado = false;          // 3D ligado: usa as fotos
let leve = false;            // aparelho fraco: só a foto de cor (relevo e rugosidade pesam no celular antigo)
let ladoMax = [1024, 512, 256]; // tamanho máximo na GPU de cada mapa (cor, relevo, rugosidade)
let carregando = false;
const ladoMat = new Map();   // material → lado da foto (m): as caixas dele ganham UV em metros
const bases = new Map();     // "nome|mapa" → { t: textura, usos: [texturas com a mesma imagem], pronta }
const cache = new Map();     // "nome|mapa|rep" → textura

/** soCor = aparelho fraco; celular = fotos menores na GPU */
export function ligarTexturas(sim, soCor = false, celular = false) {
  ligado = sim;
  leve = soCor;
  if (celular || soCor) ladoMax = [512, 256, 256];
}
export const texturasLigadas = () => ligado;
/** quantas fotos (mapas) já estão na GPU — testes */
export const texturasCarregadas = () => [...bases.values()].filter((b) => b.t.image && b.t.image.width > 4).length;

/** imagem provisória (4 × 4) com a média da foto: cor, relevo liso ou rugosidade média */
function provisoria(nome, mapa) {
  const c = document.createElement("canvas");
  c.width = c.height = 4;
  const g = c.getContext("2d");
  const r = MEDIA[nome][1];
  g.fillStyle = mapa === 0 ? MEDIA[nome][0] : mapa === 1 ? "rgb(128,128,255)" : `rgb(${r},${r},${r})`;
  g.fillRect(0, 0, 4, 4);
  return c;
}

function textura(nome, mapa, rep) {
  const chave = `${nome}|${mapa}|${rep}`;
  if (cache.has(chave)) return cache.get(chave);
  const kb = `${nome}|${mapa}`;
  let b = bases.get(kb);
  if (!b) {
    const t = new CanvasTexture(provisoria(nome, mapa));
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 8;
    if (mapa === 0) t.colorSpace = SRGBColorSpace;
    b = { t, usos: [] };
    bases.set(kb, b);
  }
  // outra repetição = outra textura com a MESMA imagem (a GPU guarda uma vez só)
  const t = b.usos.length ? b.t.clone() : b.t;
  t.repeat.set(rep, rep);
  t.needsUpdate = true;
  b.usos.push(t);
  cache.set(chave, t);
  return t;
}

/**
 * Marca o material pra receber a foto. Opções: cor (tom por cima da foto; manterCor = fica a cor do material),
 * rugosidade, relevo (força do normal), rep (repetição fixa — peças sem UV em metros), porPosicao (k: UV por metro,
 * nas peças instanciadas a foto corre contínua de uma peça pra outra), uv: false (não muda o UV das caixas).
 */
export function comFoto(m, nome, opc = {}) {
  if (!ligado) return m;
  if (opc.uv !== false && !opc.rep) ladoMat.set(m, LADO[nome]);
  const rep = opc.rep || 1;
  m.map = textura(nome, 0, rep);
  if (!leve) {
    m.normalMap = textura(nome, 1, rep);
    m.roughnessMap = textura(nome, 2, rep);
    m.roughness = opc.rugosidade ?? 1;
    if (opc.relevo) m.normalScale.set(opc.relevo, opc.relevo);
  }
  if (!opc.manterCor) m.color.set(opc.cor || "#ffffff");
  if (opc.porPosicao) uvPorPosicao(m, opc.porPosicao);
  m.needsUpdate = true;
  return m;
}

/** UV da caixa em metros ÷ lado da foto */
export function uvMetros(geo, lado) {
  const { width: w, height: h, depth: d } = geo.parameters;
  const uv = geo.attributes.uv;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x, -x, +y, -y, +z, -z
  for (let i = 0; i < uv.count; i++) {
    const [a, b] = faces[Math.floor(i / 4)];
    uv.setXY(i, (uv.getX(i) * a) / lado, (uv.getY(i) * b) / lado);
  }
  uv.needsUpdate = true;
  return geo;
}

/** caixa de um material com foto: UV em metros (lista de materiais: vale o do topo) */
export function uvNaCaixa(geo, mat) {
  const lado = ladoMat.get(Array.isArray(mat) ? mat[2] : mat);
  if (lado && geo.type === "BoxGeometry") uvMetros(geo, lado);
  return geo;
}

/**
 * Peças instanciadas: todas têm o mesmo UV — a foto se repetiria igual em cada uma. Aqui o UV anda junto com a
 * posição da peça: a textura corre contínua de um bloco pro outro. k = unidades de UV por metro na geometria.
 */
function uvPorPosicao(m, k) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
#ifdef USE_INSTANCING
  vec3 eixoU = cross(vec3(0.0, 1.0, 0.0), normal);
  eixoU = length(eixoU) > 0.5 ? normalize(mat3(instanceMatrix) * eixoU) : vec3(1.0, 0.0, 0.0);
  vec3 desl = vec3(dot(instanceMatrix[3].xyz, eixoU), instanceMatrix[3].y, 0.0) * ${k.toFixed(4)};
  #ifdef USE_MAP
    vMapUv += (mapTransform * desl).xy;
  #endif
  #ifdef USE_NORMALMAP
    vNormalMapUv += (normalMapTransform * desl).xy;
  #endif
  #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv += (roughnessMapTransform * desl).xy;
  #endif
#endif`);
  };
  m.customProgramCacheKey = () => `uvPos${k}`;
}

/**
 * Baixa as fotos (uma vez, todas em paralelo). Cada foto que chega entra numa fila: 1 por quadro ela é reduzida
 * pro tamanho do aparelho e trocada na textura (sem recompilar nada) — não trava a rolagem nem o voo do drone.
 * Foto que falhar fica na cor média (as outras aparecem normalmente).
 */
export function carregarTexturas(pronto) {
  if (!ligado || carregando) return;
  carregando = true;
  const base = new URL("../img/texturas/", import.meta.url);
  const ver = new URL(import.meta.url).search;
  const fila = [];
  let rodando = false;
  const passo = () => {
    const item = fila.shift();
    if (!item) { rodando = false; return; }
    const [b, img, max] = item;
    const lado = Math.min(max, img.naturalWidth || max);
    let fonte = img;
    if (lado < img.naturalWidth) { // reduz no canvas (celular: 4× menos memória de GPU)
      fonte = document.createElement("canvas");
      fonte.width = fonte.height = lado;
      fonte.getContext("2d").drawImage(img, 0, 0, lado, lado);
    }
    b.t.image = fonte; // a imagem é compartilhada por todas as repetições dessa foto
    b.usos.forEach((t) => { t.needsUpdate = true; });
    pronto();
    requestAnimationFrame(passo);
  };
  const mapas = leve ? [0] : [0, 1, 2];
  for (const nome of Object.keys(LADO)) {
    for (const mapa of mapas) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const b = bases.get(`${nome}|${mapa}`) || (textura(nome, mapa, 1) && bases.get(`${nome}|${mapa}`));
        fila.push([b, img, ladoMax[mapa]]);
        if (!rodando) { rodando = true; requestAnimationFrame(passo); }
      };
      img.src = new URL(`${nome}-${MAPAS[mapa]}.webp${ver}`, base).href;
    }
  }
}

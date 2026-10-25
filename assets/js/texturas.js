/**
 * Texturas realistas das maquetes: fotos CC0 da Poly Haven (1K/512, WebP) em assets/img/texturas.
 * Cada foto tem 3 mapas: -cor, -normal (relevo) e -rugosidade. Usado pelo casa3d.js e pelo casa-interior.js.
 *
 * - comFoto(material, nome, opções): o material recebe a foto quando ela chegar (aparelho fraco: só a cor, sem relevo).
 * - uvNaCaixa(geo, material): caixa com foto ganha UV em metros — a foto fica no tamanho real em qualquer peça.
 * - carregarTexturas(): baixa tudo (uma vez) e troca nos materiais num momento parado.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "../vendor/three-imperio.min.js";

// lado real de cada foto (m): a textura repete nesse tamanho
export const LADO = {
  concreto: 3, reboco: 2, madeira: 1.7, porcelanato: 1.5, telha: 2.5, grama: 2, calcada: 1.8,
  "madeira-clara": 1.83, teca: 1, deck: 1.8, tecido: 0.27, tapete: 0.6, granito: 2.3, "pedra-fachada": 2,
  casca: 1, folhagem: 3, asfalto: 3,
};

let ligado = false;          // 3D ligado: usa as fotos
let leve = false;            // aparelho fraco: só a foto de cor (relevo e rugosidade pesam no celular antigo)
let carregando = false;
let fotos = null;            // nome → [cor, normal, rugosidade] (imagens), quando chegaram
const pedidos = [];          // [material, nome, opções]
const ladoMat = new Map();   // material → lado da foto (m): as caixas dele ganham UV em metros
const cache = new Map();     // uma textura por foto/mapa/repetição (a GPU guarda uma vez só)

export function ligarTexturas(sim, soCor = false) { ligado = sim; leve = soCor; }
export const texturasLigadas = () => ligado;

/**
 * Marca o material pra receber a foto. Opções: cor (tom por cima da foto; manterCor = fica a cor do material),
 * rugosidade, relevo (força do normal), rep (repetição fixa — peças sem UV em metros), porPosicao (k: UV por metro,
 * nas peças instanciadas a foto corre contínua de uma peça pra outra), uv: false (não muda o UV das caixas).
 */
export function comFoto(m, nome, opc = {}) {
  if (!ligado) return m;
  if (opc.uv !== false && !opc.rep) ladoMat.set(m, LADO[nome]);
  pedidos.push([m, nome, opc]);
  if (fotos) aplicar(m, nome, opc);
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

function textura(nome, mapa, rep) {
  const chave = `${nome}|${mapa}|${rep}`;
  if (!cache.has(chave)) {
    const t = new CanvasTexture(fotos[nome][mapa]);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(rep, rep);
    t.anisotropy = 8;
    if (mapa === 0) t.colorSpace = SRGBColorSpace;
    cache.set(chave, t);
  }
  return cache.get(chave);
}

function aplicar(m, nome, opc) {
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
}

/**
 * Baixa as fotos (uma vez). quandoParado(fn) chama fn num momento sem voo nem rolagem (trocar os mapas recompila
 * os materiais); pronto() redesenha. Sem alguma foto: tudo fica no canvas de antes.
 */
export function carregarTexturas(quandoParado, pronto) {
  if (!ligado || fotos || carregando) return;
  carregando = true;
  const base = new URL("../img/texturas/", import.meta.url);
  const ver = new URL(import.meta.url).search;
  const imagem = (arq) => {
    const img = new Image();
    img.decoding = "async";
    img.src = new URL(arq + ".webp" + ver, base).href;
    return img.decode().then(() => img);
  };
  const mapas = leve ? ["cor"] : ["cor", "normal", "rugosidade"];
  Promise.all(Object.keys(LADO).map((n) => Promise.all(mapas.map((k) => imagem(`${n}-${k}`))).then((imgs) => [n, imgs])))
    .then((lista) => quandoParado(() => {
      fotos = Object.fromEntries(lista);
      pedidos.forEach(([m, n, o]) => aplicar(m, n, o));
      pronto();
    }))
    .catch(() => { carregando = false; });
}

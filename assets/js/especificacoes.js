/**
 * Especificações de cada peça do Blocão (concreto externo, EPS, concreto interno e o bloco montado):
 * espessura, comprimento × altura e peso.
 *
 * - Espessuras: ficha técnica publicada pela fábrica (config.blocos).
 * - Comprimento × altura: config.medidaBloco (PENDENTE com o Vinicius). Sem ela → "a confirmar".
 * - Peso: config.pesos[id] (pesado na fábrica) tem prioridade. Sem ele, ESTIMA pelo volume × densidade
 *   típica (config.densidades) e marca como estimado. Sem medida da face → "a confirmar".
 *
 * Roda no navegador (window.ImperioEspecificacoes + espessura escolhida pelo visitante) e no Node (testes).
 */
(function (raiz, fabrica) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.ImperioEspecificacoes = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function face(cfg) {
    var m = cfg && cfg.medidaBloco;
    return m && m.largura > 0 && m.altura > 0 ? { comprimento: m.largura, altura: m.altura } : null;
  }

  function peso(volumeM3, densidade) {
    return densidade > 0 ? Math.round(volumeM3 * densidade * 10) / 10 : null;
  }

  /**
   * @returns {{camadas: Array, total: object, face: object|null}}
   *   camada: { chave, nome, espessuraCm, pesoKg|null, estimado:boolean }
   */
  function calcular(bloco, cfg) {
    cfg = cfg || {};
    var f = face(cfg);
    var dens = cfg.densidades || {};
    var informado = (cfg.pesos || {})[bloco.id];
    var area = f ? f.comprimento * f.altura : 0;
    function camada(chave, nome, cm, densidade) {
      return { chave: chave, nome: nome, espessuraCm: cm, pesoKg: f ? peso(area * cm / 100, densidade) : null, estimado: true };
    }
    var camadas = [
      camada("concreto-externo", "Concreto externo", bloco.concreto, dens.concreto),
      camada("eps", "EPS (miolo)", bloco.eps, dens.eps),
      camada("concreto-interno", "Concreto interno", bloco.concreto, dens.concreto),
    ];
    var soma = camadas.every(function (c) { return c.pesoKg !== null; })
      ? Math.round(camadas.reduce(function (s, c) { return s + c.pesoKg; }, 0) * 10) / 10
      : null;
    return {
      face: f,
      camadas: camadas,
      total: {
        espessuraCm: bloco.total,
        pesoKg: informado > 0 ? informado : soma,
        estimado: !(informado > 0),
        blocosPorM2: f ? Math.round((1 / area) * 100) / 100 : null,
      },
    };
  }

  function cm(v) { return String(v).replace(".", ",") + " cm"; }
  function textoFace(f) {
    return f ? cm(Math.round(f.comprimento * 1000) / 10) + " × " + cm(Math.round(f.altura * 1000) / 10) : "a confirmar";
  }
  function textoPeso(kg, estimado) {
    if (kg === null || kg === undefined) return "a confirmar";
    return (estimado ? "≈ " : "") + String(kg).replace(".", ",") + " kg" + (estimado ? " (estimado)" : "");
  }

  return { calcular: calcular, cm: cm, textoFace: textoFace, textoPeso: textoPeso };
});

/* ---------- Interface (só no navegador): espessura escolhida + preenche fichas e etiquetas ---------- */
(function () {
  "use strict";
  if (typeof document === "undefined") return;
  var E = window.ImperioEspecificacoes;
  var cfg = window.IMPERIO_CONFIG || {};
  var ouvintes = [];
  var atual = (cfg.blocos || []).filter(function (b) { return b.id === "b15"; })[0] || (cfg.blocos || [])[0];

  function preencher() {
    if (!atual) return;
    var r = E.calcular(atual, cfg);
    var porChave = {};
    r.camadas.forEach(function (c) { porChave[c.chave] = c; });
    document.querySelectorAll("[data-espec]").forEach(function (el) {
      var chave = el.getAttribute("data-espec");
      var campo = el.getAttribute("data-campo");
      var c = chave === "total" ? r.total : porChave[chave];
      var v = "";
      if (campo === "espessura") v = E.cm(c.espessuraCm);
      else if (campo === "face") v = E.textoFace(r.face);
      else if (campo === "peso") v = E.textoPeso(c.pesoKg, c.estimado);
      else if (campo === "porm2") v = c.blocosPorM2 ? String(c.blocosPorM2).replace(".", ",") + " blocos" : "a confirmar";
      else if (campo === "nome") v = atual.nome;
      el.textContent = v;
      el.classList.toggle("a-confirmar", /a confirmar/.test(v));
    });
    document.querySelectorAll("[data-escolher-espessura]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-escolher-espessura") === atual.id));
    });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-escolher-espessura]");
    if (!b) return;
    var novo = (cfg.blocos || []).filter(function (x) { return x.id === b.getAttribute("data-escolher-espessura"); })[0];
    if (!novo) return;
    atual = novo;
    preencher();
    ouvintes.forEach(function (fn) { fn(atual); });
  });
  document.addEventListener("DOMContentLoaded", preencher);

  window.ImperioEspessura = {
    atual: function () { return atual; },
    aoMudar: function (fn) { ouvintes.push(fn); },
  };
})();

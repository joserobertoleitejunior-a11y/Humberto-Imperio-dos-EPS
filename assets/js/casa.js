/**
 * Seção "Uma casa inteira de Blocão": liga a rolagem vertical à casa 3D (casa3d.js).
 * - O canvas mora DENTRO da parte fixa (sticky) da seção: o navegador move tudo junto com a página.
 * - Só baixa o 3D quando a seção chega perto (1,5 tela antes); no vídeo, já na abertura.
 * - "estatica" ou sem WebGL: fica a imagem pronta da casa (assets/img/casa-blocao.webp) e as etapas em lista.
 * Publica window.ImperioCasa = { pronto(), atualizarAgora() } (usado pela gravação do vídeo).
 */
(function () {
  "use strict";

  var html = document.documentElement;
  var parado = html.getAttribute("data-qualidade") === "estatica";
  var secao = null;
  var palco = null;
  var etapas = [];
  var contador = null;
  var C3 = null;
  var carregando = false;
  var med = null;
  var ultimaEtapa = -1;
  var ultimoCont = -1;
  var ultimoP = -1;

  // limites de cada etapa (iguais ao roteiro do casa3d.js)
  var LIMITES = [0, 0.06, 0.4, 0.47, 0.74, 0.86];

  function limitar(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function temWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  }

  function medir() {
    med = { topo: secao.getBoundingClientRect().top + window.scrollY, altura: secao.offsetHeight };
  }

  function progresso() {
    if (!med) medir();
    var total = med.altura - window.innerHeight;
    return total > 0 ? limitar((window.scrollY - med.topo) / total) : 0;
  }

  function pintar(p) {
    var e = 0;
    for (var i = 0; i < LIMITES.length; i++) if (p >= LIMITES[i]) e = i;
    if (e !== ultimaEtapa) {
      ultimaEtapa = e;
      etapas.forEach(function (li, k) { li.classList.toggle("ativa", k === e); });
    }
    secao.style.setProperty("--ouro", (limitar((p - 0.86) / 0.14)).toFixed(3));
    secao.classList.toggle("casa--pronta", p > 0.93);
  }

  function aoDesenhar(info) {
    if (contador && info.assentados !== ultimoCont) {
      ultimoCont = info.assentados;
      contador.textContent = info.assentados;
    }
  }

  function atualizar() {
    if (!secao || parado) return;
    var p = progresso();
    if (p === ultimoP) return;
    ultimoP = p;
    pintar(p);
    if (C3) C3.progresso(p);
  }

  function iniciar3D() {
    if (carregando || !temWebGL()) return;
    carregando = true;
    var canvas = document.createElement("canvas");
    canvas.className = "casa__canvas";
    canvas.setAttribute("aria-hidden", "true");
    palco.appendChild(canvas);
    import("./casa3d.js?v=20261022a")
      .then(function () { return window.ImperioCasa3D.iniciar(canvas); })
      .then(function () {
        C3 = window.ImperioCasa3D;
        C3.aoDesenhar(aoDesenhar);
        secao.classList.add("casa--3d");
        ultimoP = -1;
        atualizar();
      })
      .catch(function (erro) {
        console.warn("[Império] casa 3D indisponível, fica a imagem:", erro);
        canvas.remove();
        secao.classList.add("casa--sem3d");
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    secao = document.querySelector("[data-casa]");
    if (!secao) return;
    palco = secao.querySelector("[data-casa-palco]");
    etapas = Array.prototype.slice.call(secao.querySelectorAll("[data-etapa]"));
    contador = secao.querySelector("[data-casa-contador]");
    if (parado || !temWebGL()) { secao.classList.add("casa--sem3d"); return; }
    pintar(0);
    if (window.__gravandoVideo) iniciar3D();
    else if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { obs.disconnect(); iniciar3D(); }
      }, { rootMargin: "150% 0px 150% 0px" });
      obs.observe(secao);
    } else iniciar3D();
    if (window.ImperioMotion) window.ImperioMotion.aoRolar(atualizar);
    else window.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", function () { med = null; ultimoP = -1; atualizar(); }, { passive: true });
    window.addEventListener("load", function () { med = null; ultimoP = -1; atualizar(); }, { once: true });
  });

  window.ImperioCasa = {
    pronto: function () { return parado || !secao || secao.classList.contains("casa--sem3d") || !!C3; },
    /** vídeo quadro a quadro: lê a rolagem e desenha já */
    atualizarAgora: function () {
      if (!C3) return;
      ultimoP = -1;
      atualizar();
      C3.renderAgora();
    },
  };
})();

/**
 * Casa inteira de Blocão — 3ª fase do "Por dentro", na MESMA tela fixa (casa3d.js desenha).
 * Depois do "L" (o Blocão desmontado, aberto e de novo inteiro), a rolagem continua: as fichas e botões saem,
 * a camada da casa entra por cima no mesmo lugar e o bloco da casa começa EXATAMENTE onde o Blocão estava
 * (mesma posição, tamanho e ângulo) — a troca é um esmaecimento sobre o mesmo ponto. Aí ele vai pro canto da
 * obra e as paredes sobem a partir dele.
 * - Prepara o 3D ~3 s depois de abrir (página parada) ou quando o "Por dentro" chega perto; no vídeo, já na abertura.
 * - "estatica": imagem pronta da casa + etapas em lista, depois do "L". Sem WebGL: a fase da casa sai (seção volta ao "L").
 * Publica window.ImperioCasa = { pronto(), atualizarAgora() } (usado pela gravação do vídeo).
 */
(function () {
  "use strict";

  var html = document.documentElement;
  var parado = html.getAttribute("data-qualidade") === "estatica";
  var camada = null;
  var jornadaEl = null;
  var ancora = null;
  var palco = null;
  var etapas = [];
  var contador = null;
  var C3 = null;
  var carregando = false;
  var ultimaEtapa = -1;
  var ultimoCont = -1;
  var ultimoQ = -1;
  var ultimaOp = -1;
  var ancoraFim = -1;

  // limites de cada etapa (iguais ao roteiro do casa3d.js)
  var LIMITES = [0, 0.12, 0.4, 0.47, 0.74, 0.86];
  var TROCA = 0.035; // trecho em que a camada da casa esmaece por cima do Blocão (o bloco da casa fica parado no mesmo ponto)

  function limitar(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function temWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  }

  function pintar(p) {
    var e = 0;
    for (var i = 0; i < LIMITES.length; i++) if (p >= LIMITES[i]) e = i;
    if (e !== ultimaEtapa) {
      ultimaEtapa = e;
      etapas.forEach(function (li, k) { li.classList.toggle("ativa", k === e); });
    }
    camada.style.setProperty("--ouro", (limitar((p - 0.86) / 0.14)).toFixed(3));
    camada.classList.toggle("casa--pronta", p > 0.93);
  }

  function aoDesenhar(info) {
    if (contador && info.assentados !== ultimoCont) {
      ultimoCont = info.assentados;
      contador.textContent = info.assentados;
    }
  }

  /** âncora #casa (menu "A casa") no começo da fase da casa */
  function posicionarAncora(j) {
    if (!ancora || !j || j.fim === ancoraFim) return;
    ancoraFim = j.fim;
    var total = jornadaEl.offsetHeight - window.innerHeight;
    ancora.style.top = Math.round((j.fim + (1 - j.fim) * 0.06) * total) + "px";
  }

  function atualizar(j) {
    if (!camada || parado || !j) return;
    posicionarAncora(j);
    var q = j.dentro ? j.casa : j.pTotal >= 1 ? 1 : 0;
    if (q === ultimoQ) return;
    ultimoQ = q;
    var op = limitar(q / TROCA);
    if (op !== ultimaOp) { ultimaOp = op; camada.style.opacity = op; }
    var p = limitar((q - TROCA) / (1 - TROCA));
    pintar(p);
    if (C3) {
      // de onde o bloco da casa sai: o lugar/tamanho/ângulo do Blocão no fim do "L" (calculado pela cena do bloco)
      if (window.ImperioCena && window.ImperioCena.alvoFinal) C3.guiaTela(window.ImperioCena.alvoFinal());
      C3.progresso(p);
    }
  }

  function iniciar3D() {
    if (carregando || !temWebGL()) return;
    carregando = true;
    var canvas = document.createElement("canvas");
    canvas.className = "casa__canvas";
    canvas.setAttribute("aria-hidden", "true");
    palco.appendChild(canvas);
    import("./casa3d.js?v=20261023d")
      .then(function () { return window.ImperioCasa3D.iniciar(canvas); })
      .then(function () {
        C3 = window.ImperioCasa3D;
        C3.aoDesenhar(aoDesenhar);
        camada.classList.add("casa--3d");
        ultimoQ = -1;
        atualizar(window.ImperioMotion && window.ImperioMotion.jornada());
      })
      .catch(function (erro) {
        console.warn("[Império] casa 3D indisponível:", erro);
        canvas.remove();
        semCasa();
      });
  }

  /** Sem 3D fora do nível "estatica": a fase da casa sai e o "Por dentro" volta a ter só o "L". */
  function semCasa() {
    if (jornadaEl) jornadaEl.classList.add("jornada--sem-casa");
    if (camada) camada.hidden = true;
    window.dispatchEvent(new Event("resize"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    camada = document.querySelector("[data-casa]");
    if (!camada) return;
    jornadaEl = camada.closest("[data-jornada]");
    ancora = jornadaEl && jornadaEl.querySelector(".jornada__ancora-casa");
    palco = camada.querySelector("[data-casa-palco]");
    etapas = Array.prototype.slice.call(camada.querySelectorAll("[data-etapa]"));
    contador = camada.querySelector("[data-casa-contador]");
    if (parado) { camada.classList.add("casa--sem3d"); return; }
    if (!temWebGL()) { semCasa(); return; }
    pintar(0);
    // prepara a casa num momento ocioso (não no meio da rolagem): celular antigo não engasga
    var quandoOcioso = function () {
      if (window.requestIdleCallback) window.requestIdleCallback(iniciar3D, { timeout: 1200 });
      else setTimeout(iniciar3D, 60);
    };
    if (window.__gravandoVideo) iniciar3D();
    else {
      if ("IntersectionObserver" in window) {
        var obs = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { obs.disconnect(); quandoOcioso(); }
        }, { rootMargin: "100% 0px 100% 0px" });
        obs.observe(jornadaEl);
      }
      // o mais pesado (criar o contexto gráfico) vai pro começo, com a pessoa ainda no topo e a página parada
      window.addEventListener("load", function () { setTimeout(quandoOcioso, 3000); }, { once: true });
    }
    if (window.ImperioMotion) window.ImperioMotion.aoRolar(atualizar);
    window.addEventListener("resize", function () { ultimoQ = -1; ancoraFim = -1; }, { passive: true });
  });

  window.ImperioCasa = {
    pronto: function () { return parado || !camada || camada.hidden || camada.classList.contains("casa--sem3d") || !!C3; },
    /** vídeo quadro a quadro: lê a rolagem e desenha já */
    atualizarAgora: function () {
      if (!C3) return;
      ultimoQ = -1;
      atualizar(window.ImperioMotion && window.ImperioMotion.jornada());
      C3.renderAgora();
    },
  };
})();

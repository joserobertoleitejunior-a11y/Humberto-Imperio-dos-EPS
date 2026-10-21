/**
 * Liga a rolagem da página ao Blocão 3D (bloco3d.js).
 * - Só baixa o Three.js depois que a página abriu (load + ocioso): não atrasa a primeira tela.
 * - Um único <canvas> fixo atrás do conteúdo serve à hero E à jornada em "L"
 *   (o bloco "viaja" de uma pra outra sem corte). Seções com fundo próprio cobrem o canvas.
 * - Fora da hero/jornada o desenho para (0 % de GPU).
 * - Sem WebGL ou nível "estatica": ficam as imagens prontas (assets/img/bloco-*.webp).
 */
(function () {
  "use strict";

  var html = document.documentElement;
  var nivel = html.getAttribute("data-qualidade");
  var B = null;
  var canvas = null;
  var heroVisivel = true;

  function limitar(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function suave(x) { x = limitar(x); return x * x * (3 - 2 * x); }
  function mix(a, b, t) { return a + (b - a) * t; }

  function temWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  }

  function alvoHero() {
    var a = document.querySelector('[data-ancora="hero"]');
    var r = a.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height * 0.52, larg: r.width * 0.9, abertura: 0, giro: -0.55, inclinar: 0.3 };
  }

  /**
   * Roteiro do bloco na jornada (p = 0..1 da seção):
   *   0,00–0,08  chega e vira de lado
   *   0,08–0,22  DESMONTA: as placas de concreto descolam do EPS
   *   0,26–0,38  ABRE AO MEIO (já desmontado: 6 peças, corte à mostra)
   *   0,42–0,50  fecha o corte (continua desmontado) — curva do "L"
   *   0,50–1,00  horizontal: cada ficha acende a sua peça; na ficha "Montado" o bloco se monta de novo
   */
  function alvoJornada(j) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var celular = w < 760;
    var p = j.p;
    var sep = suave((p - 0.08) / 0.14);
    var aberto = suave((p - 0.26) / 0.12) * (1 - suave((p - 0.42) / 0.08));
    var curva = suave((p - 0.42) / 0.12);
    var foco = curva > 0.5 && j.foco !== undefined ? j.foco : -1;
    if (foco >= 3) sep = 0; // ficha "Montado" (e o convite final): o bloco volta a ser um só
    var giro = mix(-0.55, -1.05, sep);
    giro = mix(giro, -0.12, aberto);
    giro = mix(giro, foco >= 3 ? -0.5 : -0.95, curva);
    var v = {
      separacao: sep,
      abertura: aberto,
      cx: mix(w * (celular ? 0.5 : 0.64), w * (celular ? 0.5 : 0.68), curva),
      cy: mix(h * (celular ? 0.36 : 0.5), h * (celular ? 0.3 : 0.36), curva),
      larg: mix(Math.min(w * (celular ? 0.62 : 0.4), 640), Math.min(w * (celular ? 0.62 : 0.32), 500), curva),
      giro: giro,
      inclinar: mix(0.28, 0.2, aberto),
      dim0: foco >= 0 && foco <= 2 && foco !== 0 ? 1 : 0,
      dim1: foco >= 0 && foco <= 2 && foco !== 1 ? 1 : 0,
      dim2: foco >= 0 && foco <= 2 && foco !== 2 ? 1 : 0,
    };
    v.rotulos = sep * (1 - suave((p - 0.24) / 0.05)) * (1 - curva); // etiquetas só com o bloco desmontado e ainda inteiro
    return v;
  }

  function espessuraEscolhida() {
    var b = window.ImperioEspessura && window.ImperioEspessura.atual();
    return b ? b.total : 15;
  }

  function atualizar(j) {
    if (!B) return;
    var hero = alvoHero();
    var dentroJ = j && j.dentro;
    var e = j ? suave(j.entrada) : 0;
    var alvo = Object.assign({ separacao: 0, dim0: 0, dim1: 0, dim2: 0 }, hero);
    var opRotulos = 0;
    if (dentroJ && e > 0) {
      var jj = alvoJornada(j);
      ["cx", "cy", "larg", "abertura", "giro", "inclinar", "separacao", "dim0", "dim1", "dim2"].forEach(function (k) { alvo[k] = mix(alvo[k], jj[k], e); });
      opRotulos = jj.rotulos * e;
    }
    alvo.espessura = espessuraEscolhida();
    if (rotulos) rotulos.style.opacity = opRotulos;
    var visivel = heroVisivel || dentroJ;
    canvas.style.opacity = visivel ? 1 : 0;
    B.pausar(!visivel);
    B.respirar(heroVisivel && !dentroJ);
    B.estado(alvo);
  }

  /** Etiquetas (concreto / EPS / concreto) presas no topo de cada peça. */
  var rotulos = null;
  function posicionarRotulos(pos) {
    if (!rotulos || rotulos.style.opacity === "0") return;
    var itens = rotulos.querySelectorAll("[data-rot]");
    pos.forEach(function (pt, k) {
      // escalonadas na altura (a do meio mais alta) pra não se sobreporem com o bloco de lado
      var sobe = (window.innerWidth < 760 ? [0, 30, 60] : [0, 46, 92])[k];
      if (itens[k]) itens[k].style.transform = "translate3d(" + pt.x.toFixed(1) + "px," + (pt.y - sobe).toFixed(1) + "px,0) translate(-50%,-115%)";
    });
  }

  function iniciar() {
    if (B || !temWebGL()) return;
    canvas = document.createElement("canvas");
    canvas.className = "palco3d";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    import("./bloco3d.js")
      .then(function () {
        B = window.ImperioBloco3D;
        return B.iniciar(canvas);
      })
      .then(function () {
        var heroEl = document.querySelector(".hero");
        if ("IntersectionObserver" in window && heroEl) {
          new IntersectionObserver(function (en) {
            heroVisivel = en[0].isIntersecting;
            atualizar(window.ImperioMotion && window.ImperioMotion.jornada());
          }).observe(heroEl);
        }
        rotulos = document.querySelector("[data-jornada-rotulos]");
        B.aoPosicionar(posicionarRotulos);
        if (window.ImperioMotion) window.ImperioMotion.aoRolar(atualizar);
        if (window.ImperioEspessura) window.ImperioEspessura.aoMudar(function () { atualizar(window.ImperioMotion && window.ImperioMotion.jornada()); });
        B.renderAgora();
        requestAnimationFrame(function () { html.classList.add("com-3d"); });
      })
      .catch(function (erro) {
        console.warn("[Império] 3D indisponível, ficam as imagens:", erro);
        if (canvas) canvas.remove();
      });
  }

  if (nivel === "estatica") return;

  function quandoOcioso() {
    if (window.__gravandoVideo) return iniciar();
    if (window.requestIdleCallback) window.requestIdleCallback(iniciar, { timeout: 1500 });
    else setTimeout(iniciar, 400);
  }
  if (document.readyState === "complete") quandoOcioso();
  else window.addEventListener("load", quandoOcioso, { once: true });

  window.ImperioCena = {
    /** Vídeo quadro a quadro: recalcula a rolagem e desenha já. */
    atualizarAgora: function () {
      if (window.ImperioMotion) window.ImperioMotion.atualizarAgora();
      if (B) B.renderAgora();
    },
    pronto: function () { return !!B; },
  };
})();

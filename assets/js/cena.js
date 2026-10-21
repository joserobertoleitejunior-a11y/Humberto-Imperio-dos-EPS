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
  var ESPESSURAS = [10, 13, 15, 20];

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

  function alvoJornada(j) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var celular = w < 760;
    var p = j.p;
    var aberto = suave((p - 0.08) / 0.24) * (1 - suave((p - 0.4) / 0.1));
    var curva = suave((p - 0.38) / 0.16);
    var hz = j.hz || 0;
    var v = {
      cx: mix(w * (celular ? 0.5 : 0.6), w * (celular ? 0.5 : 0.7), curva),
      cy: mix(h * (celular ? 0.33 : 0.52), h * (celular ? 0.33 : 0.36), curva),
      larg: mix(Math.min(w * (celular ? 0.68 : 0.5), 760), Math.min(w * (celular ? 0.7 : 0.34), 520), curva),
      abertura: aberto,
      giro: mix(mix(-0.5, -0.05, suave((p - 0.04) / 0.28)), -0.62 + Math.sin(hz * Math.PI * 3) * 0.12, curva),
      inclinar: mix(mix(0.3, 0.14, aberto), 0.26, curva),
    };
    if (curva > 0.5 && j.foco !== undefined) v.espessura = ESPESSURAS[Math.min(j.foco, 3)];
    else v.espessura = 15;
    return v;
  }

  function atualizar(j) {
    if (!B) return;
    var hero = alvoHero();
    var dentroJ = j && j.dentro;
    var e = j ? suave(j.entrada) : 0;
    var alvo = hero;
    if (dentroJ && e > 0) {
      var jj = alvoJornada(j);
      alvo = {};
      ["cx", "cy", "larg", "abertura", "giro", "inclinar"].forEach(function (k) { alvo[k] = mix(hero[k], jj[k], e); });
      alvo.espessura = e > 0.5 ? jj.espessura : 15;
    } else {
      alvo.espessura = 15;
    }
    var rot = document.querySelector("[data-jornada-rotulos]");
    if (rot) {
      rot.style.setProperty("--bx", alvo.cx + "px");
      rot.style.setProperty("--by", alvo.cy + "px");
      rot.style.setProperty("--bw", alvo.larg + "px");
    }
    var visivel = heroVisivel || dentroJ;
    canvas.style.opacity = visivel ? 1 : 0;
    B.pausar(!visivel);
    B.respirar(heroVisivel && !dentroJ);
    B.estado(alvo);
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
        if (window.ImperioMotion) window.ImperioMotion.aoRolar(atualizar);
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

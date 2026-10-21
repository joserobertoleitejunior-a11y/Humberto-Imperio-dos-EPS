/**
 * Animações da hero (padrão da agência: GSAP só nos momentos de destaque).
 * - Entrada: as 3 camadas do Blokão chegam separadas e se encaixam (CSS,
 *   classe .montado — funciona sem GSAP).
 * - Rolagem: com GSAP + ScrollTrigger disponíveis, as camadas se abrem
 *   ao rolar, mostrando o "sanduíche". Sem GSAP, nada quebra.
 * Tudo desliga com prefers-reduced-motion.
 */
(function () {
  "use strict";

  var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hero = document.querySelector("[data-hero-bloco]");
  if (!hero) return;

  requestAnimationFrame(function () { hero.classList.add("montado"); });
  if (reduzir) return;

  var GSAP = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
  var ST = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js";

  function carregar(src) {
    return new Promise(function (ok, falha) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = ok;
      s.onerror = falha;
      document.head.appendChild(s);
    });
  }

  function abrirAoRolar() {
    var g = window.gsap;
    g.registerPlugin(window.ScrollTrigger);
    var afastar = window.matchMedia("(min-width: 900px)").matches ? 34 : 20;
    // Eixo da espessura no desenho isométrico: (-0,866 ; 0,5)
    [-1, 0, 1].forEach(function (lado, i) {
      g.to(hero.querySelector('[data-camada="' + i + '"]'), {
        x: -0.866 * afastar * lado,
        y: 0.5 * afastar * lado,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top 25%", end: "bottom top", scrub: 0.6 },
      });
    });
  }

  window.addEventListener("load", function () {
    carregar(GSAP)
      .then(function () { return carregar(ST); })
      .then(abrirAoRolar)
      .catch(function () { /* sem GSAP: a hero continua com a animação CSS */ });
  }, { once: true });
})();

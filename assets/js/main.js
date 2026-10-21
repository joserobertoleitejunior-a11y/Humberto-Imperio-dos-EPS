/**
 * Comportamentos gerais do site: links de WhatsApp/contato a partir do
 * config.js, menu, header que encolhe, FAQ, toast, ano do rodapé.
 */
(function () {
  "use strict";

  var cfg = window.IMPERIO_CONFIG || {};

  function linkWhatsApp(mensagem) {
    return "https://wa.me/" + cfg.whatsappNumero + "?text=" + encodeURIComponent(mensagem || cfg.whatsappMensagemPadrao || "");
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(texto) {
    var t = document.querySelector("[data-toast]");
    if (!t) return;
    t.textContent = texto;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add("visivel"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove("visivel");
      setTimeout(function () { t.hidden = true; }, 300);
    }, 3600);
  }

  /* ---------- Links de contato ---------- */
  function preencherContatos() {
    document.querySelectorAll("[data-whatsapp]").forEach(function (a) {
      a.href = linkWhatsApp(a.getAttribute("data-whatsapp"));
      a.target = "_blank";
      a.rel = "noopener";
    });
    document.querySelectorAll("[data-link-instagram]").forEach(function (a) {
      a.href = cfg.instagramUrl;
      a.target = "_blank";
      a.rel = "noopener";
    });
    document.querySelectorAll("[data-link-maps]").forEach(function (a) {
      a.href = cfg.mapsUrl;
      a.target = "_blank";
      a.rel = "noopener";
    });
    document.querySelectorAll("[data-link-google]").forEach(function (a) {
      a.href = cfg.googleUrl || "https://www.google.com/search?q=" + encodeURIComponent((cfg.nome || "") + " " + (cfg.cidade || ""));
      a.target = "_blank";
      a.rel = "noopener";
    });
    document.querySelectorAll("[data-link-tel]").forEach(function (a) {
      a.href = "tel:+" + cfg.whatsappNumero;
    });
    document.querySelectorAll("[data-link-facebook]").forEach(function (a) {
      if (!cfg.facebookUrl) return; // sem página da empresa ainda: o ícone nem aparece
      a.href = cfg.facebookUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.hidden = false;
    });
    var textos = {
      whatsapp: cfg.whatsappExibicao,
      instagram: cfg.instagramUsuario,
      cidade: cfg.cidade,
      area: cfg.areaAtendimento,
      endereco: cfg.enderecoCompleto || "Endereço da fábrica em breve",
      ano: String(new Date().getFullYear()),
    };
    document.querySelectorAll("[data-texto]").forEach(function (e) {
      var v = textos[e.getAttribute("data-texto")];
      if (v) e.textContent = v;
    });
  }

  /* ---------- Menu ---------- */
  function iniciarMenu() {
    var botao = document.querySelector("[data-menu-botao]");
    var nav = document.querySelector("[data-menu]");
    if (!botao || !nav) return;
    function alternar(abrir) {
      var aberto = typeof abrir === "boolean" ? abrir : botao.getAttribute("aria-expanded") !== "true";
      botao.setAttribute("aria-expanded", String(aberto));
      nav.classList.toggle("aberto", aberto);
      document.body.classList.toggle("menu-aberto", aberto);
    }
    botao.addEventListener("click", function () { alternar(); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) alternar(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") alternar(false); });
  }

  function iniciarCabecalho() {
    var header = document.querySelector("[data-cabecalho]");
    if (!header) return;
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        header.classList.toggle("compacto", window.scrollY > 40);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Aparecer ao rolar (fallback sem GSAP) ---------- */
  function iniciarRevelar() {
    var itens = document.querySelectorAll("[data-revelar]");
    if (!("IntersectionObserver" in window)) {
      itens.forEach(function (i) { i.classList.add("visivel"); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("visivel");
          obs.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    itens.forEach(function (i) { obs.observe(i); });
  }

  /* ---------- Ficha técnica: "Quero este bloco" ---------- */
  function iniciarBotoesBloco() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-escolher-bloco]");
      if (!b) return;
      var sel = document.getElementById("calc-bloco");
      if (sel) {
        sel.value = b.getAttribute("data-escolher-bloco");
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    preencherContatos();
    iniciarMenu();
    iniciarCabecalho();
    iniciarRevelar();
    iniciarBotoesBloco();
  });

  window.ImperioToast = toast;
  window.ImperioWhatsApp = linkWhatsApp;
})();

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
    document.querySelectorAll("[data-link-email]").forEach(function (a) {
      if (!cfg.email) return; // sem e-mail cadastrado: o ícone nem aparece
      a.href = "mailto:" + cfg.email;
      a.hidden = false;
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
      email: cfg.email,
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

  /**
   * Faixa de atalhos (como a da Remop): anda sozinha pra esquerda; dá pra arrastar com o dedo/mouse e, ao soltar,
   * ela segue no embalo (atrito) até voltar a andar sozinha. Os botões são duplicados (cópias só visuais) pra fazer
   * o laço infinito nos dois sentidos. Fora da tela o laço para (não gasta bateria).
   */
  function iniciarFaixaAtalhos() {
    var trilha = document.querySelector("[data-atalhos-trilha]");
    if (!trilha || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    Array.prototype.slice.call(trilha.children).forEach(function (a) {
      if (a.hidden) return;
      var c = a.cloneNode(true);
      c.removeAttribute("aria-label");
      c.setAttribute("aria-hidden", "true");
      c.setAttribute("tabindex", "-1");
      trilha.appendChild(c);
    });
    var VEL = 0.03;      // px por ms, andando sozinha
    var ATRITO = 0.94;
    var largura = 0;
    var pos = 0;
    var vel = 0;
    var arrastando = false;
    var moveu = 0;
    var xAnt = 0;
    var tAnt = 0;
    var ultimo = 0;
    var visivel = true;
    var quadro = 0;
    function medir() { largura = trilha.scrollWidth / 2; }
    function aplicar() {
      if (largura > 0) {
        while (pos <= -largura) pos += largura;
        while (pos > 0) pos -= largura;
      }
      trilha.style.transform = "translate3d(" + pos.toFixed(1) + "px,0,0)";
    }
    function laco(t) {
      quadro = 0;
      if (!visivel) { ultimo = 0; return; }
      var dt = ultimo ? Math.min(64, t - ultimo) : 16;
      ultimo = t;
      if (!arrastando) {
        if (Math.abs(vel) > 0.01) { pos += vel * dt; vel *= Math.pow(ATRITO, dt / 16); }
        else { vel = 0; pos -= VEL * dt; }
        aplicar();
      }
      quadro = requestAnimationFrame(laco);
    }
    function ligar() { if (!quadro) { ultimo = 0; quadro = requestAnimationFrame(laco); } }
    trilha.addEventListener("pointerdown", function (e) {
      arrastando = true;
      moveu = 0;
      vel = 0;
      xAnt = e.clientX;
      tAnt = performance.now();
      trilha.classList.add("arrastando");
      try { trilha.setPointerCapture(e.pointerId); } catch (er) { /* sem captura */ }
    });
    trilha.addEventListener("pointermove", function (e) {
      if (!arrastando) return;
      var agora = performance.now();
      var dx = e.clientX - xAnt;
      pos += dx;
      vel = dx / Math.max(1, agora - tAnt);
      moveu += Math.abs(dx);
      xAnt = e.clientX;
      tAnt = agora;
      aplicar();
    });
    function soltar() {
      if (!arrastando) return;
      arrastando = false;
      trilha.classList.remove("arrastando");
      vel = Math.max(-2.5, Math.min(2.5, vel));
    }
    trilha.addEventListener("pointerup", soltar);
    trilha.addEventListener("pointercancel", soltar);
    // depois de um arrasto de verdade, o clique que sobra não abre o link
    trilha.addEventListener("click", function (e) { if (moveu > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    trilha.addEventListener("dragstart", function (e) { e.preventDefault(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (ent) { visivel = ent[0].isIntersecting; if (visivel) ligar(); }).observe(trilha);
    }
    window.addEventListener("resize", medir, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    medir();
    ligar();
  }

  document.addEventListener("DOMContentLoaded", function () {
    preencherContatos();
    iniciarFaixaAtalhos();
    iniciarMenu();
    iniciarCabecalho();
    iniciarRevelar();
    iniciarBotoesBloco();
  });

  window.ImperioToast = toast;
  window.ImperioWhatsApp = linkWhatsApp;
})();

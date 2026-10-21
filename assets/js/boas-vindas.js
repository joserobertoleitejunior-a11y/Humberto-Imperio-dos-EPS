/**
 * Abertura do site — engenharia reversa da splash da Pizza em Dobro, no contexto do Blocão:
 *  1. SPLASH (CSS puro, aparece no 1º quadro): as 3 camadas (concreto, EPS, concreto) se
 *     encaixam, o nome sobe palavra por palavra e o bloco abre ao meio "deixando entrar".
 *     Fecha sozinha (~3,2 s) e pode ser pulada com um toque.
 *     Não reaparece ao navegar dentro do site na mesma sessão (só em recarregar/visita nova).
 *  2. BOAS-VINDAS (1x por sessão): o vídeo "O Blocão em 30 segundos" no fundo + 2 caminhos:
 *     "Conhecer nosso produto" (vai pro Blocão por dentro) ou "Orçamento" (calculadora).
 * Aparelho fraco / economia de dados: o vídeo não baixa sozinho (fica a capa; toca no toque).
 */
(function () {
  "use strict";

  var html = document.documentElement;
  var CHAVE_SPLASH = "imperio_splash";
  var CHAVE_BV = "imperio_bv";
  var fechada = false;
  var timer = null;

  function pegarSessao(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function marcar(k) { try { sessionStorage.setItem(k, "1"); } catch (e) { /* sem storage */ } }

  function fecharSplash() {
    if (fechada) return;
    fechada = true;
    clearTimeout(timer);
    marcar(CHAVE_SPLASH);
    var s = document.getElementById("splash");
    if (!s) return;
    s.classList.add("saindo");
    if (!html.classList.contains("sem-splash")) abrirBoasVindas();
    setTimeout(function () { s.hidden = true; }, 650);
  }

  /* ---------- Boas-vindas com vídeo ---------- */
  function abrirBoasVindas() {
    if (pegarSessao(CHAVE_BV) || window.__gravandoVideo) return;
    var cfg = window.IMPERIO_CONFIG || {};
    var bv = document.getElementById("boas-vindas");
    // Sem vídeo pronto (config) → nem monta a tela: o visitante entra direto no site
    if (!bv || cfg.boasVindasComVideo !== true) return;
    var video = bv.querySelector("video");
    if (!video) return;
    var mostrou = false;
    function mostrar() {
      if (mostrou || fechada === false) return;
      mostrou = true;
      marcar(CHAVE_BV);
      var leve = /^(baixa|estatica)$/.test(html.getAttribute("data-qualidade"));
      bv.hidden = false;
      requestAnimationFrame(function () { bv.classList.add("on"); });
      document.body.classList.add("travado");
      if (!leve) {
        var pl = video.play();
        if (pl && pl.catch) pl.catch(function () { /* autoplay bloqueado: fica a capa */ });
      }
      var foco = bv.querySelector("[data-ir]");
      if (foco) setTimeout(function () { foco.focus({ preventScroll: true }); }, 500);
    }
    // só mostra quando o vídeo realmente carregou (se der erro ou demorar > 2,5 s, o site abre direto)
    video.addEventListener("loadeddata", mostrar, { once: true });
    video.addEventListener("error", function () { mostrou = true; }, { once: true });
    video.preload = "auto";
    video.load();
    setTimeout(function () { if (!mostrou) mostrou = true; }, 2500);
  }

  function fecharBoasVindas(destino) {
    var bv = document.getElementById("boas-vindas");
    if (!bv || bv.hidden) return;
    var video = bv.querySelector("video");
    if (video) video.pause();
    bv.classList.remove("on");
    document.body.classList.remove("travado");
    setTimeout(function () { bv.hidden = true; }, 320);
    if (destino) {
      var alvo = document.querySelector(destino);
      if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function ligarSom(botao) {
    var v = document.querySelector("#boas-vindas video");
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    var pl = v.play();
    if (pl && pl.catch) pl.catch(function () {});
    botao.classList.add("some");
  }

  /** Onda de toque nos botões redondos (o resto do efeito é CSS puro). */
  function onda(e) {
    var b = e.target.closest(".btn-redondo");
    if (!b || html.getAttribute("data-qualidade") === "estatica") return;
    var r = b.getBoundingClientRect();
    var o = document.createElement("span");
    o.className = "onda";
    o.style.left = e.clientX - r.left + "px";
    o.style.top = e.clientY - r.top + "px";
    b.appendChild(o);
    o.addEventListener("animationend", function () { o.remove(); });
  }

  /** Botão da splash: fecha a splash, pula a boas-vindas (a pessoa já escolheu) e vai pro destino. */
  function irDaSplash(destino) {
    marcar(CHAVE_BV);
    fecharSplash();
    setTimeout(function () {
      var alvo = document.querySelector(destino);
      if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("pointerdown", onda, { passive: true });
    var s = document.getElementById("splash");
    if (s && !html.classList.contains("sem-splash")) {
      s.addEventListener("click", function (e) {
        var b = e.target.closest("[data-ir]");
        if (b) { e.stopPropagation(); return irDaSplash(b.getAttribute("data-ir")); }
        fecharSplash();
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharSplash(); });
      // os botões aparecem ~2,4 s depois do começo; fecha sozinha só depois de dar tempo de escolher
      // (no vídeo tutorial quem fecha a splash é o próprio vídeo, no tempo certo da cena)
      if (!window.__gravandoVideo) timer = setTimeout(fecharSplash, html.getAttribute("data-qualidade") === "estatica" ? 5000 : 7000);
    } else if (s) {
      s.hidden = true;
    }
    var bv = document.getElementById("boas-vindas");
    if (bv) {
      bv.addEventListener("click", function (e) {
        var b = e.target.closest("[data-ir]");
        if (b) return fecharBoasVindas(b.getAttribute("data-ir"));
        var som = e.target.closest("[data-bv-som]");
        if (som) ligarSom(som);
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharBoasVindas(); });
    }
  });

  window.ImperioAbertura = { fecharSplash: fecharSplash, abrirBoasVindas: abrirBoasVindas, fecharBoasVindas: fecharBoasVindas };
})();

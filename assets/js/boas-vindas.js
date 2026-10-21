/**
 * Abertura do site — engenharia reversa da splash da Pizza em Dobro, no contexto do Blocão:
 *  1. SPLASH (CSS puro, aparece no 1º quadro): as 3 camadas (concreto, EPS, concreto) se
 *     encaixam, o nome sobe palavra por palavra e o bloco abre ao meio "deixando entrar".
 *     Fecha sozinha (~3,2 s) e pode ser pulada com um toque.
 *     Não reaparece ao navegar dentro do site na mesma sessão (só em recarregar/visita nova).
 *  2. BOAS-VINDAS (1x por sessão): o vídeo "Sua obra em 1 minuto" no fundo + 2 caminhos:
 *     "Calcular minha obra" (vai direto pra calculadora) ou "Ver o site".
 * Aparelho fraco / economia de dados: o vídeo não baixa sozinho (fica a capa; toca no toque).
 */
(function () {
  "use strict";

  var html = document.documentElement;
  var CHAVE_SPLASH = "imperio_splash";
  var CHAVE_BV = "imperio_bv";
  var fechada = false;
  var timer = null;

  function pegar(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
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
    if (pegar(CHAVE_BV) || window.__gravandoVideo) return;
    var bv = document.getElementById("boas-vindas");
    if (!bv) return;
    marcar(CHAVE_BV);
    var video = bv.querySelector("video");
    var leve = /^(baixa|estatica)$/.test(html.getAttribute("data-qualidade"));
    bv.hidden = false;
    requestAnimationFrame(function () { bv.classList.add("on"); });
    document.body.classList.add("travado");
    if (video && !leve) {
      video.preload = "auto";
      var pl = video.play();
      if (pl && pl.catch) pl.catch(function () { /* autoplay bloqueado: fica a capa */ });
    }
    var foco = bv.querySelector("[data-bv-calcular]");
    if (foco) setTimeout(function () { foco.focus({ preventScroll: true }); }, 500);
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

  document.addEventListener("DOMContentLoaded", function () {
    var s = document.getElementById("splash");
    if (s && !html.classList.contains("sem-splash")) {
      s.addEventListener("click", fecharSplash);
      s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === "Escape") fecharSplash(); });
      // no vídeo tutorial quem fecha a splash é o próprio vídeo (no tempo certo da cena)
      if (!window.__gravandoVideo) timer = setTimeout(fecharSplash, html.getAttribute("data-qualidade") === "estatica" ? 900 : 3200);
    } else if (s) {
      s.hidden = true;
    }
    var bv = document.getElementById("boas-vindas");
    if (bv) {
      bv.addEventListener("click", function (e) {
        if (e.target.closest("[data-bv-calcular]")) return fecharBoasVindas("#calculadora");
        if (e.target.closest("[data-bv-site]")) return fecharBoasVindas();
        var som = e.target.closest("[data-bv-som]");
        if (som) ligarSom(som);
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharBoasVindas(); });
    }
  });

  window.ImperioAbertura = { fecharSplash: fecharSplash, abrirBoasVindas: abrirBoasVindas, fecharBoasVindas: fecharBoasVindas };
})();

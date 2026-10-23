/**
 * Roda no <head>, antes de pintar (base: js/dispositivo.js da Pizza em Dobro).
 * Decide o nível de qualidade do aparelho e grava em html[data-qualidade]:
 *   alta     → PC bom: 3D com sombra real e partículas, letra por letra
 *   media    → celular/PC comum: 3D sem sombra real, menos partículas
 *   baixa    → aparelho fraco: 3D em resolução 1x, sem partículas, palavras em vez de letras
 *   estatica → economia de dados, pouquíssima memória ou "reduzir movimento": imagens prontas, sem 3D
 * Também grava --vh (altura real da tela no celular, sem a barra do navegador) e trava o zoom
 * (pinça, toque duplo e Ctrl + roda/teclas): o site fica sempre do tamanho exato da tela do aparelho.
 */
(function () {
  var h = document.documentElement;
  var nav = navigator;
  var con = nav.connection || {};
  var mem = nav.deviceMemory || 0;
  var nucleos = nav.hardwareConcurrency || 0;
  var toque = (nav.maxTouchPoints || 0) > 0;
  var reduzir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nivel = "media";
  // memória: o navegador arredonda pra baixo (celular de 6 GB informa 4) — "fraco" só com ≤ 2 GB ou ≤ 4 núcleos
  if (reduzir || con.saveData === true || /(^|-)2g$/.test(con.effectiveType || "") || (mem && mem < 2)) nivel = "estatica";
  else if ((mem && mem <= 2) || (nucleos && nucleos <= 4)) nivel = "baixa";
  else if (!toque && window.innerWidth >= 1100 && nucleos >= 8 && (!mem || mem >= 8)) nivel = "alta";
  try {
    var busca = new URLSearchParams(location.search);
    if (busca.get("qualidade")) nivel = busca.get("qualidade");
    // ?video=1: o site está dentro do gravador do vídeo tutorial (video/index.html)
    if (busca.has("video")) window.__gravandoVideo = true;
  } catch (e) { /* navegador antigo */ }
  h.setAttribute("data-qualidade", nivel);
  // altura de referência da tela, ESTÁVEL: no celular a barra de endereço aparece/some quando a rolagem para
  // (muda ~50–120px) — se o 3D seguisse isso, a casa e o Blocão "pulavam" pra cima. Só muda ao girar o aparelho,
  // ao mudar a largura ou numa mudança grande de verdade (fora o teclado aberto).
  var largura = window.innerWidth;
  var altura = window.innerHeight;
  function medir(forcar) {
    var w = window.innerWidth;
    var a = window.innerHeight;
    if (forcar !== true && w === largura) {
      if (toque && Math.abs(a - altura) < 160) return;
      var foco = document.activeElement;
      if (foco && /^(INPUT|SELECT|TEXTAREA)$/.test(foco.tagName)) return; // teclado na tela
    }
    largura = w;
    altura = a;
    h.style.setProperty("--vh", altura * 0.01 + "px");
  }
  window.ImperioTela = { altura: function () { return altura; } };
  medir(true);
  window.addEventListener("resize", medir, { passive: true });
  window.addEventListener("orientationchange", function () { setTimeout(function () { medir(true); }, 250); }, { passive: true });

  // sem zoom (toque duplo: o touch-action do site.css): o layout já é feito pro tamanho de cada tela (a meta viewport trava no Android; o iPhone ignora, então aqui)
  function barrar(e) { e.preventDefault(); }
  document.addEventListener("gesturestart", barrar, { passive: false });   // pinça no Safari do iPhone
  document.addEventListener("gesturechange", barrar, { passive: false });
  document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  window.addEventListener("wheel", function (e) { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false }); // Ctrl + roda / pinça no touchpad
  window.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && /^(\+|-|=|0|_)$/.test(e.key)) e.preventDefault();
  });
})();

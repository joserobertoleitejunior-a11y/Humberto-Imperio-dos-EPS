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

  // SEM ZOOM em qualquer aparelho: o layout já é feito pro tamanho de cada tela.
  // Camadas: meta viewport (Android), touch-action no site.css (pinça e toque duplo nos navegadores atuais) e aqui
  // os casos que escapam: pinça do iPhone (gesture*), 2 dedos, toque duplo em navegador antigo/visualizador embutido,
  // Ctrl + roda / pinça do touchpad e Ctrl + / - / 0 no computador.
  function barrar(e) { if (e.cancelable) e.preventDefault(); }
  var opc = { passive: false, capture: true };
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (t) { document.addEventListener(t, barrar, opc); });
  document.addEventListener("touchstart", function (e) { if (e.touches && e.touches.length > 1) barrar(e); }, opc);
  document.addEventListener("touchmove", function (e) {
    if ((e.touches && e.touches.length > 1) || (e.scale !== undefined && e.scale !== 1)) barrar(e);
  }, opc);
  // toque duplo: o 2º toque rápido no mesmo lugar não vira zoom (em botões/links/campos o toque segue normal)
  var ultimo = { t: 0, x: 0, y: 0 };
  document.addEventListener("touchend", function (e) {
    var q = e.changedTouches && e.changedTouches[0];
    if (!q) return;
    var agora = Date.now();
    var perto = Math.abs(q.clientX - ultimo.x) < 40 && Math.abs(q.clientY - ultimo.y) < 40;
    var alvo = e.target && e.target.closest ? e.target.closest("a, button, input, select, textarea, label, [role=button], [data-casa-palco]") : null;
    if (agora - ultimo.t < 320 && perto && !alvo) barrar(e);
    ultimo = { t: agora, x: q.clientX, y: q.clientY };
  }, opc);
  window.addEventListener("wheel", function (e) { if (e.ctrlKey || e.metaKey) barrar(e); }, opc);
  window.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && /^(\+|-|=|0|_|Add|Subtract)$/.test(e.key)) barrar(e);
  }, true);
  // se algum navegador ainda assim ampliar (ex.: visualizador dentro de outro app), volta pro tamanho da tela
  var vv = window.visualViewport;
  if (vv) vv.addEventListener("resize", function () {
    if (vv.scale > 1.01) {
      var m = document.querySelector('meta[name="viewport"]');
      if (!m) return;
      var c = m.getAttribute("content");
      m.setAttribute("content", c + ", initial-scale=1");
      setTimeout(function () { m.setAttribute("content", c); }, 60);
    }
  });
})();

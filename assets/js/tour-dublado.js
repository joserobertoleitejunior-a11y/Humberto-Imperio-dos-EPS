/**
 * Tour dublada INTERATIVA: a tour do drone (ao vivo, no 3D do site) ganha a narração, as legendas grandes e os cartões
 * animados do vídeo — tudo no mesmo relógio da tour (ImperioCasa3D.tempoTour). O dedo continua girando a vista; o som
 * é opcional (o navegador só deixa tocar áudio depois de um toque: botão "Ouvir a tour"). Sem som, as legendas rodam igual.
 * Dados: tour-dublado-dados.js (gerado por brand/scripts/dados_tour_dublado.js).
 */
(function () {
  "use strict";
  var D = window.TOUR_DUBLADO_DADOS;
  var raiz = document.querySelector("[data-tourd]");
  if (!D || !raiz) return;
  var elLeg = raiz.querySelector("[data-tourd-leg]");
  var elCard = raiz.querySelector("[data-tourd-cartao]");
  var elFlash = raiz.querySelector("[data-tourd-flash]");
  var btn = raiz.querySelector("[data-tourd-som]");
  var dica = raiz.querySelector("[data-tourd-dica]");
  var audio = null;
  var somLigado = false;
  var ativo = false;
  var cenaAtual = -2;
  var legAtual = "";
  var C3 = null;

  function lim(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function out(x) { return 1 - Math.pow(1 - lim(x), 3); }
  function back(x) { x = lim(x); var c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function quica(x) { x = lim(x); var n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; } if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; } x -= 2.625 / d; return n * x * x + 0.984375; }
  function $(s, r) { return (r || elCard).querySelector(s); }
  function svg(tag, at) { var e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (var k in at) e.setAttribute(k, at[k]); return e; }

  var CINZA = "#A8A39A";
  var PAREDE = '<rect x="150" y="30" width="34" height="220" fill="' + CINZA + '"/><rect x="184" y="30" width="60" height="220" fill="#fff" stroke="#cfcac0" stroke-width="3"/><rect x="244" y="30" width="34" height="220" fill="' + CINZA + '"/>';
  /* cada cena: [título, subtítulo, svg 330x270] — a animação é por tempo (função atualiza) */
  var CENAS = [
    ["Concreto", "dá a força", '<rect x="20" y="215" width="290" height="40" rx="6" fill="' + CINZA + '"/><g id="pesos"></g>'],
    ["Isopor", "segura calor e barulho", '<circle cx="40" cy="45" r="22" fill="#F2A900"/><g id="raios"></g>' + PAREDE + '<g id="ondas"></g><path id="ok" d="M290 140 l14 14 l26 -30" stroke="#1FA855" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="80" stroke-dashoffset="80"/>'],
    ["Sem mofo", "parede seca", PAREDE + '<g id="gotas"></g><path id="ok" d="M40 140 l22 22 l44 -52" stroke="#1FA855" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="130" stroke-dashoffset="130"/>'],
    null,
    ["Leve", "a parede sobe rápido", '<g id="blocos"></g><circle cx="262" cy="70" r="46" fill="#fff" stroke="#1E2023" stroke-width="7"/><line id="min" x1="262" y1="70" x2="262" y2="38" stroke="#1F4BD8" stroke-width="7" stroke-linecap="round"/><line id="hor" x1="262" y1="70" x2="276" y2="70" stroke="#1E2023" stroke-width="7" stroke-linecap="round"/>'],
    ["Elétrica", "pelo miolo", '<rect x="40" y="20" width="44" height="260" fill="' + CINZA + '"/><rect x="84" y="20" width="84" height="260" fill="#fff" stroke="#cfcac0" stroke-width="3"/><rect x="168" y="20" width="44" height="260" fill="' + CINZA + '"/><path id="cond" d="M126 270 L126 190 L100 165 L152 110 L126 85 L126 28" stroke="#1F4BD8" stroke-width="10" fill="none" stroke-linejoin="round" stroke-dasharray="500" stroke-dashoffset="500"/><g id="prat"><rect x="212" y="120" width="130" height="18" rx="4" fill="#B9855A"/><rect x="296" y="86" width="40" height="34" rx="6" fill="#1F4BD8"/><circle cx="226" cy="129" r="6" fill="#1E2023"/></g>'],
    null,
    ["Itapetininga-SP", "direto da fábrica", '<ellipse id="sombra" cx="165" cy="240" rx="30" ry="9" fill="rgba(0,0,0,.25)"/><g id="pino"><path d="M165 40c-42 0-70 30-70 68 0 52 70 130 70 130s70-78 70-130c0-38-28-68-70-68z" fill="#1F4BD8"/><circle cx="165" cy="108" r="26" fill="#fff"/></g>'],
  ];
  var ESP = [[10, 2.5, 5], [13, 3.5, 6], [15, 3.5, 8], [20, 3.5, 13]];

  function montarCena(j) {
    elCard.innerHTML = "";
    elCard.classList.remove("tourd__cartao--larga");
    var c = CENAS[j];
    if (j === 6) {
      elCard.classList.add("tourd__cartao--larga");
      elCard.innerHTML = '<div class="tourd__esp">' + ESP.map(function (e, i) {
        return '<div class="tourd__lin" data-lin="' + i + '"><b>' + e[0] + "<small> cm</small></b><span><i style=\"flex:" + e[1] + '"></i><i class="eps" style="flex:' + e[2] + '"></i><i style="flex:' + e[1] + '"></i></span></div>';
      }).join("") + "</div>";
      return;
    }
    if (!c) return;
    elCard.innerHTML = '<svg viewBox="0 0 330 270" class="tourd__svg">' + c[2] + '</svg><div class="tourd__tx"><b id="tit">' + c[0] + "</b><span id=\"sub\">" + c[1] + "</span></div>";
    var g;
    if (j === 0) { g = $("#pesos"); this.pesos = [0, 1, 2].map(function (i) { var r = svg("rect", { x: 70 + i * 70, y: 0, width: 60, height: 50, rx: 6, fill: ["#1E2023", "#1F4BD8", "#1E2023"][i] }); g.appendChild(r); return r; }); }
    if (j === 1) { g = $("#raios"); this.raios = [0, 1, 2, 3, 4].map(function (i) { var p = svg("path", { d: "M70 " + (40 + i * 40) + " q20 -12 40 0 t40 0", stroke: "#F2A900", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }); g.appendChild(p); return p; }); g = $("#ondas"); this.ondas = [0, 1, 2].map(function () { var p = svg("path", { d: "M60 150 q-24 30 0 60", stroke: "#1F4BD8", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }); g.appendChild(p); return p; }); }
    if (j === 2) { g = $("#gotas"); this.gotas = [0, 1, 2, 3, 4, 5].map(function () { var p = svg("path", { d: "M0 -14 C10 0 14 6 0 14 C-14 6 -10 0 0 -14 Z", fill: "#3D8FAE" }); g.appendChild(p); return p; }); }
    if (j === 4) { g = $("#blocos"); this.blocos = [0, 1, 2, 3, 4, 5].map(function (i) { var r = svg("rect", { x: i % 2 ? 40 : 20, y: 210 - i * 36, width: 120, height: 32, rx: 4, fill: i % 2 ? "#A8A39A" : "#B8B3AA" }); g.appendChild(r); return r; }); }
  }

  function animar(j, e, l) {
    var i, k, a;
    if (j === 0) for (i = 0; i < 3; i++) { k = lim((l - (0.3 + i * 0.5)) / 0.45); this.pesos[i].setAttribute("y", 165 - (1 - quica(k)) * 160); this.pesos[i].setAttribute("opacity", k > 0 ? 1 : 0); }
    if (j === 1) {
      for (i = 0; i < 5; i++) { k = (l * 1.4 + i * 0.17) % 1; this.raios[i].setAttribute("transform", "translate(" + k * 70 + ",0)"); this.raios[i].setAttribute("opacity", (1 - k) * (k < 0.1 ? k * 10 : 1)); }
      for (i = 0; i < 3; i++) { k = (l * 0.9 + i * 0.33) % 1; this.ondas[i].setAttribute("transform", "translate(" + k * 60 + "," + -10 * i + ") scale(" + (1 + k * 0.3) + ")"); this.ondas[i].setAttribute("opacity", (1 - k) * 0.9); }
      $("#ok").setAttribute("stroke-dashoffset", 80 * (1 - lim((l - 1.2) / 0.5)));
    }
    if (j === 2) { for (i = 0; i < 6; i++) { k = (l * 0.8 + i * 0.17) % 1; this.gotas[i].setAttribute("transform", "translate(" + (130 + (i % 3) * 5) + "," + (30 + k * 210) + ") scale(" + (0.9 - k * 0.4) + ")"); this.gotas[i].setAttribute("opacity", k < 0.9 ? 1 : (1 - k) * 10); } $("#ok").setAttribute("stroke-dashoffset", 130 * (1 - lim((l - 1.4) / 0.6))); }
    if (j === 4) { for (i = 0; i < 6; i++) { k = lim((l - (0.15 + i * 0.5)) / 0.4); this.blocos[i].setAttribute("y", 210 - i * 36 - (1 - quica(k)) * 180); this.blocos[i].setAttribute("opacity", k > 0 ? 1 : 0); } $("#min").setAttribute("transform", "rotate(" + l * 720 + " 262 70)"); $("#hor").setAttribute("transform", "rotate(" + l * 60 + " 262 70)"); }
    if (j === 5) {
      $("#cond").setAttribute("stroke-dashoffset", 500 * (1 - lim((e - D.elet) / 1.4)));
      a = out((e - D.fixar + 0.1) / 0.5); $("#prat").setAttribute("transform", "translate(" + 140 * (1 - a) + ",0)"); $("#prat").setAttribute("opacity", a);
      var fix = e >= D.fixar - 0.1; $("#tit").textContent = fix ? "Fixação" : "Elétrica"; $("#sub").textContent = fix ? "bucha certa" : "pelo miolo";
    }
    if (j === 6) { var T = [D.dez, D.treze, D.quinze, D.vinte]; for (i = 0; i < 4; i++) { a = out((e - (T[i] - 0.15)) / 0.4); var ln = elCard.querySelector('[data-lin="' + i + '"]'); ln.style.opacity = a; ln.style.transform = "translateX(" + 60 * (1 - a) + "px)"; } }
    if (j === 7) { k = quica(lim(l / 0.7)); $("#pino").setAttribute("transform", "translate(0," + -(1 - k) * 120 + ")"); $("#sombra").setAttribute("rx", 10 + 20 * k); }
  }
  var estado = {};

  function quadro() {
    if (!C3) { C3 = window.ImperioCasa3D; if (!C3 || !C3.tempoTour) { requestAnimationFrame(quadro); return; } }
    var e = C3.tempoTour();
    if (e < 0 || e > D.duracao + 0.3) { if (ativo) parar(); requestAnimationFrame(quadro); return; }
    if (!ativo) { ativo = true; raiz.hidden = false; cenaAtual = -2; if (dica) { dica.hidden = false; setTimeout(function () { dica.hidden = true; }, 4500); } }
    // legendas
    var t = ""; for (var i = 0; i < D.legendas.length; i++) if (e >= D.legendas[i][0] && e < D.legendas[i][1]) { t = D.legendas[i][2]; break; }
    if (t !== legAtual) { legAtual = t; elLeg.textContent = t; elLeg.hidden = !t; }
    // cena (cartão animado)
    var j = -1; for (i = 0; i < 8; i++) if (e >= D.cenas[i] && e < D.cenas[i + 1]) j = i;
    var l = j >= 0 ? e - D.cenas[j] : 0, dur = j >= 0 ? D.cenas[j + 1] - D.cenas[j] : 1;
    if (j !== cenaAtual) { cenaAtual = j; estado = {}; if (j >= 0 && j !== 3) montarCena.call(estado, j); else elCard.innerHTML = ""; }
    var vis = j >= 0 && j !== 3 ? Math.min(out(l / 0.35), lim((dur - l) / 0.15)) : 0;
    elCard.style.opacity = vis; elCard.style.transform = "translateY(" + 40 * (1 - vis) + "px)"; elCard.hidden = vis <= 0;
    if (j >= 0 && j !== 3) animar.call(estado, j, e, l);
    var fl = j === 3 ? Math.min(lim(l / 0.1), lim((dur - l) / 0.12)) : 0;
    elFlash.style.opacity = fl; elFlash.hidden = fl <= 0;
    // áudio sincronizado com o relógio da tour
    if (somLigado && audio) { if (audio.paused && audio.currentTime < audio.duration - 0.2) audio.play().catch(function () {}); if (Math.abs(audio.currentTime - e) > 0.45) audio.currentTime = Math.min(e, audio.duration || e); }
    requestAnimationFrame(quadro);
  }

  function parar() {
    ativo = false; raiz.hidden = true; legAtual = ""; cenaAtual = -2;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    somLigado = false; atualizarBotao();
  }
  function atualizarBotao() {
    btn.setAttribute("aria-pressed", String(somLigado));
    btn.querySelector("span").textContent = somLigado ? "Som ligado" : "Ouvir a tour";
  }
  btn.addEventListener("click", function () {
    if (!audio) { audio = new Audio("assets/audio/tour-explicada.mp3"); audio.preload = "auto"; }
    somLigado = !somLigado;
    if (somLigado) { var e = C3 && C3.tempoTour ? Math.max(0, C3.tempoTour()) : 0; try { audio.currentTime = e; } catch (er) { /* ainda sem metadados */ } audio.play().catch(function () { somLigado = false; atualizarBotao(); }); } else audio.pause();
    atualizarBotao();
  });
  requestAnimationFrame(quadro);
})();

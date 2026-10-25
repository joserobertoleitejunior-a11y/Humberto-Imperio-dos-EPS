/**
 * Movimento ligado à rolagem (sem biblioteca: ~1 laço rAF só quando rola).
 *
 *  [data-letras]        título que se monta letra a letra conforme entra na tela
 *                       ("h" = letras chegam pela direita, rolagem horizontal)
 *  [data-faixa-rolagem] faixa de texto gigante que anda na horizontal quando a página rola na vertical
 *  [data-jornada]       seção em "L": rola na vertical, faz a curva e segue na horizontal (sticky)
 *
 * Nível "baixa": anima palavra por palavra. "estatica": nada se mexe (tudo já aparece montado).
 * Publica window.ImperioMotion.progressoJornada (0–1) pro controle da cena 3D.
 */
(function () {
  "use strict";

  // altura estável da tela (dispositivo.js): a barra de endereço do celular não mexe no 3D
  function alturaTela() { return window.ImperioTela ? window.ImperioTela.altura() : window.innerHeight; }

  var html = document.documentElement;
  var nivel = html.getAttribute("data-qualidade") || "media";
  var parado = nivel === "estatica";
  var porPalavra = nivel === "baixa";

  var titulos = [];
  var faixas = [];
  var jornada = null;
  var ouvintes = [];
  var agendado = false;
  var vh = alturaTela();

  function limitar(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function suave(x) { x = limitar(x); return x * x * (3 - 2 * x); }
  function saida(x) { x = limitar(x); return 1 - Math.pow(1 - x, 3); }

  /* ---------- Divide o título em palavras/letras (leitor de tela lê o texto inteiro) ---------- */
  function dividir(el) {
    var texto = el.textContent.replace(/\s+/g, " ").trim();
    el.setAttribute("aria-label", texto);
    var destaques = Array.prototype.map.call(el.querySelectorAll("em, b, strong"), function (d) { return d.textContent.trim(); });
    el.textContent = "";
    var pecas = [];
    texto.split(" ").forEach(function (palavra, iPal, todas) {
      var p = document.createElement("span");
      p.className = "palavra";
      p.setAttribute("aria-hidden", "true");
      if (destaques.some(function (d) { return d.split(" ").indexOf(palavra.replace(/[.,!?]$/, "")) !== -1; })) p.classList.add("destaque");
      if (porPalavra) {
        p.textContent = palavra;
        pecas.push(p);
      } else {
        palavra.split("").forEach(function (ch) {
          var l = document.createElement("span");
          l.className = "letra";
          l.textContent = ch;
          p.appendChild(l);
          pecas.push(l);
        });
      }
      el.appendChild(p);
      if (iPal < todas.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return pecas;
  }

  function prepararTitulos() {
    document.querySelectorAll("[data-letras]").forEach(function (el) {
      var pecas = dividir(el);
      var item = { el: el, pecas: pecas, modo: el.getAttribute("data-letras"), visivel: false, ultimo: -1, faixa: el.getAttribute("data-faixa-p") };
      titulos.push(item);
    });
    if (!("IntersectionObserver" in window)) { titulos.forEach(function (t) { t.visivel = true; }); return; }
    var obs = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        titulos.forEach(function (t) { if (t.el === en.target) t.visivel = en.isIntersecting; });
      });
      agendar();
    }, { rootMargin: "10% 0px 10% 0px" });
    titulos.forEach(function (t) { obs.observe(t.el); });
  }

  /** p = 0..1 do título montado. Escreve transform/opacity só se mudou. */
  function pintarTitulo(t, p) {
    var q = Math.round(p * 200) / 200;
    if (q === t.ultimo) return;
    t.ultimo = q;
    var n = t.pecas.length;
    var horiz = t.modo === "h";
    for (var i = 0; i < n; i++) {
      var e = saida(p * 1.7 - (i / n) * 0.7);
      var s = t.pecas[i].style;
      if (e >= 1) { s.transform = ""; s.opacity = ""; continue; }
      s.opacity = e < 0.02 ? 0 : 0.15 + e * 0.85;
      s.transform = horiz
        ? "translate3d(" + (1 - e) * 1.4 + "em,0,0) skewX(" + (1 - e) * -14 + "deg)"
        : "translate3d(0," + (1 - e) * 0.85 + "em,0) rotate(" + (1 - e) * 7 + "deg)";
    }
  }

  /* ---------- Faixas horizontais ---------- */
  function prepararFaixas() {
    document.querySelectorAll("[data-faixa-rolagem]").forEach(function (el) {
      faixas.push({ el: el, dir: parseFloat(el.getAttribute("data-faixa-rolagem")) || 1 });
    });
  }

  /* ---------- Jornada em L ---------- */
  function prepararJornada() {
    var el = document.querySelector("[data-jornada]");
    if (!el) return;
    jornada = {
      el: el,
      vertical: el.querySelector("[data-jornada-v]"),
      trilho: el.querySelector("[data-jornada-h]"),
      rotulos: el.querySelector("[data-jornada-rotulos]"),
      paineis: el.querySelectorAll("[data-painel]"),
      p: 0,
    };
  }

  /**
   * A curva do "L": o trecho vertical desacelera ENQUANTO o horizontal acelera
   * (as duas curvas se sobrepõem entre 38% e 54%), então o olho não percebe a troca de direção.
   */
  /** Medidas que só mudam no resize: lidas UMA vez (ler layout a cada quadro travava a rolagem). */
  function medirJornada() {
    var j = jornada;
    if (!j) return;
    // a seção tem 2 fases na MESMA tela fixa: o "L" (data-jornada-l = rolagem em vh, igual à de antes) e,
    // depois, a casa sendo montada com o próprio Blocão. fim = fração da rolagem total que é do "L".
    var l = parseFloat(j.el.getAttribute("data-jornada-l")) || 0;
    var totalPx = j.el.offsetHeight - alturaTela();
    j.fim = l && totalPx > 0 ? Math.min(1, (l / 100) * alturaTela() / totalPx) : 1;
    j.largura = Math.max(0, j.trilho.scrollWidth - window.innerWidth);
    j.alturaV = Math.max(0, j.vertical.scrollHeight - j.vertical.parentElement.clientHeight * 0.6);
    j.alturaSecao = j.el.offsetHeight;
    j.topoSecao = j.el.getBoundingClientRect().top + window.scrollY;
    j.medidasPaineis = Array.prototype.map.call(j.paineis, function (pn) { return { centro: pn.offsetLeft + pn.offsetWidth / 2 }; });
    j.medido = true;
  }

  /** Deslocamento do trilho que deixa a ficha i no meio da tela (sem passar das pontas). */
  function centralizar(j, i) {
    return Math.min(j.largura, Math.max(0, j.medidasPaineis[i].centro - window.innerWidth / 2));
  }

  function pintarJornada() {
    var j = jornada;
    if (!j.medido) medirJornada();
    // posição da seção calculada com o scrollY (sem getBoundingClientRect = sem forçar layout)
    var topo = j.topoSecao - window.scrollY;
    var total = j.alturaSecao - vh;
    var bruto = total > 0 ? limitar(-topo / total) : 0;
    j.pTotal = bruto;
    j.passou = total > 0 ? Math.max(0, -topo - total) / vh : 0; // telas já roladas depois do fim da seção
    j.casa = j.fim < 1 ? limitar((bruto - j.fim) / (1 - j.fim)) : 0; // 0..1 da fase da casa
    var p = limitar(bruto / j.fim);                                    // 0..1 do "L" (como sempre foi)
    j.p = p;
    j.dentro = topo < vh && topo + j.alturaSecao > 0;
    j.entrada = limitar(1 - topo / vh); // 0 quando a seção encosta no pé da tela, 1 quando chega no topo
    if (parado) return;
    if (!j.dentro) {
      if (j.faseH) { j.faseH = false; document.documentElement.classList.remove("fase-h"); }
      if (j.faseCasa) { j.faseCasa = false; document.documentElement.classList.remove("fase-casa"); }
      return;
    }
    var v = suave(p / 0.5);                  // perna vertical: o bloco desmonta e abre
    // perna horizontal: LINEAR (1 px de rolagem = 1 px de movimento; o easing antigo "empacava" nas pontas)
    var hz = limitar((p - 0.44) / 0.5);
    var tx = (1 - hz) * 30 - hz * j.largura;
    // celular (1 ficha por tela): vai de ficha em ficha e cada uma passa CENTRALIZADA (desacelera nela, sem travar)
    var n = j.medidasPaineis.length;
    if (window.innerWidth < 760 && n > 1) {
      var k = hz * (n - 1);
      var a = Math.min(n - 2, Math.floor(k));
      var x0 = centralizar(j, a);
      var x1 = centralizar(j, a + 1);
      tx = -(x0 + (x1 - x0) * suave(k - a)) + Math.max(0, 1 - k) * 30;
    }
    j.vertical.style.transform = "translate3d(" + -hz * 22 + "vw," + -v * j.alturaV + "px,0)";
    var opV = 1 - suave((p - 0.42) / 0.08);
    j.vertical.style.opacity = opV;
    j.vertical.style.visibility = opV < 0.01 ? "hidden" : "visible"; // sem pintar o que não se vê
    j.trilho.style.transform = "translate3d(" + tx + "px," + (1 - suave((p - 0.38) / 0.14)) * 40 + "vh,0)";
    // quando a casa entra, tudo do "L" esmaece no mesmo ritmo do céu da maquete (sem sumir de uma vez)
    var sai = 1 - suave(j.casa / 0.018); // primeiro o "L" sai...  (a casa entra logo depois: casa.js)
    if (sai !== j.sai) { j.sai = sai; j.el.style.setProperty("--sai", sai.toFixed(3)); }
    var opH = suave((p - 0.42) / 0.08) * sai;
    j.trilho.style.opacity = opH;
    j.trilho.style.visibility = opH < 0.01 ? "hidden" : "visible";
    // painel em foco = o mais perto do centro da tela (conta feita com os números em cache)
    var foco = 0;
    var melhor = 1e9;
    for (var i = 0; i < j.medidasPaineis.length; i++) {
      var d = Math.abs(tx + j.medidasPaineis[i].centro - window.innerWidth / 2);
      if (d < melhor) { melhor = d; foco = i; }
    }
    if (foco !== j.foco || (hz > 0.05) !== j.focoLigado) {
      Array.prototype.forEach.call(j.paineis, function (pn, k) { pn.classList.toggle("em-foco", hz > 0.05 && k === foco); });
      j.focoLigado = hz > 0.05;
    }
    var faseH = hz > 0.05;
    if (faseH !== j.faseH) { j.faseH = faseH; document.documentElement.classList.toggle("fase-h", faseH); }
    // fase da casa (mesma tela): fichas, botões e textos do "L" saem; a camada da casa entra por cima
    var faseCasa = j.casa > 0;
    if (faseCasa !== j.faseCasa) { j.faseCasa = faseCasa; document.documentElement.classList.toggle("fase-casa", faseCasa); }
    j.foco = foco;
    j.hz = hz;
  }

  /* ---------- Laço ---------- */
  function quadro() {
    agendado = false;
    vh = alturaTela();
    var y = window.scrollY;
    // 1) só leituras (ANTES de qualquer escrita: ler a posição depois de mexer no transform da jornada obrigava o
    //    navegador a recalcular a página inteira a cada quadro — era o que travava a rolagem rápida)
    var ativos = [];
    if (!parado) {
      titulos.forEach(function (t) {
        if (!t.visivel) return;
        ativos.push([t, t.faixa && jornada ? null : t.el.getBoundingClientRect()]);
      });
    }
    if (jornada) pintarJornada();
    if (!parado) {
      ativos.forEach(function (par) {
        if (par[1] === null) { // título preso à jornada: segue o progresso dela (sem ler layout)
          var f = par[0].faixa.split(",").map(Number);
          par[1] = limitar((jornada.p - f[0]) / (f[1] - f[0]));
        }
      });
      ativos.forEach(function (par) {                      // 2) só escritas
        var t = par[0];
        var p = par[1];
        if (typeof p !== "number") {
          var r = p;
          // "h": monta conforme entra pela DIREITA (painéis da jornada andam na horizontal)
          p = t.modo === "h" && t.el.closest("[data-jornada-h]")
            ? limitar((window.innerWidth - r.left) / (window.innerWidth * 0.45))
            : limitar((vh - r.top) / (vh * 0.55));
        }
        pintarTitulo(t, p);
      });
      faixas.forEach(function (f) {
        f.el.style.transform = "translate3d(" + ((y * 0.35 * f.dir) % 1600) * -1 + "px,0,0)";
      });
    }
    ouvintes.forEach(function (fn) { fn(jornada); });
  }

  function agendar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(quadro);
  }

  /**
   * Gesto HORIZONTAL nas fichas (dedo pro lado ou trackpad/shift+roda) também avança a jornada:
   * converte o deslize em rolagem vertical na proporção certa (rolagem da fase horizontal ÷ largura da trilha).
   */
  function ligarGestoHorizontal() {
    if (!jornada) return;
    var area = jornada.trilho;
    var x0 = null;
    var y0 = null;
    var decidiu = false;
    var horiz = false;
    function razao() {
      var j = jornada;
      if (!j.medido) medirJornada();
      var total = j.alturaSecao - alturaTela();
      return j.largura > 0 ? (0.5 * j.fim * total) / j.largura : 0; // a perna horizontal é metade do "L
    }
    area.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") return;
      x0 = e.clientX; y0 = e.clientY; decidiu = false; horiz = false;
    });
    area.addEventListener("pointermove", function (e) {
      if (x0 === null || e.pointerType === "mouse") return;
      var dx = e.clientX - x0;
      var dy = e.clientY - y0;
      if (!decidiu && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) { decidiu = true; horiz = Math.abs(dx) > Math.abs(dy); }
      if (!horiz) return;
      window.scrollBy({ top: -(e.clientX - x0) * razao(), behavior: "instant" });
      x0 = e.clientX; y0 = e.clientY;
    });
    function fim() { x0 = null; }
    area.addEventListener("pointerup", fim);
    area.addEventListener("pointercancel", fim);
    // trackpad / roda com shift: deltaX vira rolagem
    jornada.el.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      window.scrollBy({ top: e.deltaX * razao(), behavior: "instant" });
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!parado) prepararTitulos();
    prepararFaixas();
    prepararJornada();
    ligarGestoHorizontal();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", function () { if (jornada) jornada.medido = false; agendar(); }, { passive: true });
    window.addEventListener("load", function () { if (jornada) jornada.medido = false; agendar(); }, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (jornada) jornada.medido = false; agendar(); });
    agendar();
  });

  window.ImperioMotion = {
    aoRolar: function (fn) { ouvintes.push(fn); agendar(); },
    /** Usado pelo vídeo (quadro a quadro): calcula e pinta agora, sem esperar o rAF. */
    atualizarAgora: function () { quadro(); },
    jornada: function () { return jornada; },
  };
})();

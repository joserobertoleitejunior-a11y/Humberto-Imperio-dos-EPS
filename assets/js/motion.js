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

  var html = document.documentElement;
  var nivel = html.getAttribute("data-qualidade") || "media";
  var parado = nivel === "estatica";
  var porPalavra = nivel === "baixa";

  var titulos = [];
  var faixas = [];
  var jornada = null;
  var ouvintes = [];
  var agendado = false;
  var vh = window.innerHeight;

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
  function pintarJornada() {
    var j = jornada;
    var r = j.el.getBoundingClientRect();
    var total = r.height - vh;
    var p = total > 0 ? limitar(-r.top / total) : 0;
    j.p = p;
    j.dentro = r.top < vh && r.bottom > 0;
    j.entrada = limitar(1 - r.top / vh); // 0 quando a seção encosta no pé da tela, 1 quando chega no topo
    if (parado) return;
    var largura = j.trilho.scrollWidth - window.innerWidth;
    var v = suave(p / 0.5);                  // perna vertical: o bloco desmonta e abre
    var hz = suave((p - 0.44) / 0.56);       // perna horizontal: ficha de cada peça (começa antes da vertical terminar)
    var alturaV = j.vertical.scrollHeight - j.vertical.parentElement.clientHeight * 0.6;
    j.vertical.style.transform = "translate3d(" + -hz * 22 + "vw," + -v * Math.max(0, alturaV) + "px,0)";
    j.vertical.style.opacity = 1 - suave((p - 0.42) / 0.08);
    var tx = (1 - hz) * 30 - hz * largura;
    j.trilho.style.transform = "translate3d(" + tx + "px," + (1 - suave((p - 0.38) / 0.14)) * 40 + "vh,0)";
    j.trilho.style.opacity = suave((p - 0.42) / 0.08);
    // painel em foco = o mais perto do centro da tela
    var foco = 0;
    var melhor = 1e9;
    Array.prototype.forEach.call(j.paineis, function (pn, i) {
      var b = pn.getBoundingClientRect();
      var d = Math.abs(b.left + b.width / 2 - window.innerWidth / 2);
      if (d < melhor) { melhor = d; foco = i; }
    });
    Array.prototype.forEach.call(j.paineis, function (pn, i) { pn.classList.toggle("em-foco", hz > 0.05 && i === foco); });
    j.foco = foco;
    j.hz = hz;
  }

  /* ---------- Laço ---------- */
  function quadro() {
    agendado = false;
    vh = window.innerHeight;
    var y = window.scrollY;
    if (jornada) pintarJornada();
    if (!parado) {
      titulos.forEach(function (t) {
        if (!t.visivel) return;
        var p;
        if (t.faixa && jornada) {
          var f = t.faixa.split(",").map(Number);
          p = limitar((jornada.p - f[0]) / (f[1] - f[0]));
        } else {
          var r = t.el.getBoundingClientRect();
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

  document.addEventListener("DOMContentLoaded", function () {
    if (!parado) prepararTitulos();
    prepararFaixas();
    prepararJornada();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar, { passive: true });
    agendar();
  });

  window.ImperioMotion = {
    aoRolar: function (fn) { ouvintes.push(fn); agendar(); },
    /** Usado pelo vídeo (quadro a quadro): calcula e pinta agora, sem esperar o rAF. */
    atualizarAgora: function () { quadro(); },
    jornada: function () { return jornada; },
  };
})();

/**
 * Gráficos do painel em SVG/HTML puro (sem biblioteca externa: abre rápido
 * e funciona offline). Uma cor de destaque (ouro) + cinza; rankings com
 * rótulo e valor escritos, nunca só cor.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var fmt = new Intl.NumberFormat("pt-BR");

  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  /** Colunas por dia. serie: [{dia: Date, total}] */
  function colunas(alvo, serie, rotulo) {
    alvo.replaceChildren();
    var L = 640, A = 200, base = 176, topo = 14;
    var max = Math.max(1, Math.max.apply(null, serie.map(function (s) { return s.total; })));
    var passo = L / serie.length;
    var larg = Math.max(2, Math.min(18, passo * 0.68));
    var g = svg("svg", { viewBox: "0 0 " + L + " " + A, role: "img", "aria-label": rotulo + ": " + serie.length + " dias", preserveAspectRatio: "none" });
    [0.5, 1].forEach(function (f) {
      var y = base - (base - topo) * f;
      g.appendChild(svg("line", { x1: 0, x2: L, y1: y, y2: y, class: "grade-linha" }));
    });
    var maior = 0;
    serie.forEach(function (s, i) { if (s.total >= serie[maior].total) maior = i; });
    serie.forEach(function (s, i) {
      var h = ((base - topo) * s.total) / max;
      var r = svg("rect", { x: i * passo + (passo - larg) / 2, y: base - h, width: larg, height: Math.max(h, s.total ? 2 : 0), rx: Math.min(4, larg / 3), class: i === maior ? "barra barra--destaque" : "barra" });
      var t = svg("title");
      t.textContent = s.dia.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) + ": " + fmt.format(s.total) + " " + rotulo.toLowerCase();
      r.appendChild(t);
      g.appendChild(r);
    });
    var marcas = [0, Math.floor(serie.length / 2), serie.length - 1];
    marcas.forEach(function (i) {
      var tx = svg("text", { x: i * passo + passo / 2, y: A - 4, class: "eixo", "text-anchor": i === 0 ? "start" : i === serie.length - 1 ? "end" : "middle" });
      tx.textContent = serie[i].dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      g.appendChild(tx);
    });
    var mx = svg("text", { x: 2, y: topo - 2, class: "eixo" });
    mx.textContent = "máx. " + fmt.format(max);
    g.appendChild(mx);
    alvo.appendChild(g);
  }

  /** Barras horizontais ranqueadas: [{rotulo, total}] */
  function ranking(alvo, itens, limite, traduzir) {
    alvo.replaceChildren();
    if (!itens.length) { alvo.appendChild(criar("p", "vazio", "Sem dados no período.")); return; }
    var max = itens[0].total || 1;
    var lista = criar("ol", "ranking");
    itens.slice(0, limite || 6).forEach(function (it, i) {
      var li = criar("li");
      var topo = criar("div", "ranking__topo");
      topo.appendChild(criar("span", "", traduzir ? traduzir(it.rotulo) : it.rotulo));
      topo.appendChild(criar("strong", "", fmt.format(it.total)));
      var trilho = criar("div", "ranking__trilho");
      var barra = criar("div", "ranking__barra" + (i === 0 ? " ranking__barra--destaque" : ""));
      barra.style.width = Math.max(3, (it.total / max) * 100) + "%";
      trilho.appendChild(barra);
      li.appendChild(topo);
      li.appendChild(trilho);
      lista.appendChild(li);
    });
    alvo.appendChild(lista);
  }

  /** Funil: cada etapa mostra o total e a % em relação à primeira. */
  function funil(alvo, etapas) {
    alvo.replaceChildren();
    var base = etapas[0].total || 1;
    var lista = criar("ol", "funil");
    etapas.forEach(function (e, i) {
      var li = criar("li");
      var barra = criar("div", "funil__barra");
      barra.style.width = Math.max(8, (e.total / base) * 100) + "%";
      if (i === etapas.length - 1) barra.classList.add("funil__barra--destaque");
      li.appendChild(barra);
      var txt = criar("div", "funil__texto");
      txt.appendChild(criar("span", "", e.rotulo));
      txt.appendChild(criar("strong", "", fmt.format(e.total) + (i ? " · " + (Math.round((e.total / base) * 1000) / 10).toString().replace(".", ",") + "%" : "")));
      li.appendChild(txt);
      lista.appendChild(li);
    });
    alvo.appendChild(lista);
  }

  /** Linha minúscula pro cartão de KPI. */
  function sparkline(serie) {
    var L = 120, A = 32;
    var max = Math.max(1, Math.max.apply(null, serie));
    var passo = L / Math.max(1, serie.length - 1);
    var pts = serie.map(function (v, i) { return (i * passo).toFixed(1) + "," + (A - 3 - (v / max) * (A - 6)).toFixed(1); });
    var g = svg("svg", { viewBox: "0 0 " + L + " " + A, class: "sparkline", "aria-hidden": "true", preserveAspectRatio: "none" });
    g.appendChild(svg("polyline", { points: pts.join(" "), fill: "none" }));
    return g;
  }

  window.ImperioGraficos = { colunas: colunas, ranking: ranking, funil: funil, sparkline: sparkline };
})();

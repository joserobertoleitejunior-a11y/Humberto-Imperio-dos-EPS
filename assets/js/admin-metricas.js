/**
 * Cálculos do dashboard (sem DOM) — testados em tests/admin-metricas.test.js.
 */
(function (raiz, fabrica) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.ImperioMetricas = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DIA = 86400000;

  function noPeriodo(lista, inicio, fim) {
    return lista.filter(function (l) { var t = new Date(l.criado_em).getTime(); return t >= inicio && t < fim; });
  }

  function unicos(lista, chave) {
    var s = {};
    lista.forEach(function (l) { if (l[chave]) s[l[chave]] = 1; });
    return Object.keys(s).length;
  }

  function variacao(atual, anterior) {
    if (!anterior) return atual ? null : 0;
    return Math.round(((atual - anterior) / anterior) * 100);
  }

  function origem(ref) {
    if (!ref) return "Direto";
    if (/instagram/.test(ref)) return "Instagram";
    if (/google\./.test(ref)) return "Google";
    if (/facebook|fb\./.test(ref)) return "Facebook";
    if (/wa\.me|whatsapp/.test(ref)) return "WhatsApp";
    try { return new URL(ref).hostname.replace(/^www\./, ""); } catch (e) { return "Outros"; }
  }

  function ranking(lista, chave) {
    var m = {};
    lista.forEach(function (l) {
      var k = typeof chave === "function" ? chave(l) : l[chave];
      if (k === undefined || k === null || k === "") return;
      m[k] = (m[k] || 0) + 1;
    });
    return Object.keys(m).map(function (k) { return { rotulo: k, total: m[k] }; }).sort(function (a, b) { return b.total - a.total; });
  }

  function serieDiaria(lista, dias, agora) {
    var hoje = new Date(agora);
    hoje.setHours(0, 0, 0, 0);
    var inicio = hoje.getTime() - (dias - 1) * DIA;
    var serie = [];
    for (var i = 0; i < dias; i++) serie.push({ dia: new Date(inicio + i * DIA), total: 0 });
    lista.forEach(function (l) {
      var d = new Date(l.criado_em);
      d.setHours(0, 0, 0, 0);
      var i = Math.round((d.getTime() - inicio) / DIA);
      if (i >= 0 && i < dias) serie[i].total++;
    });
    return serie;
  }

  /**
   * @param dados {visitas, cliques, clientes, orcamentos}
   * @param dias  período (7, 30, 90)
   */
  function resumo(dados, dias, agora) {
    agora = agora || Date.now();
    var fim = agora + 1;
    var ini = agora - dias * DIA;
    var iniAnt = ini - dias * DIA;
    function par(lista) { return [noPeriodo(lista, ini, fim), noPeriodo(lista, iniAnt, ini)]; }

    var v = par(dados.visitas || []);
    var c = par(dados.cliques || []);
    var cl = par(dados.clientes || []);
    var o = par(dados.orcamentos || []);
    var whats = c.map(function (l) { return l.filter(function (x) { return x.tipo === "whatsapp" || x.tipo === "calculadora" || x.tipo === "promocao"; }); });
    var fechados = o.map(function (l) { return l.filter(function (x) { return x.status === "fechado"; }); });
    var m2 = o[0].reduce(function (s, x) { return s + (Number(x.area_m2) || 0); }, 0);
    var visitantes = unicos(v[0], "visitante_id");

    return {
      kpis: {
        visitantes: { valor: visitantes, variacao: variacao(visitantes, unicos(v[1], "visitante_id")) },
        contatos: { valor: whats[0].length, variacao: variacao(whats[0].length, whats[1].length) },
        cadastros: { valor: cl[0].length, variacao: variacao(cl[0].length, cl[1].length) },
        orcamentos: { valor: o[0].length, variacao: variacao(o[0].length, o[1].length) },
        m2: { valor: Math.round(m2), variacao: null },
        conversao: { valor: visitantes ? Math.round((o[0].length / visitantes) * 1000) / 10 : 0, variacao: null },
      },
      funil: [
        { rotulo: "Visitantes", total: visitantes },
        { rotulo: "Chamaram no WhatsApp", total: whats[0].length },
        { rotulo: "Orçamentos", total: o[0].length },
        { rotulo: "Fechados", total: fechados[0].length },
      ],
      serieVisitas: serieDiaria(v[0], dias, agora),
      serieOrcamentos: serieDiaria(o[0], dias, agora),
      origens: ranking(v[0], function (x) { return origem(x.referencia); }),
      blocos: ranking(o[0], "bloco"),
      cidades: ranking(o[0].concat(cl[0]), "cidade"),
      status: ranking(dados.orcamentos || [], "status"),
    };
  }

  return { resumo: resumo, origem: origem, ranking: ranking, serieDiaria: serieDiaria, variacao: variacao };
});

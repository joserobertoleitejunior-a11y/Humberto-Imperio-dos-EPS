/**
 * Regra de negócio da calculadora de obra (sem DOM).
 * Roda no navegador (window.ImperioCalculo) e no Node (testes em tests/).
 */
(function (raiz, fabrica) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.ImperioCalculo = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Vãos padrão de mercado (m²) — porta 0,80 × 2,10 e janela 1,20 × 1,00.
  var AREA_PORTA = 0.8 * 2.1;
  var AREA_JANELA = 1.2 * 1.0;

  function numero(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v || "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function inteiro(v) {
    return Math.max(0, Math.floor(numero(v)));
  }

  function arredondar(v, casas) {
    var f = Math.pow(10, casas || 0);
    return Math.round(v * f) / f;
  }

  /**
   * @param {object} e   { modo: "medidas"|"area", comprimento, altura, area, portas, janelas, blocoId }
   * @param {object} cfg { medidaBloco: {largura, altura}|null, perdaPercentual, blocos: [] }
   * @returns {{ok:boolean, erro?:string, areaBruta, areaVaos, areaLiquida, blocos:number|null, bloco}}
   */
  function calcularObra(e, cfg) {
    e = e || {};
    cfg = cfg || {};
    var bruta = e.modo === "area" ? numero(e.area) : numero(e.comprimento) * numero(e.altura);
    if (!bruta) return { ok: false, erro: "Informe as medidas da parede." };
    if (bruta > 20000) return { ok: false, erro: "Área muito grande — fale direto com a fábrica." };

    var vaos = inteiro(e.portas) * AREA_PORTA + inteiro(e.janelas) * AREA_JANELA;
    if (vaos >= bruta) return { ok: false, erro: "Os vãos (portas e janelas) passam da área da parede." };

    var liquida = bruta - vaos;
    var bloco = (cfg.blocos || []).filter(function (b) { return b.id === e.blocoId; })[0] || null;
    var face = cfg.medidaBloco;
    var qtd = null;
    if (face && numero(face.largura) && numero(face.altura)) {
      var perda = 1 + Math.max(0, numero(cfg.perdaPercentual)) / 100;
      qtd = Math.ceil((liquida / (numero(face.largura) * numero(face.altura))) * perda);
    }
    return {
      ok: true,
      areaBruta: arredondar(bruta, 2),
      areaVaos: arredondar(vaos, 2),
      areaLiquida: arredondar(liquida, 2),
      blocos: qtd,
      bloco: bloco,
    };
  }

  function formatarM2(v) {
    return String(arredondar(v, 2)).replace(".", ",") + " m²";
  }

  /** Mensagem pronta pro WhatsApp com o resumo da calculadora. */
  function mensagemWhatsApp(r, e, cliente) {
    var linhas = ["Olá! Fiz a simulação no site do Império do EPS:", ""];
    if (r.bloco) linhas.push("• Bloco: " + r.bloco.nome);
    if (e && e.modo !== "area") linhas.push("• Paredes: " + numero(e.comprimento) + " m × " + numero(e.altura) + " m");
    if (r.areaVaos) linhas.push("• Descontando " + inteiro(e.portas) + " porta(s) e " + inteiro(e.janelas) + " janela(s)");
    linhas.push("• Área de parede: " + formatarM2(r.areaLiquida));
    if (r.blocos) linhas.push("• Estimativa: " + r.blocos + " blocos (com perda)");
    linhas.push("", "Quero o orçamento e o prazo de entrega.");
    if (cliente && cliente.nome) linhas.push("", "Nome: " + cliente.nome + (cliente.cidade ? " — " + cliente.cidade : ""));
    return linhas.join("\n");
  }

  return { calcularObra: calcularObra, mensagemWhatsApp: mensagemWhatsApp, formatarM2: formatarM2, AREA_PORTA: AREA_PORTA, AREA_JANELA: AREA_JANELA };
});

/**
 * Interface da calculadora de obra. A conta fica em calculadora-nucleo.js
 * (testada em tests/). Envia o resumo pro WhatsApp e, com Supabase ativo,
 * grava o pedido na tabela "orcamentos" (aparece no painel).
 */
(function () {
  "use strict";

  var cfg = window.IMPERIO_CONFIG || {};
  var Calc = window.ImperioCalculo;
  var ultimo = null;

  function ler(form) {
    var g = function (n) { var i = form.elements[n]; return i ? i.value : ""; };
    return {
      modo: (form.querySelector("input[name=modo]:checked") || {}).value || "medidas",
      comprimento: g("comprimento"),
      altura: g("altura"),
      area: g("area"),
      portas: g("portas"),
      janelas: g("janelas"),
      blocoId: g("bloco"),
    };
  }

  function preencherBlocos(sel) {
    (cfg.blocos || []).forEach(function (b, i) {
      var o = document.createElement("option");
      o.value = b.id;
      o.textContent = b.nome + " — " + b.uso;
      if (i === 2) o.selected = true;
      sel.appendChild(o);
    });
  }

  function formatar(v, inteiro) {
    return inteiro ? String(Math.round(v)) : String(Math.round(v * 100) / 100).replace(".", ",");
  }

  function animarNumero(el, alvo, inteiro) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = formatar(alvo, inteiro); return; }
    var inicio = performance.now();
    (function passo(t) {
      var p = Math.min(1, (t - inicio) / 600);
      el.textContent = formatar(alvo * (1 - Math.pow(1 - p, 3)), inteiro);
      if (p < 1) requestAnimationFrame(passo);
    })(inicio);
  }

  function mostrar(form, r) {
    var saida = form.querySelector("[data-calc-resultado]");
    var erro = form.querySelector("[data-calc-erro]");
    var enviar = form.querySelector("[data-calc-enviar]");
    if (!r.ok) {
      erro.textContent = r.erro;
      saida.classList.remove("pronto");
      enviar.disabled = true;
      ultimo = null;
      return;
    }
    erro.textContent = "";
    saida.classList.add("pronto");
    enviar.disabled = false;
    animarNumero(saida.querySelector("[data-calc-area]"), r.areaLiquida, false);
    var qtd = saida.querySelector("[data-calc-qtd]");
    var nota = saida.querySelector("[data-calc-nota]");
    if (r.blocos) {
      animarNumero(qtd, r.blocos, true);
      nota.textContent = "Estimativa com " + (cfg.perdaPercentual || 0) + "% de perda. A fábrica confirma no orçamento.";
    } else {
      qtd.textContent = "sob consulta";
      nota.textContent = "A fábrica calcula a quantidade exata de blocos e o frete pelo WhatsApp.";
    }
    saida.querySelector("[data-calc-bloco]").textContent = r.bloco ? r.bloco.nome : "–";
    ultimo = r;
  }

  function trocarModo(form) {
    var modo = ler(form).modo;
    form.querySelectorAll("[data-modo]").forEach(function (g) { g.hidden = g.getAttribute("data-modo") !== modo; });
  }

  function gravarOrcamento(entrada, r, cliente) {
    var sb = window.ImperioSupabase;
    if (!sb || !sb.pronto) return;
    sb.cliente()
      .then(function (c) {
        return c.from("orcamentos").insert({
          nome: (cliente && cliente.nome) || "",
          whatsapp: cliente ? String(cliente.whatsapp || "").replace(/\D/g, "") : "",
          cidade: (cliente && cliente.cidade) || "",
          bloco: r.bloco ? r.bloco.nome : "",
          area_m2: r.areaLiquida,
          blocos_estimados: r.blocos,
          detalhes: entrada,
          origem: "calculadora",
          visitante_id: (window.ImperioAnalytics && window.ImperioAnalytics.visitanteId()) || "",
        });
      })
      .then(function (res) { if (res && res.error) throw res.error; })
      .catch(function (erro) { console.warn("[Império] orçamento:", erro); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("[data-calculadora]");
    if (!form || !Calc) return;
    preencherBlocos(form.elements.bloco);
    trocarModo(form);

    form.addEventListener("input", function () { mostrar(form, Calc.calcularObra(ler(form), cfg)); });
    form.addEventListener("change", function (e) {
      if (e.target.name === "modo") trocarModo(form);
      mostrar(form, Calc.calcularObra(ler(form), cfg));
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    form.querySelector("[data-calc-enviar]").addEventListener("click", function () {
      if (!ultimo) return;
      var entrada = ler(form);
      var cliente = window.ImperioCliente && window.ImperioCliente.obter();
      gravarOrcamento(entrada, ultimo, cliente);
      window.open(window.ImperioWhatsApp(Calc.mensagemWhatsApp(ultimo, entrada, cliente)), "_blank", "noopener");
    });

    form.querySelectorAll("[data-passo]").forEach(function (b) {
      b.addEventListener("click", function () {
        var alvo = form.elements[b.getAttribute("data-alvo")];
        var v = Math.max(0, (parseInt(alvo.value, 10) || 0) + parseInt(b.getAttribute("data-passo"), 10));
        alvo.value = v;
        mostrar(form, Calc.calcularObra(ler(form), cfg));
      });
    });

    mostrar(form, Calc.calcularObra(ler(form), cfg));
  });
})();

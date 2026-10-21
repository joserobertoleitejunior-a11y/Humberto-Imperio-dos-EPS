/**
 * Rastreamento leve: páginas vistas, cliques nos CTAs e uso da calculadora.
 * Base: San Comércio. Só grava com Supabase ativo; nunca trava a navegação.
 */
(function () {
  "use strict";

  var CHAVE_VISITANTE = "imperioVisitanteId";

  function visitanteId() {
    try {
      var id = localStorage.getItem(CHAVE_VISITANTE);
      if (!id) {
        id = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(CHAVE_VISITANTE, id);
      }
      return id;
    } catch (erro) {
      return "";
    }
  }

  function clienteWhatsapp() {
    var c = window.ImperioCliente && window.ImperioCliente.obter();
    return c && c.whatsapp ? String(c.whatsapp).replace(/\D/g, "") : "";
  }

  function registrar(tabela, dados) {
    var sb = window.ImperioSupabase;
    if (!sb || !sb.pronto) return;
    var linha = Object.assign(
      { pagina: location.pathname, visitante_id: visitanteId(), cliente_whatsapp: clienteWhatsapp() },
      dados
    );
    sb.cliente()
      .then(function (c) { return c.from(tabela).insert(linha); })
      .then(function (r) { if (r && r.error) throw r.error; })
      .catch(function (erro) { console.warn("[Império] analytics (" + tabela + "):", erro); });
  }

  function tipoDoClique(alvo) {
    if (alvo.hasAttribute("data-link-instagram")) return "instagram";
    if (alvo.hasAttribute("data-link-maps")) return "mapa";
    if (alvo.hasAttribute("data-link-google")) return "google";
    if (alvo.hasAttribute("data-link-tel")) return "ligar";
    if (alvo.hasAttribute("data-link-facebook")) return "facebook";
    if (alvo.hasAttribute("data-calc-enviar")) return "calculadora";
    if (alvo.hasAttribute("data-promo")) return "promocao";
    return "whatsapp";
  }

  document.addEventListener("DOMContentLoaded", function () {
    registrar("paginas_vistas", { referencia: document.referrer || "" });
    document.addEventListener("click", function (evento) {
      var alvo = evento.target.closest("[data-whatsapp], [data-link-instagram], [data-link-maps], [data-link-google], [data-link-tel], [data-link-facebook], [data-calc-enviar], [data-promo]");
      if (!alvo) return;
      registrar("cliques", {
        tipo: tipoDoClique(alvo),
        detalhe: (alvo.getAttribute("data-rotulo") || alvo.textContent || "").trim().slice(0, 60),
      });
    });
  });

  window.ImperioAnalytics = { visitanteId: visitanteId, registrar: registrar };
})();

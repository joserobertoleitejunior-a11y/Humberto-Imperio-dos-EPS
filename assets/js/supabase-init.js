/**
 * Inicialização do Supabase sob demanda (base: San Comércio).
 * O SDK (~150 KB) só é baixado depois do load + ociosidade, nunca bloqueia
 * a abertura do site. Uso: ImperioSupabase.cliente().then(c => c.from(...)).
 * Sem config preenchida em config.js → pronto=false e o site segue só com WhatsApp.
 */
(function () {
  "use strict";

  var cfg = (window.IMPERIO_CONFIG || {}).supabase || {};
  var SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  var promessa = null;

  if (!cfg.url || !cfg.anonKey) {
    window.ImperioSupabase = {
      pronto: false,
      cliente: function () { return Promise.reject(new Error("Supabase não configurado")); },
    };
    return;
  }

  function carregarSdk(imediato) {
    if (promessa) return promessa;
    promessa = new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      function baixar() {
        var tag = document.createElement("script");
        tag.src = SDK;
        tag.async = true;
        tag.onload = function () { resolve(window.supabase); };
        tag.onerror = function () { promessa = null; reject(new Error("SDK do Supabase não carregou")); };
        document.head.appendChild(tag);
      }
      if (imediato) return baixar();
      function ocioso() {
        if (window.requestIdleCallback) window.requestIdleCallback(baixar, { timeout: 2500 });
        else setTimeout(baixar, 800);
      }
      if (document.readyState === "complete") ocioso();
      else window.addEventListener("load", ocioso, { once: true });
    }).then(function (lib) {
      return lib.createClient(cfg.url, cfg.anonKey);
    });
    return promessa;
  }

  window.ImperioSupabase = {
    pronto: true,
    /** @param {boolean} imediato  true no painel admin (precisa do SDK já). */
    cliente: function (imediato) { return carregarSdk(imediato); },
  };
})();

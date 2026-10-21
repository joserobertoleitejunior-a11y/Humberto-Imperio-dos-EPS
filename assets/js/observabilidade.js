/**
 * Sentry no navegador (PADROES-AGENCIA.md §3.1). Só liga se sentryDsn
 * estiver preenchido em config.js. Carrega o SDK depois do load.
 */
(function () {
  "use strict";
  var dsn = (window.IMPERIO_CONFIG || {}).sentryDsn;
  if (!dsn) return;
  window.addEventListener("load", function () {
    var tag = document.createElement("script");
    tag.src = "https://browser.sentry-cdn.com/8.33.1/bundle.min.js";
    tag.crossOrigin = "anonymous";
    tag.onload = function () {
      if (window.Sentry) window.Sentry.init({ dsn: dsn, environment: location.hostname, tracesSampleRate: 0 });
    };
    document.head.appendChild(tag);
  }, { once: true });
})();

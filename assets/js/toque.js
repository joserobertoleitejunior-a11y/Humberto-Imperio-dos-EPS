/**
 * Blocão interativo: o cliente mexe nas peças com o dedo (ou o mouse).
 *  - Arrastar EM CIMA de uma peça → puxa a peça (concreto ou EPS) pra onde quiser.
 *  - Arrastar fora das peças → gira o bloco e mostra todos os ângulos.
 *  - Botões: Separar mais · Juntar · Só EPS · Só concreto · Tudo · Girar livre.
 *  - Rolou a página → tudo volta sozinho pro lugar que a rolagem manda.
 *
 * Celular: por padrão a área do bloco aceita arrasto pro LADO (girar/puxar peça) e deixa o
 * arrasto pra CIMA/BAIXO rolar a página. "Girar livre" libera todos os ângulos (o arrasto
 * vertical passa a mexer no bloco); rolar fora do bloco desliga de novo.
 */
(function () {
  "use strict";

  var B = null;
  var modoLivre = false;
  var arrastando = false;
  var yInteracao = null;
  var botoesFiltro = [];

  function pegarB() {
    B = window.ImperioBloco3D && window.ImperioBloco3D.interacao ? window.ImperioBloco3D.interacao : null;
    return B;
  }

  function marcarFiltro(f) {
    botoesFiltro.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-filtro-peca") === f)); });
  }

  function ligarLivre(sim) {
    modoLivre = !!sim;
    document.documentElement.classList.toggle("toque-livre", modoLivre);
    document.querySelectorAll("[data-girar-livre]").forEach(function (b) { b.setAttribute("aria-pressed", String(modoLivre)); });
  }

  function interagiu() {
    yInteracao = window.scrollY;
  }

  function ligarArea(area) {
    var id = null;
    area.addEventListener("pointerdown", function (e) {
      if (!pegarB() || (e.pointerType === "mouse" && e.button !== 0)) return;
      id = e.pointerId;
      arrastando = true;
      var tipo = B.inicio(e.clientX, e.clientY);
      area.classList.add(tipo === "peca" ? "pegando-peca" : "girando");
      try { area.setPointerCapture(id); } catch (erro) { /* navegador antigo */ }
      interagiu();
    });
    area.addEventListener("pointermove", function (e) {
      if (!B) return;
      if (arrastando && e.pointerId === id) {
        B.mover(e.clientX, e.clientY);
        interagiu();
      } else if (e.pointerType === "mouse") {
        area.classList.toggle("sobre-peca", B.sobrePeca(e.clientX, e.clientY));
      }
    });
    function soltar(e) {
      if (e.pointerId !== id) return;
      arrastando = false;
      area.classList.remove("pegando-peca", "girando");
      if (B) B.fim();
      interagiu();
    }
    area.addEventListener("pointerup", soltar);
    // celular: o navegador assumiu o arrasto como rolagem → solta a peça onde ela está
    area.addEventListener("pointercancel", soltar);
    // toque duplo = volta tudo pro lugar
    area.addEventListener("dblclick", function () { if (pegarB() && B.voltarOrigem()) marcarFiltro("tudo"); });
  }

  function ligarBotoes() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-acao-peca], [data-filtro-peca], [data-girar-livre]");
      if (!b || !pegarB()) return;
      interagiu();
      if (b.hasAttribute("data-girar-livre")) return ligarLivre(!modoLivre);
      if (b.hasAttribute("data-filtro-peca")) {
        var f = b.getAttribute("data-filtro-peca");
        B.filtrar(f);
        marcarFiltro(f);
        return;
      }
      var acao = b.getAttribute("data-acao-peca");
      if (acao === "separar") B.separar(true);
      if (acao === "juntar") B.separar(false);
    });
  }

  /** Rolou a página depois de mexer → as peças voltam pro lugar (com animação). */
  function vigiarRolagem() {
    window.addEventListener("scroll", function () {
      if (arrastando || yInteracao === null) return;
      if (Math.abs(window.scrollY - yInteracao) < 30) return;
      yInteracao = null;
      if (pegarB() && B.voltarOrigem()) {
        marcarFiltro("tudo");
        ligarLivre(false);
      }
    }, { passive: true });
  }

  function iniciar() {
    if (document.documentElement.getAttribute("data-qualidade") === "estatica") return;
    botoesFiltro = Array.prototype.slice.call(document.querySelectorAll("[data-filtro-peca]"));
    document.querySelectorAll("[data-toque]").forEach(ligarArea);
    ligarBotoes();
    vigiarRolagem();
    document.documentElement.classList.add("toque-pronto");
  }

  // Só liga quando o 3D existir (cena.js carrega o Three.js depois da página abrir)
  window.addEventListener("imperio3d-pronto", iniciar, { once: true });
})();

/**
 * Conteúdo vivo (editado pelo painel admin): promoções e galeria de obras.
 * - Com Supabase: lê as linhas ativas (RLS libera só "ativo = true").
 * - Sem Supabase ou banco vazio: usa promocoesPadrao/galeriaPadrao do config.js.
 * Skeleton enquanto carrega; lightbox acessível na galeria.
 */
(function () {
  "use strict";

  var cfg = window.IMPERIO_CONFIG || {};
  var CATEGORIAS = { obra: "Obras", fachada: "Fachadas", moldura: "Molduras e sancas", laje: "Laje e contrapiso", fabrica: "Fábrica" };

  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto) e.textContent = texto;
    return e;
  }

  function buscar(tabela, padrao) {
    var sb = window.ImperioSupabase;
    if (!sb || !sb.pronto) return Promise.resolve(padrao || []);
    return sb.cliente()
      .then(function (c) {
        return c.from(tabela).select("*").eq("ativo", true).order("ordem", { ascending: true }).order("criado_em", { ascending: false }).limit(60);
      })
      .then(function (r) {
        if (r.error) throw r.error;
        return r.data && r.data.length ? r.data : padrao || [];
      })
      .catch(function (erro) {
        console.warn("[Império] " + tabela + ":", erro);
        return padrao || [];
      });
  }

  /* ---------- Promoções ---------- */
  function diasRestantes(validade) {
    if (!validade) return null;
    var fim = new Date(validade + "T23:59:59");
    return Math.ceil((fim - Date.now()) / 86400000);
  }

  function cartaoPromo(p) {
    var art = criar("article", "promo");
    art.setAttribute("data-revelar", "");
    if (p.imagem_url) {
      var img = criar("img", "promo__img");
      img.src = p.imagem_url;
      img.alt = p.titulo;
      img.loading = "lazy";
      art.appendChild(img);
    }
    var corpo = criar("div", "promo__corpo");
    if (p.selo) corpo.appendChild(criar("span", "selo", p.selo));
    corpo.appendChild(criar("h3", "promo__titulo", p.titulo));
    if (p.descricao) corpo.appendChild(criar("p", "promo__texto", p.descricao));
    var dias = diasRestantes(p.validade);
    if (dias !== null) {
      corpo.appendChild(criar("p", "promo__prazo" + (dias <= 3 ? " promo__prazo--urgente" : ""), dias <= 0 ? "Último dia!" : "Termina em " + dias + (dias === 1 ? " dia" : " dias")));
    }
    var cta = criar("a", "botao botao--ouro", "Quero essa condição");
    cta.setAttribute("data-whatsapp", "Olá! Vi a promoção \"" + p.titulo + "\" no site do Império do EPS e quero saber mais.");
    cta.setAttribute("data-promo", "");
    cta.setAttribute("data-rotulo", p.titulo);
    cta.href = window.ImperioWhatsApp ? window.ImperioWhatsApp(cta.getAttribute("data-whatsapp")) : "#";
    cta.target = "_blank";
    cta.rel = "noopener";
    corpo.appendChild(cta);
    art.appendChild(corpo);
    return art;
  }

  function renderPromocoes(lista) {
    var alvo = document.querySelector("[data-promocoes]");
    if (!alvo) return;
    var validas = lista.filter(function (p) { var d = diasRestantes(p.validade); return d === null || d >= 0; });
    alvo.replaceChildren();
    alvo.setAttribute("aria-busy", "false");
    if (!validas.length) {
      alvo.appendChild(criar("p", "vazio", "Nenhuma promoção ativa agora. Entre com seu WhatsApp e seja avisado da próxima."));
      return;
    }
    validas.forEach(function (p) { alvo.appendChild(cartaoPromo(p)); });
    revelar(alvo);
  }

  /* ---------- Galeria ---------- */
  var fotos = [];
  var atual = 0;

  function renderGaleria(lista) {
    var alvo = document.querySelector("[data-galeria]");
    var filtros = document.querySelector("[data-galeria-filtros]");
    if (!alvo) return;
    fotos = lista;
    alvo.replaceChildren();
    alvo.setAttribute("aria-busy", "false");

    lista.forEach(function (f, i) {
      var b = criar("button", "galeria__item");
      b.type = "button";
      b.setAttribute("data-categoria", f.categoria || "obra");
      b.setAttribute("data-indice", String(i));
      b.setAttribute("aria-label", "Ampliar foto: " + f.titulo);
      var img = criar("img");
      img.src = f.imagem_url;
      img.alt = f.titulo;
      img.loading = "lazy";
      img.decoding = "async";
      b.appendChild(img);
      var leg = criar("span", "galeria__legenda");
      leg.appendChild(criar("strong", "", f.titulo));
      if (f.cidade) leg.appendChild(criar("span", "", f.cidade));
      b.appendChild(leg);
      alvo.appendChild(b);
    });

    // Cartão-convite: completa a grade e leva pro Instagram
    var convite = criar("a", "galeria__item galeria__convite");
    convite.setAttribute("data-link-instagram", "");
    convite.href = cfg.instagramUrl;
    convite.target = "_blank";
    convite.rel = "noopener";
    convite.appendChild(criar("strong", "", "Mais obras toda semana"));
    convite.appendChild(criar("span", "", "Acompanhe no Instagram " + (cfg.instagramUsuario || "")));
    alvo.appendChild(convite);

    if (filtros) {
      var usadas = {};
      lista.forEach(function (f) { usadas[f.categoria || "obra"] = 1; });
      filtros.replaceChildren();
      var todas = Object.keys(usadas);
      filtros.hidden = todas.length < 2;
      ["todas"].concat(todas).forEach(function (c) {
        var bt = criar("button", "chip", c === "todas" ? "Todas" : CATEGORIAS[c] || c);
        bt.type = "button";
        bt.setAttribute("data-filtro", c);
        bt.setAttribute("aria-pressed", String(c === "todas"));
        filtros.appendChild(bt);
      });
    }
  }

  function filtrar(cat) {
    document.querySelectorAll("[data-galeria-filtros] .chip").forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.getAttribute("data-filtro") === cat));
    });
    document.querySelectorAll("[data-galeria] [data-categoria]").forEach(function (item) {
      item.hidden = cat !== "todas" && item.getAttribute("data-categoria") !== cat;
    });
  }

  function lightbox(i) {
    var lb = document.querySelector("[data-lightbox]");
    if (!lb || !fotos.length) return;
    atual = (i + fotos.length) % fotos.length;
    var f = fotos[atual];
    var img = lb.querySelector("img");
    img.src = f.imagem_url;
    img.alt = f.titulo;
    lb.querySelector("[data-lightbox-legenda]").textContent = f.titulo + (f.cidade ? " · " + f.cidade : "");
    if (lb.hidden) {
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add("aberto"); });
      document.body.classList.add("travado");
      lb.querySelector("[data-lightbox-fechar]").focus();
    }
  }

  function fecharLightbox() {
    var lb = document.querySelector("[data-lightbox]");
    if (!lb || lb.hidden) return;
    lb.classList.remove("aberto");
    document.body.classList.remove("travado");
    setTimeout(function () { lb.hidden = true; }, 250);
  }

  function revelar(raiz) {
    requestAnimationFrame(function () {
      raiz.querySelectorAll("[data-revelar]").forEach(function (e) { e.classList.add("visivel"); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buscar("promocoes", cfg.promocoesPadrao).then(renderPromocoes);
    buscar("galeria", cfg.galeriaPadrao).then(renderGaleria);

    document.addEventListener("click", function (e) {
      var f = e.target.closest("[data-filtro]");
      if (f) return filtrar(f.getAttribute("data-filtro"));
      var item = e.target.closest("[data-indice]");
      if (item) return lightbox(parseInt(item.getAttribute("data-indice"), 10));
      if (e.target.closest("[data-lightbox-fechar]") || e.target.matches("[data-lightbox]")) return fecharLightbox();
      var nav = e.target.closest("[data-lightbox-nav]");
      if (nav) lightbox(atual + parseInt(nav.getAttribute("data-lightbox-nav"), 10));
    });
    document.addEventListener("keydown", function (e) {
      var lb = document.querySelector("[data-lightbox]");
      if (!lb || lb.hidden) return;
      if (e.key === "Escape") fecharLightbox();
      if (e.key === "ArrowRight") lightbox(atual + 1);
      if (e.key === "ArrowLeft") lightbox(atual - 1);
    });
  });
})();

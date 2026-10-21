/**
 * Painel administrativo do Império do EPS.
 * Login (Supabase Auth + papel admin checado no banco) ou demonstração.
 * Abas por hash: Visão geral · Orçamentos · Clientes · Promoções · Galeria.
 * Dados em admin-dados.js, contas em admin-metricas.js, gráficos em admin-graficos.js.
 */
(function () {
  "use strict";

  var D = window.ImperioAdminDados;
  var M = window.ImperioMetricas;
  var G = window.ImperioGraficos;
  var cfg = window.IMPERIO_CONFIG || {};

  var TITULOS = { visao: "Visão geral", orcamentos: "Orçamentos", clientes: "Clientes", promocoes: "Promoções", galeria: "Galeria" };
  var STATUS = { novo: "Novo", atendendo: "Atendendo", fechado: "Fechado", perdido: "Perdido" };
  var PERFIS = { construir: "Vai construir", reformar: "Vai reformar", profissional: "Profissional da obra" };
  var KPIS = [
    ["visitantes", "Visitantes", ""],
    ["contatos", "Cliques pro WhatsApp", ""],
    ["orcamentos", "Orçamentos", ""],
    ["cadastros", "Novos cadastros", ""],
    ["m2", "m² simulados", " m²"],
    ["conversao", "Visitante → orçamento", "%"],
  ];

  var dados = null;
  var dias = 30;
  var filtroStatus = "todos";
  var fmt = new Intl.NumberFormat("pt-BR");

  /* ---------- Utilidades ---------- */
  function $(sel) { return document.querySelector(sel); }
  function criar(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }
  function fone(d) {
    d = String(d || "").replace(/\D/g, "");
    if (d.length === 11) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    if (d.length === 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return d || "–";
  }
  function dataHora(v) { return v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "–"; }
  function whats(numero, msg) { return "https://wa.me/55" + String(numero).replace(/\D/g, "") + "?text=" + encodeURIComponent(msg || ""); }
  function toast(texto) {
    var t = $("[data-toast]");
    t.textContent = texto;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add("visivel"); });
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove("visivel"); setTimeout(function () { t.hidden = true; }, 300); }, 3000);
  }
  function ocupado(botao, sim) {
    botao.disabled = sim;
    botao.classList.toggle("carregando", sim);
  }
  function csv(nome, linhas) {
    var texto = "﻿" + linhas.map(function (l) {
      return l.map(function (c) { return '"' + String(c === undefined || c === null ? "" : c).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    a.download = nome + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- Visão geral ---------- */
  function renderVisao() {
    var r = M.resumo(dados, dias);
    var alvo = $("[data-kpis]");
    alvo.replaceChildren();
    alvo.setAttribute("aria-busy", "false");
    var serieVis = r.serieVisitas.map(function (s) { return s.total; });
    KPIS.forEach(function (k) {
      var info = r.kpis[k[0]];
      var c = criar("article", "kpi");
      c.appendChild(criar("span", "kpi__rotulo", k[1]));
      c.appendChild(criar("strong", "kpi__valor", fmt.format(info.valor) + k[2]));
      if (info.variacao !== null && info.variacao !== undefined) {
        var sobe = info.variacao >= 0;
        c.appendChild(criar("span", "kpi__var " + (sobe ? "kpi__var--sobe" : "kpi__var--desce"), (sobe ? "▲ " : "▼ ") + Math.abs(info.variacao) + "% vs. período anterior"));
      }
      if (k[0] === "visitantes") c.appendChild(G.sparkline(serieVis));
      alvo.appendChild(c);
    });
    G.colunas($("[data-grafico-visitas]"), r.serieVisitas, "Visitas");
    G.funil($("[data-funil]"), r.funil);
    G.ranking($("[data-origens]"), r.origens, 6);
    G.ranking($("[data-blocos]"), r.blocos, 4);
    G.ranking($("[data-cidades]"), r.cidades, 6);
    var novos = (dados.orcamentos || []).filter(function (o) { return o.status === "novo"; }).length;
    $("[data-novos]").textContent = novos ? String(novos) : "";
  }

  /* ---------- Orçamentos ---------- */
  function renderOrcamentos() {
    var alvo = $("[data-lista-orcamentos]");
    alvo.replaceChildren();
    var lista = dados.orcamentos
      .filter(function (o) { return filtroStatus === "todos" || o.status === filtroStatus; })
      .sort(function (a, b) { return new Date(b.criado_em) - new Date(a.criado_em); });
    if (!lista.length) { alvo.appendChild(criar("p", "vazio", "Nenhum orçamento aqui.")); return; }
    lista.slice(0, 120).forEach(function (o) {
      var c = criar("article", "item item--" + o.status);
      var topo = criar("div", "item__topo");
      topo.appendChild(criar("strong", "", o.nome || "Visitante sem cadastro"));
      topo.appendChild(criar("span", "status status--" + o.status, STATUS[o.status]));
      c.appendChild(topo);
      c.appendChild(criar("p", "item__linha", (o.bloco || "Bloco não informado") + " · " + String(o.area_m2 || 0).replace(".", ",") + " m²" + (o.blocos_estimados ? " · " + o.blocos_estimados + " blocos" : "")));
      c.appendChild(criar("p", "item__meta", [o.cidade, dataHora(o.criado_em)].filter(Boolean).join(" · ")));
      var acoes = criar("div", "item__acoes");
      var sel = criar("select", "seletor");
      sel.setAttribute("aria-label", "Situação do orçamento");
      Object.keys(STATUS).forEach(function (s) {
        var op = criar("option", "", STATUS[s]);
        op.value = s;
        op.selected = s === o.status;
        sel.appendChild(op);
      });
      sel.addEventListener("change", function () {
        sel.disabled = true;
        D.mudarStatus(o.id, sel.value).then(function () {
          o.status = sel.value;
          toast("Situação atualizada: " + STATUS[o.status]);
          renderOrcamentos();
          renderVisao();
        }).catch(function (e) { toast("Não deu pra salvar: " + e.message); sel.disabled = false; });
      });
      acoes.appendChild(sel);
      if (o.whatsapp) {
        var a = criar("a", "botao botao--whats botao--pequeno", "WhatsApp");
        a.href = whats(o.whatsapp, "Olá, " + (o.nome || "").split(" ")[0] + "! Aqui é do Império do EPS, sobre sua simulação de " + String(o.area_m2).replace(".", ",") + " m².");
        a.target = "_blank";
        a.rel = "noopener";
        acoes.appendChild(a);
      }
      c.appendChild(acoes);
      alvo.appendChild(c);
    });
  }

  /* ---------- Clientes ---------- */
  function clientesAgrupados() {
    var mapa = {};
    dados.clientes.forEach(function (c) {
      var k = c.whatsapp;
      if (!mapa[k]) mapa[k] = Object.assign({ orcamentos: 0, m2: 0 }, c);
    });
    dados.orcamentos.forEach(function (o) {
      if (o.whatsapp && mapa[o.whatsapp]) { mapa[o.whatsapp].orcamentos++; mapa[o.whatsapp].m2 += Number(o.area_m2) || 0; }
    });
    return Object.keys(mapa).map(function (k) { return mapa[k]; }).sort(function (a, b) { return b.orcamentos - a.orcamentos || new Date(b.criado_em) - new Date(a.criado_em); });
  }

  function renderClientes() {
    var alvo = $("[data-lista-clientes]");
    var termo = ($("[data-busca-clientes]").value || "").toLowerCase().trim();
    alvo.replaceChildren();
    var lista = clientesAgrupados().filter(function (c) {
      return !termo || (c.nome + " " + c.cidade + " " + c.whatsapp).toLowerCase().indexOf(termo.replace(/\D/g, "") || termo) !== -1;
    });
    if (!lista.length) { alvo.appendChild(criar("p", "vazio", termo ? "Ninguém encontrado." : "Nenhum cliente cadastrado ainda.")); return; }
    lista.slice(0, 150).forEach(function (c) {
      var art = criar("article", "item");
      var topo = criar("div", "item__topo");
      topo.appendChild(criar("strong", "", c.nome));
      if (c.orcamentos) topo.appendChild(criar("span", "status status--atendendo", c.orcamentos + (c.orcamentos === 1 ? " orçamento" : " orçamentos")));
      art.appendChild(topo);
      art.appendChild(criar("p", "item__linha", fone(c.whatsapp) + (c.cidade ? " · " + c.cidade : "")));
      art.appendChild(criar("p", "item__meta", (PERFIS[c.perfil] || "Perfil não informado") + " · desde " + dataHora(c.criado_em) + (c.m2 ? " · " + Math.round(c.m2) + " m² simulados" : "")));
      var a = criar("a", "botao botao--whats botao--pequeno", "Chamar no WhatsApp");
      a.href = whats(c.whatsapp, "Olá, " + c.nome.split(" ")[0] + "! Aqui é do Império do EPS.");
      a.target = "_blank";
      a.rel = "noopener";
      var acoes = criar("div", "item__acoes");
      acoes.appendChild(a);
      art.appendChild(acoes);
      alvo.appendChild(art);
    });
  }

  /* ---------- Promoções ---------- */
  function preencherPromo(p) {
    var f = $("[data-form-promo]");
    f.reset();
    f.elements.id.value = p ? p.id : "";
    f.elements.titulo.value = p ? p.titulo : "";
    f.elements.descricao.value = p ? p.descricao || "" : "";
    f.elements.selo.value = p ? p.selo || "" : "";
    f.elements.validade.value = p && p.validade ? p.validade : "";
    f.elements.ativo.checked = p ? !!p.ativo : true;
    $("[data-promo-titulo-form]").textContent = p ? "Editar promoção" : "Nova promoção";
    $("[data-promo-cancelar]").hidden = !p;
    if (p) f.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderPromocoes() {
    var alvo = $("[data-lista-promocoes]");
    alvo.replaceChildren();
    if (!dados.promocoes.length) { alvo.appendChild(criar("p", "vazio", "Nenhuma promoção cadastrada.")); return; }
    dados.promocoes.forEach(function (p) {
      var art = criar("article", "item" + (p.ativo ? "" : " item--inativo"));
      var topo = criar("div", "item__topo");
      topo.appendChild(criar("strong", "", p.titulo));
      topo.appendChild(criar("span", "status " + (p.ativo ? "status--fechado" : "status--perdido"), p.ativo ? "No site" : "Oculta"));
      art.appendChild(topo);
      if (p.descricao) art.appendChild(criar("p", "item__linha", p.descricao));
      art.appendChild(criar("p", "item__meta", (p.selo ? p.selo + " · " : "") + (p.validade ? "até " + new Date(p.validade + "T12:00").toLocaleDateString("pt-BR") : "sem validade")));
      var acoes = criar("div", "item__acoes");
      var editar = criar("button", "botao botao--contorno botao--pequeno", "Editar");
      editar.type = "button";
      editar.addEventListener("click", function () { preencherPromo(p); });
      var alternar = criar("button", "botao botao--contorno botao--pequeno", p.ativo ? "Ocultar" : "Mostrar no site");
      alternar.type = "button";
      alternar.addEventListener("click", function () {
        ocupado(alternar, true);
        D.salvar("promocoes", { id: p.id, ativo: !p.ativo }).then(function () { p.ativo = !p.ativo; renderPromocoes(); })
          .catch(function (e) { toast("Erro: " + e.message); ocupado(alternar, false); });
      });
      var apagar = criar("button", "botao-link botao-link--perigo", "Apagar");
      apagar.type = "button";
      apagar.addEventListener("click", function () {
        if (!window.confirm("Apagar a promoção \"" + p.titulo + "\"?")) return;
        D.remover("promocoes", p.id).then(function () {
          dados.promocoes = dados.promocoes.filter(function (x) { return x.id !== p.id; });
          renderPromocoes();
          toast("Promoção apagada.");
        }).catch(function (e) { toast("Erro: " + e.message); });
      });
      acoes.appendChild(editar);
      acoes.appendChild(alternar);
      acoes.appendChild(apagar);
      art.appendChild(acoes);
      alvo.appendChild(art);
    });
  }

  async function salvarPromo(e) {
    e.preventDefault();
    var f = e.target;
    var erro = $("[data-promo-erro]");
    var titulo = f.elements.titulo.value.trim();
    if (titulo.length < 3) { erro.textContent = "Escreva um título (mínimo 3 letras)."; return; }
    erro.textContent = "";
    var botao = f.querySelector("button[type=submit]");
    ocupado(botao, true);
    try {
      var id = f.elements.id.value ? Number(f.elements.id.value) : null;
      var linha = {
        titulo: titulo,
        descricao: f.elements.descricao.value.trim(),
        selo: f.elements.selo.value.trim(),
        validade: f.elements.validade.value || null,
        ativo: f.elements.ativo.checked,
      };
      if (id) linha.id = id;
      var arquivo = f.elements.imagem.files[0];
      if (arquivo) linha.imagem_url = await D.enviarFoto(validarArquivo(arquivo));
      var salvo = await D.salvar("promocoes", linha);
      if (!D.demo()) {
        if (id) dados.promocoes = dados.promocoes.map(function (p) { return p.id === id ? salvo : p; });
        else dados.promocoes.unshift(salvo);
      }
      preencherPromo(null);
      renderPromocoes();
      toast(id ? "Promoção atualizada." : "Promoção publicada no site.");
    } catch (er) {
      erro.textContent = "Não deu pra salvar: " + er.message;
    } finally {
      ocupado(botao, false);
    }
  }

  /* ---------- Galeria ---------- */
  var CATEGORIAS = { obra: "Obra", fachada: "Fachada", moldura: "Molduras e sancas", laje: "Laje e contrapiso", fabrica: "Fábrica" };

  function validarArquivo(arquivo) {
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error("use foto JPG, PNG ou WEBP.");
    if (arquivo.size > 5 * 1024 * 1024) throw new Error("foto maior que 5 MB. Reduza antes de enviar.");
    return arquivo;
  }

  function renderGaleria() {
    var alvo = $("[data-lista-galeria]");
    alvo.replaceChildren();
    if (!dados.galeria.length) { alvo.appendChild(criar("p", "vazio", "Nenhuma foto ainda. A primeira foto já aparece no site.")); return; }
    dados.galeria.forEach(function (f) {
      var fig = criar("figure", "foto" + (f.ativo ? "" : " item--inativo"));
      var img = criar("img");
      img.src = f.imagem_url;
      img.alt = f.titulo;
      img.loading = "lazy";
      fig.appendChild(img);
      var cap = criar("figcaption");
      cap.appendChild(criar("strong", "", f.titulo));
      cap.appendChild(criar("span", "", (CATEGORIAS[f.categoria] || f.categoria) + (f.cidade ? " · " + f.cidade : "")));
      var acoes = criar("div", "item__acoes");
      var alternar = criar("button", "botao botao--contorno botao--pequeno", f.ativo ? "Ocultar" : "Mostrar");
      alternar.type = "button";
      alternar.addEventListener("click", function () {
        ocupado(alternar, true);
        D.salvar("galeria", { id: f.id, ativo: !f.ativo }).then(function () { f.ativo = !f.ativo; renderGaleria(); })
          .catch(function (e) { toast("Erro: " + e.message); ocupado(alternar, false); });
      });
      var apagar = criar("button", "botao-link botao-link--perigo", "Apagar");
      apagar.type = "button";
      apagar.addEventListener("click", function () {
        if (!window.confirm("Apagar a foto \"" + f.titulo + "\"?")) return;
        D.remover("galeria", f.id).then(function () {
          dados.galeria = dados.galeria.filter(function (x) { return x.id !== f.id; });
          renderGaleria();
        }).catch(function (e) { toast("Erro: " + e.message); });
      });
      acoes.appendChild(alternar);
      acoes.appendChild(apagar);
      cap.appendChild(acoes);
      fig.appendChild(cap);
      alvo.appendChild(fig);
    });
  }

  async function salvarFoto(e) {
    e.preventDefault();
    var f = e.target;
    var erro = $("[data-foto-erro]");
    var arquivo = f.elements.imagem.files[0];
    var titulo = f.elements.titulo.value.trim();
    if (!arquivo) { erro.textContent = "Escolha uma foto."; return; }
    if (titulo.length < 3) { erro.textContent = "Escreva um título."; return; }
    erro.textContent = "";
    var botao = f.querySelector("button[type=submit]");
    ocupado(botao, true);
    try {
      var url = await D.enviarFoto(validarArquivo(arquivo));
      var salvo = await D.salvar("galeria", { titulo: titulo, categoria: f.elements.categoria.value, cidade: f.elements.cidade.value.trim(), imagem_url: url, ativo: true });
      if (!D.demo()) dados.galeria.unshift(salvo);
      f.reset();
      renderGaleria();
      toast("Foto publicada na galeria do site.");
    } catch (er) {
      erro.textContent = "Não deu pra enviar: " + er.message;
    } finally {
      ocupado(botao, false);
    }
  }

  /* ---------- Navegação ---------- */
  function irPara(secao) {
    if (!TITULOS[secao]) secao = "visao";
    document.querySelectorAll("[data-secao]").forEach(function (s) { s.hidden = s.getAttribute("data-secao") !== secao; });
    document.querySelectorAll("[data-aba]").forEach(function (a) {
      if (a.getAttribute("data-aba") === secao) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $("[data-titulo]").textContent = TITULOS[secao];
    $("[data-periodo]").hidden = secao !== "visao";
  }

  function renderTudo() {
    renderVisao();
    renderOrcamentos();
    renderClientes();
    renderPromocoes();
    renderGaleria();
  }

  async function abrirPainel() {
    $("[data-tela-login]").hidden = true;
    $("[data-tela-painel]").hidden = false;
    $("[data-selo-demo]").hidden = !D.demo();
    irPara(location.hash.slice(1));
    try {
      dados = await D.carregar();
      renderTudo();
    } catch (e) {
      toast("Erro ao carregar os dados: " + e.message);
    }
  }

  function iniciar() {
    if (!D.configurado()) $("[data-aviso-config]").hidden = false;

    $("[data-form-login]").addEventListener("submit", async function (e) {
      e.preventDefault();
      var erro = $("[data-login-erro]");
      var botao = e.target.querySelector("button[type=submit]");
      if (!D.configurado()) { erro.textContent = "Banco ainda não configurado. Use a demonstração."; return; }
      erro.textContent = "";
      ocupado(botao, true);
      try {
        await D.entrar($("#login-email").value.trim(), $("#login-senha").value);
        await abrirPainel();
      } catch (er) {
        erro.textContent = /Invalid login/i.test(er.message) ? "E-mail ou senha incorretos." : er.message;
      } finally {
        ocupado(botao, false);
      }
    });

    $("[data-entrar-demo]").addEventListener("click", function () { D.entrarDemo(); abrirPainel(); });
    $("[data-sair]").addEventListener("click", function () {
      D.sair().finally(function () { location.hash = ""; location.reload(); });
    });

    window.addEventListener("hashchange", function () { irPara(location.hash.slice(1)); });
    $("[data-periodo]").addEventListener("click", function (e) {
      var b = e.target.closest("[data-dias]");
      if (!b) return;
      dias = Number(b.getAttribute("data-dias"));
      document.querySelectorAll("[data-dias]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      renderVisao();
    });
    $("[data-filtro-status]").addEventListener("click", function (e) {
      var b = e.target.closest("[data-status]");
      if (!b) return;
      filtroStatus = b.getAttribute("data-status");
      document.querySelectorAll("[data-status]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      renderOrcamentos();
    });
    $("[data-busca-clientes]").addEventListener("input", renderClientes);
    $("[data-form-promo]").addEventListener("submit", salvarPromo);
    $("[data-promo-cancelar]").addEventListener("click", function () { preencherPromo(null); });
    $("[data-form-foto]").addEventListener("submit", salvarFoto);

    document.querySelectorAll("[data-csv]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-csv") === "clientes") {
          csv("clientes-imperio", [["Nome", "WhatsApp", "Cidade", "Perfil", "Orçamentos", "Cadastro"]].concat(
            clientesAgrupados().map(function (c) { return [c.nome, fone(c.whatsapp), c.cidade, PERFIS[c.perfil] || "", c.orcamentos, dataHora(c.criado_em)]; })));
        } else {
          csv("orcamentos-imperio", [["Data", "Nome", "WhatsApp", "Cidade", "Bloco", "Área (m²)", "Situação"]].concat(
            dados.orcamentos.map(function (o) { return [dataHora(o.criado_em), o.nome, fone(o.whatsapp), o.cidade, o.bloco, String(o.area_m2).replace(".", ","), STATUS[o.status]]; })));
        }
      });
    });

    D.sessaoAtiva().then(function (ok) { if (ok) abrirPainel(); }).catch(function () { /* fica no login */ });
  }

  document.addEventListener("DOMContentLoaded", iniciar);
  window.ImperioAdmin = { versao: cfg.nome };
})();

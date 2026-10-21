/**
 * Cadastro do cliente ("Entrar com WhatsApp"). Base: identificacao.js da San.
 * - Guarda nome/WhatsApp/cidade/perfil no navegador ("Bem-vindo de volta").
 * - Com Supabase ativo, grava na tabela "clientes" (só inserção — ver schema).
 * - Sem verificação por código: exige a API oficial do WhatsApp Business.
 */
(function () {
  "use strict";

  var CHAVE = "imperioCliente";
  var PERFIS = { construir: "Vou construir", reformar: "Vou reformar", profissional: "Sou profissional da obra" };
  var el = {};

  function soDigitos(v) { return String(v || "").replace(/\D/g, ""); }

  /** (15) 99121-2917 a partir de qualquer digitação */
  function formatarWhatsApp(valor) {
    var d = soDigitos(valor).replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
    if (d.length <= 2) return d ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  function whatsappValido(v) {
    var d = soDigitos(v);
    return d.length === 10 || d.length === 11;
  }

  function obter() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch (erro) { return null; }
  }

  function gravarNoBanco(c, origem) {
    var sb = window.ImperioSupabase;
    if (!sb || !sb.pronto) return;
    sb.cliente()
      .then(function (cli) {
        return cli.from("clientes").insert({
          nome: c.nome,
          whatsapp: soDigitos(c.whatsapp),
          cidade: c.cidade || "",
          perfil: c.perfil || "",
          origem: origem || "site",
          visitante_id: (window.ImperioAnalytics && window.ImperioAnalytics.visitanteId()) || "",
        });
      })
      .then(function (r) { if (r && r.error) throw r.error; })
      .catch(function (erro) { console.warn("[Império] cadastro:", erro); });
  }

  function salvar(dados, origem) {
    var atual = obter() || {};
    var novo = {
      nome: String(dados.nome || atual.nome || "").trim().slice(0, 120),
      whatsapp: formatarWhatsApp(dados.whatsapp || atual.whatsapp || ""),
      cidade: String(dados.cidade || atual.cidade || "").trim().slice(0, 120),
      perfil: dados.perfil || atual.perfil || "",
      desde: atual.desde || new Date().toISOString(),
    };
    try { localStorage.setItem(CHAVE, JSON.stringify(novo)); } catch (erro) { /* navegador sem storage */ }
    if (soDigitos(novo.whatsapp) !== soDigitos(atual.whatsapp) || novo.nome !== atual.nome) gravarNoBanco(novo, origem);
    atualizar();
    return novo;
  }

  function sair() {
    try { localStorage.removeItem(CHAVE); } catch (erro) { /* ignora */ }
    atualizar();
  }

  function atualizar() {
    var c = obter();
    document.querySelectorAll("[data-abrir-entrar]").forEach(function (b) {
      var ini = b.querySelector("[data-inicial]");
      var logado = !!(c && c.nome);
      b.setAttribute("data-logado", String(logado));
      b.setAttribute("aria-label", logado ? "Conectado como " + c.nome : "Entrar com WhatsApp");
      if (ini) ini.textContent = logado ? c.nome.charAt(0).toUpperCase() : "";
    });
    if (!el.modal) return;
    var logado = !!(c && c.nome);
    el.form.hidden = logado;
    el.conectado.hidden = !logado;
    if (logado) {
      el.saudacao.textContent = "Olá, " + c.nome.split(" ")[0] + "!";
      el.dados.textContent = c.whatsapp + (c.cidade ? " · " + c.cidade : "") + (PERFIS[c.perfil] ? " · " + PERFIS[c.perfil] : "");
    }
  }

  function abrir() {
    if (!el.modal) return;
    el.modal.hidden = false;
    requestAnimationFrame(function () { el.modal.classList.add("aberto"); });
    document.body.classList.add("travado");
    var foco = el.modal.querySelector(el.form.hidden ? "[data-fechar-entrar]" : "input");
    if (foco) foco.focus();
  }

  function fechar() {
    if (!el.modal || el.modal.hidden) return;
    el.modal.classList.remove("aberto");
    document.body.classList.remove("travado");
    setTimeout(function () { el.modal.hidden = true; }, 280);
  }

  function mascara(input) {
    input.addEventListener("input", function () { input.value = formatarWhatsApp(input.value); });
  }

  function enviar(evento) {
    evento.preventDefault();
    var f = el.form;
    var nome = f.querySelector("#entrar-nome").value.trim();
    var whats = f.querySelector("#entrar-whatsapp").value;
    var aceite = f.querySelector("#entrar-aceite").checked;
    var status = f.querySelector("[data-entrar-status]");
    if (!nome) { status.textContent = "Escreva seu nome."; return; }
    if (!whatsappValido(whats)) { status.textContent = "Confira o WhatsApp com DDD, ex.: (15) 99999-9999."; return; }
    if (!aceite) { status.textContent = "Marque a autorização de contato para continuar."; return; }
    status.textContent = "";
    var botao = f.querySelector("button[type=submit]");
    botao.disabled = true;
    botao.classList.add("carregando");
    salvar({
      nome: nome,
      whatsapp: whats,
      cidade: f.querySelector("#entrar-cidade").value,
      perfil: (f.querySelector("input[name=perfil]:checked") || {}).value || "",
    }, "entrar");
    setTimeout(function () {
      botao.disabled = false;
      botao.classList.remove("carregando");
      if (window.ImperioToast) window.ImperioToast("Pronto, " + nome.split(" ")[0] + "! Você recebe as promoções em primeira mão.");
      fechar();
    }, 450);
  }

  document.addEventListener("DOMContentLoaded", function () {
    el.modal = document.querySelector("[data-modal-entrar]");
    if (el.modal) {
      el.form = el.modal.querySelector("[data-form-entrar]");
      el.conectado = el.modal.querySelector("[data-entrar-conectado]");
      el.saudacao = el.modal.querySelector("[data-entrar-saudacao]");
      el.dados = el.modal.querySelector("[data-entrar-dados]");
      mascara(el.form.querySelector("#entrar-whatsapp"));
      el.form.addEventListener("submit", enviar);
      el.modal.addEventListener("click", function (e) {
        if (e.target === el.modal || e.target.closest("[data-fechar-entrar]")) fechar();
        if (e.target.closest("[data-sair-cliente]")) sair();
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") fechar(); });
    }
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-abrir-entrar]")) abrir();
    });
    atualizar();

    var c = obter();
    var jaSaudou = false;
    try { jaSaudou = sessionStorage.getItem("imperioSaudou") === "1"; sessionStorage.setItem("imperioSaudou", "1"); } catch (erro) { jaSaudou = true; }
    if (c && c.nome && !jaSaudou && window.ImperioToast) {
      setTimeout(function () { window.ImperioToast("Bem-vindo de volta, " + c.nome.split(" ")[0] + "!"); }, 2200);
    }
  });

  window.ImperioCliente = { obter: obter, salvar: salvar, abrir: abrir, formatarWhatsApp: formatarWhatsApp, whatsappValido: whatsappValido, soDigitos: soDigitos };
})();

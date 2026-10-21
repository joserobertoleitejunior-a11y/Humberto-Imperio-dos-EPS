const { test } = require("node:test");
const assert = require("node:assert/strict");
const M = require("../assets/js/admin-metricas.js");

const agora = new Date("2026-10-21T12:00:00").getTime();
const dia = 86400000;
const em = (d) => new Date(agora - d * dia).toISOString();

test("origem do tráfego", () => {
  assert.equal(M.origem(""), "Direto");
  assert.equal(M.origem("https://l.instagram.com/x"), "Instagram");
  assert.equal(M.origem("https://www.google.com.br/"), "Google");
  assert.equal(M.origem("https://exemplo.com.br/a"), "exemplo.com.br");
});

test("resumo separa período atual do anterior", () => {
  const dados = {
    visitas: [{ criado_em: em(1), visitante_id: "a" }, { criado_em: em(2), visitante_id: "a" }, { criado_em: em(3), visitante_id: "b" }, { criado_em: em(10), visitante_id: "c" }],
    cliques: [{ criado_em: em(1), tipo: "whatsapp" }, { criado_em: em(1), tipo: "instagram" }],
    clientes: [{ criado_em: em(1), cidade: "Itapetininga" }],
    orcamentos: [{ criado_em: em(2), status: "fechado", area_m2: 100.4, bloco: "Blocão 15 cm" }, { criado_em: em(9), status: "novo", area_m2: 50, bloco: "Blocão 10 cm" }],
  };
  const r = M.resumo(dados, 7, agora);
  assert.equal(r.kpis.visitantes.valor, 2);
  assert.equal(r.kpis.visitantes.variacao, 100);
  assert.equal(r.kpis.contatos.valor, 1);
  assert.equal(r.kpis.orcamentos.valor, 1);
  assert.equal(r.kpis.m2.valor, 100);
  assert.equal(r.funil[3].total, 1);
  assert.equal(r.serieVisitas.length, 7);
  assert.equal(r.serieVisitas.reduce((s, x) => s + x.total, 0), 3);
});

test("variação sem base anterior", () => {
  assert.equal(M.variacao(5, 0), null);
  assert.equal(M.variacao(0, 0), 0);
  assert.equal(M.variacao(5, 10), -50);
});

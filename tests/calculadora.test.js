const { test } = require("node:test");
const assert = require("node:assert/strict");
const Calc = require("../assets/js/calculadora-nucleo.js");

const blocos = [{ id: "b15", nome: "Blocão 15 cm" }];

test("comprimento × altura menos portas e janelas", () => {
  const r = Calc.calcularObra({ modo: "medidas", comprimento: "40", altura: "2,80", portas: 3, janelas: 4, blocoId: "b15" }, { blocos });
  assert.equal(r.ok, true);
  assert.equal(r.areaBruta, 112);
  assert.equal(r.areaVaos, Math.round((3 * 0.8 * 2.1 + 4 * 1.2) * 100) / 100);
  assert.equal(r.areaLiquida, Math.round((112 - 3 * 0.8 * 2.1 - 4 * 1.2) * 100) / 100);
  assert.equal(r.bloco.nome, "Blocão 15 cm");
  assert.equal(r.blocos, null, "sem medida do bloco não inventa quantidade");
});

test("quantidade de blocos com perda quando a medida está configurada", () => {
  const r = Calc.calcularObra({ modo: "area", area: "100" }, { medidaBloco: { largura: 1, altura: 0.5 }, perdaPercentual: 5 });
  assert.equal(r.blocos, 210);
});

test("erros de entrada", () => {
  assert.equal(Calc.calcularObra({ modo: "medidas", comprimento: "", altura: "3" }, {}).ok, false);
  assert.equal(Calc.calcularObra({ modo: "area", area: "-5" }, {}).ok, false);
  assert.equal(Calc.calcularObra({ modo: "area", area: "2", portas: 2 }, {}).ok, false, "vãos maiores que a parede");
  assert.equal(Calc.calcularObra({ modo: "area", area: "50000" }, {}).ok, false);
});

test("mensagem do WhatsApp traz área, bloco e nome", () => {
  const e = { modo: "medidas", comprimento: "10", altura: "3", portas: 1, janelas: 0, blocoId: "b15" };
  const r = Calc.calcularObra(e, { blocos });
  const msg = Calc.mensagemWhatsApp(r, e, { nome: "Ana", cidade: "Itapetininga" });
  assert.match(msg, /Blocão 15 cm/);
  assert.match(msg, /28,32 m²/);
  assert.match(msg, /Paredes: 10 m × 3 m/);
  assert.match(msg, /Nome: Ana — Itapetininga/);
});

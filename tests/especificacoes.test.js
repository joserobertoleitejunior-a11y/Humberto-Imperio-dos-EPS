const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../assets/js/especificacoes.js");

const b15 = { id: "b15", nome: "Blocão 15 cm", total: 15, concreto: 3.5, eps: 8 };

test("sem medida da face: espessuras certas, medidas e peso 'a confirmar' (nada inventado)", () => {
  const r = E.calcular(b15, { densidades: { concreto: 2400, eps: 15 } });
  assert.deepEqual(r.camadas.map((c) => c.espessuraCm), [3.5, 8, 3.5]);
  assert.equal(r.face, null);
  assert.equal(r.total.pesoKg, null);
  assert.equal(E.textoFace(r.face), "a confirmar");
  assert.equal(E.textoPeso(r.camadas[0].pesoKg, true), "a confirmar");
});

test("com medida da face: peso estimado por volume × densidade", () => {
  const r = E.calcular(b15, { medidaBloco: { largura: 1, altura: 0.5 }, densidades: { concreto: 2400, eps: 15 } });
  assert.equal(r.camadas[0].pesoKg, 42); // 1 × 0,5 × 0,035 × 2400
  assert.equal(r.camadas[1].pesoKg, 0.6); // 1 × 0,5 × 0,08 × 15
  assert.equal(r.total.pesoKg, 84.6);
  assert.equal(r.total.estimado, true);
  assert.equal(r.total.blocosPorM2, 2);
  assert.equal(E.textoFace(r.face), "100 cm × 50 cm");
  assert.equal(E.textoPeso(84.6, true), "≈ 84,6 kg (estimado)");
});

test("peso pesado na fábrica tem prioridade sobre a estimativa", () => {
  const r = E.calcular(b15, { medidaBloco: { largura: 1, altura: 0.5 }, densidades: { concreto: 2400, eps: 15 }, pesos: { b15: 80 } });
  assert.equal(r.total.pesoKg, 80);
  assert.equal(r.total.estimado, false);
  assert.equal(E.textoPeso(80, false), "80 kg");
});

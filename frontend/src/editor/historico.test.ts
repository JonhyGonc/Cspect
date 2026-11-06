// Teste unitário do histórico de desfazer e refazer (RF16).
// Roda com `npm test` (Node 22.6 ou superior, sem dependências extras).
import assert from "node:assert/strict";
import { test } from "node:test";
import { criarHistorico, desfazer, podeDesfazer, podeRefazer, refazer, registrar } from "./historico.ts";

test("empilha ações e começa sem nada para desfazer ou refazer", () => {
  let h = criarHistorico("a");
  assert.equal(podeDesfazer(h), false);
  assert.equal(podeRefazer(h), false);
  h = registrar(h, "b");
  h = registrar(h, "c");
  assert.deepEqual(h, { passado: ["a", "b"], presente: "c", futuro: [] });
});

test("desfaz e refaz voltando exatamente aos estados anteriores", () => {
  let h = registrar(registrar(criarHistorico("a"), "b"), "c");
  h = desfazer(h);
  assert.equal(h.presente, "b");
  h = desfazer(h);
  assert.equal(h.presente, "a");
  assert.equal(podeDesfazer(h), false);
  assert.equal(desfazer(h), h, "desfazer sem passado não muda nada");
  h = refazer(h);
  h = refazer(h);
  assert.deepEqual(h, { passado: ["a", "b"], presente: "c", futuro: [] });
  assert.equal(refazer(h), h, "refazer sem futuro não muda nada");
});

test("ação nova depois de desfazer limpa a pilha de refazer", () => {
  let h = desfazer(registrar(registrar(criarHistorico("a"), "b"), "c"));
  assert.equal(podeRefazer(h), true);
  h = registrar(h, "x");
  assert.deepEqual(h, { passado: ["a", "b"], presente: "x", futuro: [] });
});

test("ação que não muda o estado não entra no histórico", () => {
  const estado = { x: 1 };
  const h = criarHistorico(estado);
  assert.equal(registrar(h, estado), h);
});

test("respeita o limite de passos descartando o mais antigo", () => {
  let h = criarHistorico(0);
  for (let i = 1; i <= 5; i++) h = registrar(h, i, 3);
  assert.deepEqual(h.passado, [2, 3, 4]);
  assert.equal(h.presente, 5);
});

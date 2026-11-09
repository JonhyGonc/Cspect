// Teste unitário da interpolação da linha do tempo (RF14). Roda com `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { estadoNoInstante, faixasDeDuracao, type Marcacao } from "./interpolacao.ts";

const smoke = (x: number, y: number) => ({ ref: "u1", tipo: "smoke" as const, x, y, trajetoria: null, duracao: 18 });

function marcacao(instante: number, estado: Partial<Marcacao["estado"]>): Marcacao {
  return {
    instante,
    tipo: "manual",
    estado: { jogadores: {}, semJogador: [], utilitarios: [], tracos: [], ...estado },
  };
}

// 0 s: só o jogador. 2 s: a smoke é criada. 4 s: a smoke se moveu. 6 s: a smoke foi removida.
const marcacoes = [
  marcacao(0, { jogadores: { 7: { x: 0, y: 0, funcaoId: 2 } } }),
  marcacao(2000, { jogadores: { 7: { x: 0.4, y: 0.8, funcaoId: 2 } }, utilitarios: [smoke(0.2, 0.2)] }),
  marcacao(4000, { jogadores: { 7: { x: 0.4, y: 0.8, funcaoId: 2 } }, utilitarios: [smoke(0.6, 0.4)] }),
  marcacao(6000, { jogadores: { 7: { x: 0.4, y: 0.8, funcaoId: 2 } } }),
];

test("jogador se move de forma linear entre duas marcações", () => {
  const meio = estadoNoInstante(marcacoes, 1000).jogadores[7];
  assert.ok(Math.abs(meio.x - 0.2) < 1e-9 && Math.abs(meio.y - 0.4) < 1e-9);
  assert.equal(meio.funcaoId, 2);
});

test("utilitário aparece na marcação de criação e some na de remoção, sem sumir entre elas", () => {
  assert.equal(estadoNoInstante(marcacoes, 1999).utilitarios.length, 0, "antes da criação, não aparece");
  assert.deepEqual(
    estadoNoInstante(marcacoes, 2000).utilitarios.map((u) => [u.x, u.y]),
    [[0.2, 0.2]],
  );
  const meio = estadoNoInstante(marcacoes, 3000).utilitarios;
  assert.equal(meio.length, 1);
  assert.ok(Math.abs(meio[0].x - 0.4) < 1e-9 && Math.abs(meio[0].y - 0.3) < 1e-9, "impacto interpolado");
  assert.equal(estadoNoInstante(marcacoes, 5999).utilitarios.length, 1, "até a marcação de remoção, continua");
  assert.equal(estadoNoInstante(marcacoes, 6000).utilitarios.length, 0, "na marcação de remoção, some");
});

test("faixa de duração começa na marcação de criação", () => {
  assert.deepEqual(faixasDeDuracao(marcacoes), [{ ref: "u1", tipo: "smoke", inicio: 2000, duracao: 18000 }]);
});

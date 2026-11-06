// Plano fixo da tática no estado da tela (RF12) e conversão para o formato da API.
//
// As posições de jogadores do elenco ficam por id do jogador. As posições sem jogador
// (RF08A: o jogador foi removido do elenco) ficam numa lista própria: mantêm a função
// e as coordenadas, e podem ser movidas, ter a função trocada ou sair do mapa.

import type { PosicaoApi } from "../api/taticas";
import type { Posicao } from "./sugestao";

export type Plano = {
  jogadores: Record<number, Posicao>;
  semJogador: Posicao[];
};

export const PLANO_VAZIO: Plano = { jogadores: {}, semJogador: [] };

// Ordem estável (jogadores por id, depois as posições sem jogador), para que o mesmo
// plano gere sempre o mesmo texto e o salvamento possa comparar com o último salvo.
export function planoParaApi(plano: Plano): PosicaoApi[] {
  const comJogador = Object.entries(plano.jogadores)
    .map(([id, p]) => ({ jogador_id: Number(id), funcao_id: p.funcaoId, x: p.x, y: p.y }))
    .sort((a, b) => a.jogador_id - b.jogador_id);
  const semJogador = plano.semJogador.map((p) => ({ jogador_id: null, funcao_id: p.funcaoId, x: p.x, y: p.y }));
  return [...comJogador, ...semJogador];
}

// Jogador que não está no elenco carregado vira posição sem jogador, para não sumir da tela.
export function planoDaApi(posicoes: PosicaoApi[], idsDoElenco: Set<number>): Plano {
  const plano: Plano = { jogadores: {}, semJogador: [] };
  for (const p of posicoes) {
    const posicao = { x: p.x, y: p.y, funcaoId: p.funcao_id };
    if (p.jogador_id !== null && idsDoElenco.has(p.jogador_id)) plano.jogadores[p.jogador_id] = posicao;
    else plano.semJogador.push(posicao);
  }
  return plano;
}

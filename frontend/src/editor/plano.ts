// Plano fixo da tática no estado da tela (RF12) e conversão para o formato da API.
//
// As posições de jogadores do elenco ficam por id do jogador. As posições sem jogador
// (RF08A: o jogador foi removido do elenco) ficam numa lista própria: mantêm a função
// e as coordenadas, e podem ser movidas, ter a função trocada ou sair do mapa.
// Utilitários (RF10) e traços (RF09) ficam em listas, na ordem em que foram criados.

import type { PontoApi, PosicaoApi, TracoApi, UtilitarioApi } from "../api/taticas";
import type { Ponto } from "./coordenadas";
import type { Posicao } from "./sugestao";
import type { Traco, Utilitario } from "./utilitarios";

export type Plano = {
  jogadores: Record<number, Posicao>;
  semJogador: Posicao[];
  utilitarios: Utilitario[];
  tracos: Traco[];
};

export const PLANO_VAZIO: Plano = { jogadores: {}, semJogador: [], utilitarios: [], tracos: [] };

const paraApi = (p: Ponto): PontoApi => [p.x, p.y];
const daApi = ([x, y]: PontoApi): Ponto => ({ x, y });

export type PlanoApi = { posicoes: PosicaoApi[]; utilitarios: UtilitarioApi[]; tracos: TracoApi[] };

// Ordem estável (jogadores por id, depois as posições sem jogador), para que o mesmo
// plano gere sempre o mesmo texto e o salvamento possa comparar com o último salvo.
export function planoParaApi(plano: Plano): PlanoApi {
  const comJogador = Object.entries(plano.jogadores)
    .map(([id, p]) => ({ jogador_id: Number(id), funcao_id: p.funcaoId, x: p.x, y: p.y }))
    .sort((a, b) => a.jogador_id - b.jogador_id);
  const semJogador = plano.semJogador.map((p) => ({ jogador_id: null, funcao_id: p.funcaoId, x: p.x, y: p.y }));
  return {
    posicoes: [...comJogador, ...semJogador],
    utilitarios: plano.utilitarios.map((u) => ({
      ...(u.ref !== undefined ? { ref: u.ref } : {}),
      tipo: u.tipo,
      x: u.x,
      y: u.y,
      trajetoria: u.trajetoria ? u.trajetoria.map(paraApi) : null,
      duracao: u.duracao,
    })),
    tracos: plano.tracos.map((t) => ({ jogador_id: t.jogadorId, pontos: t.pontos.map(paraApi), status: t.status })),
  };
}

// Jogador que não está no elenco carregado vira posição sem jogador, para não sumir da tela.
export function planoDaApi(api: PlanoApi, idsDoElenco: Set<number>): Plano {
  const { posicoes } = api;
  const plano: Plano = {
    jogadores: {},
    semJogador: [],
    utilitarios: api.utilitarios.map((u) => ({
      ...(u.ref ? { ref: u.ref } : {}),
      tipo: u.tipo,
      x: u.x,
      y: u.y,
      trajetoria: u.trajetoria ? u.trajetoria.map(daApi) : null,
      duracao: u.duracao,
    })),
    tracos: api.tracos.map((t) => ({
      jogadorId: t.jogador_id !== null && idsDoElenco.has(t.jogador_id) ? t.jogador_id : null,
      pontos: t.pontos.map(daApi),
      status: t.status,
    })),
  };
  for (const p of posicoes) {
    const posicao = { x: p.x, y: p.y, funcaoId: p.funcao_id };
    if (p.jogador_id !== null && idsDoElenco.has(p.jogador_id)) plano.jogadores[p.jogador_id] = posicao;
    else plano.semJogador.push(posicao);
  }
  return plano;
}

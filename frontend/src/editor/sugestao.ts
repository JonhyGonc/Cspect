// Sugestão automática de funções (RF06).
//
// Cada posição no mapa guarda o ponto e a função usada naquela tática (RF08).
// A função da tática é independente do cadastro: trocá-la não altera o jogador.
// A sugestão só preenche posições sem função, usando a função principal do jogador,
// e só se nenhuma outra posição já estiver com essa função.

import type { Jogador } from "../api/jogadores";
import type { Ponto } from "./coordenadas";

export type Posicao = Ponto & {
  // null = posição vazia (sem função na tática).
  funcaoId: number | null;
};

// Jogador que ficou sem sugestão porque a função principal dele já está com outro.
export type SemSugestao = {
  jogadorId: number;
  funcaoId: number;
  ocupadaPor: number;
};

export type ResultadoSugestao = {
  posicoes: Record<number, Posicao>;
  sugeridas: number[]; // ids dos jogadores que receberam função
  semSugestao: SemSugestao[];
};

// Percorre os jogadores na ordem do elenco (a mesma do servidor: nickname, depois id).
// Quando dois jogadores no mapa têm a mesma função principal livre, o primeiro dessa
// ordem recebe a função e os outros ficam vazios, listados em semSugestao.
export function sugerirFuncoes(jogadores: Jogador[], posicoes: Record<number, Posicao>): ResultadoSugestao {
  const novas: Record<number, Posicao> = { ...posicoes };

  // Função -> jogador que já está com ela.
  const ocupadas = new Map<number, number>();
  for (const jogador of jogadores) {
    const funcaoId = novas[jogador.id]?.funcaoId;
    if (funcaoId != null && !ocupadas.has(funcaoId)) ocupadas.set(funcaoId, jogador.id);
  }

  const sugeridas: number[] = [];
  const semSugestao: SemSugestao[] = [];

  for (const jogador of jogadores) {
    const posicao = novas[jogador.id];
    if (!posicao || posicao.funcaoId !== null) continue; // fora do mapa ou já preenchida
    const funcaoId = jogador.funcao_principal.id;
    const dono = ocupadas.get(funcaoId);
    if (dono !== undefined) {
      semSugestao.push({ jogadorId: jogador.id, funcaoId, ocupadaPor: dono });
      continue;
    }
    novas[jogador.id] = { ...posicao, funcaoId };
    ocupadas.set(funcaoId, jogador.id);
    sugeridas.push(jogador.id);
  }

  return { posicoes: novas, sugeridas, semSugestao };
}

// Jogadores no mapa que dividem a mesma função na tática (só acontece por escolha manual).
export function funcoesRepetidas(posicoes: Record<number, Posicao>): Set<number> {
  const contagem = new Map<number, number>();
  for (const posicao of Object.values(posicoes)) {
    if (posicao.funcaoId !== null) contagem.set(posicao.funcaoId, (contagem.get(posicao.funcaoId) ?? 0) + 1);
  }
  return new Set([...contagem].filter(([, n]) => n > 1).map(([funcaoId]) => funcaoId));
}

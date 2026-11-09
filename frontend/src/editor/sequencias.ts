// Regras das sequências da linha do tempo (RF13, RF14). Funções puras.
//
// Marcação automática: uma alteração do plano com uma sequência aberta vale para o
// instante atual. Se já existe uma marcação exatamente nesse instante, ela é alterada; se
// não, uma marcação "automática" é criada nele, a partir do estado interpolado, já com a
// alteração. Uma alteração que não muda nada não cria marcação.
//
// Cada marcação guarda o estado inteiro (como um quadro). Para o item continuar existindo
// "da criação até a remoção" (RF14), a alteração segue para as marcações seguintes:
// - jogador ou utilitário colocado: entra nas marcações seguintes que não o têm, no mesmo ponto;
// - jogador ou utilitário tirado: sai das marcações seguintes;
// - função do jogador, tipo, duração e trajetória do utilitário: valem em todas as marcações
//   em que o item existe (são atributos do item, não da posição);
// - posições: só na marcação alterada (entre marcações, a interpolação cuida do movimento).
// Posições sem jogador e traços não têm identidade: ficam só na marcação alterada.

import type { MarcacaoApi } from "../api/sequencias";
import { estadoNoInstante, marcacaoNoInstante, type Marcacao } from "./interpolacao";
import { planoDaApi, planoParaApi, type Plano } from "./plano";
import type { Utilitario } from "./utilitarios";

export type Sequencia = {
  id: number;
  nome: string;
  origem: "zero" | "plano";
  marcacoes: Marcacao[];
};

export const MARCACOES_MAX = 50;
export const SEQUENCIAS_MAX = 10;
export const INSTANTE_MAX_MS = 3_600_000;

function ordenar(marcacoes: Marcacao[]): Marcacao[] {
  return [...marcacoes].sort((a, b) => a.instante - b.instante);
}

// Ref curta e única na sequência: u1, u2, ...
function comRefs(estado: Plano, marcacoes: Marcacao[]): Plano {
  if (estado.utilitarios.every((u) => u.ref)) return estado;
  const usadas = new Set(marcacoes.flatMap((m) => m.estado.utilitarios.map((u) => u.ref)));
  estado.utilitarios.forEach((u) => usadas.add(u.ref));
  let proxima = 1;
  const novaRef = () => {
    while (usadas.has(`u${proxima}`)) proxima++;
    usadas.add(`u${proxima}`);
    return `u${proxima}`;
  };
  return { ...estado, utilitarios: estado.utilitarios.map((u) => (u.ref ? u : { ...u, ref: novaRef() })) };
}

const atributos = (u: Utilitario) => JSON.stringify([u.tipo, u.duracao, u.trajetoria]);

function propagar(marcacao: Marcacao, base: Plano, novo: Plano, depois: boolean): Marcacao {
  const estado = marcacao.estado;
  let jogadores = estado.jogadores;
  let utilitarios = estado.utilitarios;

  // Jogadores (identidade: id do jogador).
  const ids = new Set([...Object.keys(base.jogadores), ...Object.keys(novo.jogadores)].map(Number));
  for (const id of ids) {
    const antes = base.jogadores[id];
    const agora = novo.jogadores[id];
    if (!antes && agora && depois && !jogadores[id]) jogadores = { ...jogadores, [id]: agora };
    else if (antes && !agora && depois && jogadores[id]) {
      jogadores = { ...jogadores };
      delete jogadores[id];
    } else if (antes && agora && antes.funcaoId !== agora.funcaoId && jogadores[id]) {
      jogadores = { ...jogadores, [id]: { ...jogadores[id], funcaoId: agora.funcaoId } };
    }
  }

  // Utilitários (identidade: ref).
  const antesPorRef = new Map(base.utilitarios.map((u) => [u.ref, u]));
  const agoraPorRef = new Map(novo.utilitarios.map((u) => [u.ref, u]));
  for (const [ref, agora] of agoraPorRef) {
    const antes = antesPorRef.get(ref);
    const aqui = utilitarios.find((u) => u.ref === ref);
    if (!antes && depois && !aqui) utilitarios = [...utilitarios, agora];
    else if (antes && aqui && atributos(antes) !== atributos(agora)) {
      utilitarios = utilitarios.map((u) =>
        u.ref === ref ? { ...u, tipo: agora.tipo, duracao: agora.duracao, trajetoria: agora.trajetoria } : u,
      );
    }
  }
  for (const ref of antesPorRef.keys()) {
    if (!agoraPorRef.has(ref) && depois) utilitarios = utilitarios.filter((u) => u.ref !== ref);
  }

  if (jogadores === estado.jogadores && utilitarios === estado.utilitarios) return marcacao;
  return { ...marcacao, estado: { ...estado, jogadores, utilitarios } };
}

export function aplicarAlteracao(
  marcacoes: Marcacao[],
  instante: number,
  transformar: (estado: Plano) => Plano,
): Marcacao[] {
  const existente = marcacaoNoInstante(marcacoes, instante);
  const base = existente ? existente.estado : estadoNoInstante(marcacoes, instante);
  const transformado = transformar(base);
  if (transformado === base) return marcacoes;
  if (!existente && marcacoes.length >= MARCACOES_MAX) return marcacoes;
  const novo = comRefs(transformado, marcacoes);

  const resultado = marcacoes.map((m) =>
    m === existente ? { ...m, estado: novo } : propagar(m, base, novo, m.instante > instante),
  );
  if (!existente) resultado.push({ instante, tipo: "automatica", estado: novo });
  return ordenar(resultado);
}

// Marcação manual no instante atual, com o estado interpolado.
export function adicionarMarcacao(marcacoes: Marcacao[], instante: number): Marcacao[] {
  if (marcacaoNoInstante(marcacoes, instante) || marcacoes.length >= MARCACOES_MAX) return marcacoes;
  return ordenar([...marcacoes, { instante, tipo: "manual", estado: estadoNoInstante(marcacoes, instante) }]);
}

// A sequência mantém pelo menos uma marcação.
export function apagarMarcacao(marcacoes: Marcacao[], instante: number): Marcacao[] {
  if (marcacoes.length <= 1 || !marcacaoNoInstante(marcacoes, instante)) return marcacoes;
  return marcacoes.filter((m) => m.instante !== instante);
}

export function marcacaoParaApi(marcacao: Marcacao): MarcacaoApi {
  return { instante: marcacao.instante, tipo: marcacao.tipo, ...planoParaApi(marcacao.estado) };
}

export function marcacaoDaApi(api: MarcacaoApi, idsDoElenco: Set<number>): Marcacao {
  return { instante: api.instante, tipo: api.tipo, estado: planoDaApi(api, idsDoElenco) };
}

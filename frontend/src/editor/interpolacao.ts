// Interpolação da linha do tempo (RF14).
//
// Funções puras, sem imports de valor, para o teste rodar direto no Node (npm test).
//
// Regras, entre a marcação A (a última com instante <= t) e a seguinte, B:
// - jogador presente em A e em B: posição interpolada de forma linear pelo tempo;
// - utilitário presente em A e em B (mesma ref): impacto interpolado da mesma forma;
// - item presente só em A: fica parado na posição de A até B, onde some;
// - item presente só em B: aparece em B (não antes);
// - posições sem jogador e traços não têm identidade: valem os de A.
// Antes da primeira marcação vale a primeira; depois da última, a última.

import type { Ponto } from "./coordenadas";
import type { Plano } from "./plano";
import type { Utilitario } from "./utilitarios";

export type TipoMarcacao = "manual" | "automatica";

export type Marcacao = {
  instante: number; // milissegundos
  tipo: TipoMarcacao;
  estado: Plano;
};

const VAZIO: Plano = { jogadores: {}, semJogador: [], utilitarios: [], tracos: [] };

function interpolar(a: Ponto, b: Ponto, fator: number): Ponto {
  return { x: a.x + (b.x - a.x) * fator, y: a.y + (b.y - a.y) * fator };
}

// Índice da última marcação com instante <= t (marcações em ordem de instante), ou -1.
export function indiceAnterior(marcacoes: Marcacao[], instante: number): number {
  let indice = -1;
  for (let i = 0; i < marcacoes.length && marcacoes[i].instante <= instante; i++) indice = i;
  return indice;
}

export function marcacaoNoInstante(marcacoes: Marcacao[], instante: number): Marcacao | undefined {
  return marcacoes.find((m) => m.instante === instante);
}

export function estadoNoInstante(marcacoes: Marcacao[], instante: number): Plano {
  if (marcacoes.length === 0) return VAZIO;
  const i = indiceAnterior(marcacoes, instante);
  if (i < 0) return marcacoes[0].estado;
  const a = marcacoes[i];
  const b = marcacoes[i + 1];
  if (!b || a.instante === instante) return a.estado;

  const fator = (instante - a.instante) / (b.instante - a.instante);
  const jogadores: Plano["jogadores"] = {};
  for (const [id, posicao] of Object.entries(a.estado.jogadores)) {
    const destino = b.estado.jogadores[Number(id)];
    jogadores[Number(id)] = destino ? { ...posicao, ...interpolar(posicao, destino, fator) } : posicao;
  }
  const destinoPorRef = new Map(b.estado.utilitarios.filter((u) => u.ref).map((u) => [u.ref, u]));
  const utilitarios: Utilitario[] = a.estado.utilitarios.map((u) => {
    const destino = u.ref ? destinoPorRef.get(u.ref) : undefined;
    return destino ? { ...u, ...interpolar(u, destino, fator) } : u;
  });
  return { ...a.estado, jogadores, utilitarios };
}

export type Faixa = {
  ref: string;
  tipo: Utilitario["tipo"];
  inicio: number; // instante da marcação de criação, em ms
  duracao: number | null; // ms; null = momento (flash e HE)
};

// Faixas de duração na linha do tempo (RF11): smoke e molotov ocupam a duração a partir da
// marcação em que aparecem pela primeira vez; flash e HE são um momento nesse instante.
export function faixasDeDuracao(marcacoes: Marcacao[]): Faixa[] {
  const faixas = new Map<string, Faixa>();
  for (const marcacao of marcacoes) {
    for (const u of marcacao.estado.utilitarios) {
      if (!u.ref || faixas.has(u.ref)) continue;
      faixas.set(u.ref, {
        ref: u.ref,
        tipo: u.tipo,
        inicio: marcacao.instante,
        duracao: u.duracao === null ? null : u.duracao * 1000,
      });
    }
  }
  return [...faixas.values()];
}

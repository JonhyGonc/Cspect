// Utilitários (RF10, RF11) e traços de caminho (RF09) no plano fixo.
//
// Tudo em coordenadas normalizadas (0 a 1) na orientação original do PNG, como as
// posições de jogador (T4.1). A tela converte pela rotação atual com editor/coordenadas.ts.

import type { Ponto } from "./coordenadas";

export type TipoUtilitario = "smoke" | "flash" | "molotov" | "he";
export type StatusTraco = "rascunho" | "confirmado";

export type Utilitario = Ponto & {
  // Identidade entre as marcações de uma sequência (RF14). Vazia no plano fixo.
  ref?: string;
  tipo: TipoUtilitario;
  // Linha de arremesso, do lançamento até antes do impacto (opcional). O desenho liga o
  // último ponto ao impacto, então mover o utilitário mantém a linha chegando nele.
  trajetoria: Ponto[] | null;
  duracao: number | null; // segundos; null para flash e HE
};

export type Traco = {
  jogadorId: number | null; // null quando o jogador foi removido do elenco (RF08A)
  pontos: Ponto[];
  status: StatusTraco;
};

// Limites iguais aos do servidor (backend/app/schemas.py).
export const UTILITARIOS_MAX = 30;
export const TRACOS_MAX = 30;
export const PONTOS_TRACO_MAX = 200;
export const PONTOS_TRAJETORIA_MAX = 50;

type InfoTipo = { nome: string; rotulo: string; duracaoPadrao: number | null; nota: string | null };

// Duração padrão do jogo (RF11). Smoke: a confirmar, as fontes divergem entre 18 e 20 s.
export const TIPOS_UTILITARIO: Record<TipoUtilitario, InfoTipo> = {
  smoke: { nome: "Smoke", rotulo: "S", duracaoPadrao: 18, nota: "valor a confirmar no jogo" },
  flash: { nome: "Flash", rotulo: "F", duracaoPadrao: null, nota: null },
  molotov: { nome: "Molotov", rotulo: "M", duracaoPadrao: 7, nota: null },
  he: { nome: "HE", rotulo: "HE", duracaoPadrao: null, nota: null },
};

export const ORDEM_TIPOS: readonly TipoUtilitario[] = ["smoke", "flash", "molotov", "he"];

export function criarUtilitario(tipo: TipoUtilitario, impacto: Ponto): Utilitario {
  return { tipo, x: impacto.x, y: impacto.y, trajetoria: null, duracao: TIPOS_UTILITARIO[tipo].duracaoPadrao };
}

// Trocar o tipo volta a duração para a padrão do novo tipo.
export function trocarTipo(utilitario: Utilitario, tipo: TipoUtilitario): Utilitario {
  return { ...utilitario, tipo, duracao: TIPOS_UTILITARIO[tipo].duracaoPadrao };
}

export const DURACAO_MAX = 120; // segundos, igual ao servidor

export function ajustarDuracao(utilitario: Utilitario, segundos: number): Utilitario {
  if (utilitario.duracao === null) return utilitario; // flash e HE não têm duração
  const duracao = Math.min(DURACAO_MAX, Math.max(1, Math.round(segundos)));
  return duracao === utilitario.duracao ? utilitario : { ...utilitario, duracao };
}

export function descreverDuracao(utilitario: Utilitario): string {
  const info = TIPOS_UTILITARIO[utilitario.tipo];
  if (utilitario.duracao === null) return "momento (sem duração)";
  return `${utilitario.duracao} s${info.nota ? ` (${info.nota})` : ""}`;
}

// Reduz a lista a no máximo `maximo` pontos, mantendo o primeiro e o último e
// escolhendo os demais em intervalos regulares.
export function simplificar(pontos: Ponto[], maximo: number): Ponto[] {
  if (pontos.length <= maximo) return pontos;
  const resultado: Ponto[] = [];
  for (let i = 0; i < maximo; i++) {
    resultado.push(pontos[Math.round((i * (pontos.length - 1)) / (maximo - 1))]);
  }
  return resultado;
}

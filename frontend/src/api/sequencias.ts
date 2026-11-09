// Chamadas de sequências ao backend (RF13, RF14). Caminhos relativos (/api/...).
// Os erros seguem as mesmas mensagens das táticas (ErroTatica).

import { ErroTatica, type PosicaoApi, type TracoApi, type UtilitarioApi } from "./taticas";

export type MarcacaoApi = {
  instante: number;
  tipo: "manual" | "automatica";
  posicoes: PosicaoApi[];
  utilitarios: UtilitarioApi[];
  tracos: TracoApi[];
};

export type SequenciaApi = {
  id: number;
  nome: string;
  origem: "zero" | "plano";
  criada_em: string;
  alterada_em: string;
  marcacoes: MarcacaoApi[];
};

const MENSAGENS: Record<number, string> = {
  401: "Sua sessão expirou. Entre novamente para continuar salvando.",
  404: "Sequência não encontrada.",
  503: "O banco de dados está indisponível no momento. Tente novamente em instantes.",
};

async function chamar(caminho: string, init: RequestInit = {}): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, init);
  } catch {
    throw new ErroTatica(0, "Não foi possível conectar ao servidor. Tente novamente.");
  }
  if (resposta.ok) return resposta;
  let mensagem = MENSAGENS[resposta.status] ?? "Algo deu errado. Tente novamente.";
  if (resposta.status === 422) {
    const detalhe = ((await resposta.json().catch(() => null)) as { detail?: unknown } | null)?.detail;
    mensagem = typeof detalhe === "string" && detalhe.trim() ? detalhe : "Confira os dados da sequência.";
  }
  throw new ErroTatica(resposta.status, mensagem);
}

const base = (taticaId: number) => `/api/taticas/${taticaId}/sequencias`;
const JSON_CABECALHOS = { "Content-Type": "application/json" };

export async function listarSequencias(taticaId: number): Promise<SequenciaApi[]> {
  return (await (await chamar(base(taticaId))).json()) as SequenciaApi[];
}

export async function criarSequencia(taticaId: number, nome: string, origem: "zero" | "plano"): Promise<SequenciaApi> {
  const resposta = await chamar(base(taticaId), {
    method: "POST",
    headers: JSON_CABECALHOS,
    body: JSON.stringify({ nome, origem }),
  });
  return (await resposta.json()) as SequenciaApi;
}

export async function atualizarSequencia(
  taticaId: number,
  sequenciaId: number,
  dados: { nome: string; marcacoes: MarcacaoApi[] },
  keepalive = false,
): Promise<void> {
  await chamar(`${base(taticaId)}/${sequenciaId}`, {
    method: "PUT",
    headers: JSON_CABECALHOS,
    body: JSON.stringify(dados),
    keepalive,
  });
}

export async function removerSequencia(taticaId: number, sequenciaId: number): Promise<void> {
  await chamar(`${base(taticaId)}/${sequenciaId}`, { method: "DELETE" });
}

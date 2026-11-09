// Listas fixas de classificação (RF18): execução, economia e objetivo.
import { ErroTatica } from "./taticas";

export type ItemReferencia = { id: number; nome: string };

export type Referencias = {
  execucoes: ItemReferencia[];
  economias: ItemReferencia[];
  objetivos: ItemReferencia[];
};

export const CATEGORIAS = [
  { chave: "execucoes", rotulo: "Execução" },
  { chave: "economias", rotulo: "Economia" },
  { chave: "objetivos", rotulo: "Objetivo" },
] as const;

export async function listarReferencias(): Promise<Referencias> {
  let resposta: Response;
  try {
    resposta = await fetch("/api/referencias");
  } catch {
    throw new ErroTatica(0, "Não foi possível conectar ao servidor. Tente novamente.");
  }
  if (!resposta.ok) {
    throw new ErroTatica(
      resposta.status,
      resposta.status === 503
        ? "O banco de dados está indisponível no momento. Tente novamente em instantes."
        : "Algo deu errado. Tente novamente.",
    );
  }
  return (await resposta.json()) as Referencias;
}

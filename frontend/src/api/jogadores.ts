// Chamadas de jogadores e funções ao backend (RF04, RF05).
// Todos os caminhos são relativos (/api/...): o Vite encaminha para o backend em desenvolvimento.

export type Funcao = {
  id: number;
  nome: string;
};

export type Jogador = {
  id: number;
  nickname: string;
  avatar: string;
  funcao_principal: Funcao;
  funcoes_secundarias: Funcao[];
  observacoes: string;
};

export type DadosJogador = {
  nickname: string;
  funcao_principal_id: number;
  funcoes_secundarias_ids: number[];
  observacoes: string;
};

export class ErroApi extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

export const MSG_NICKNAME_REPETIDO = "Você já tem um jogador com este nickname.";
export const MSG_DADOS_INVALIDOS = "Confira os dados informados e tente novamente.";
export const MSG_NAO_ENCONTRADO = "Jogador não encontrado. Ele pode ter sido removido em outra aba.";
export const MSG_INDISPONIVEL = "O banco de dados está indisponível no momento. Tente novamente em instantes.";
export const MSG_SEM_SESSAO = "Sua sessão expirou. Entre novamente.";
const MSG_CONEXAO = "Não foi possível conectar ao servidor. Tente novamente.";
const MSG_INESPERADA = "Algo deu errado. Tente novamente.";

const CABECALHOS_JSON = { "Content-Type": "application/json" };

async function enviar(caminho: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(caminho, init);
  } catch {
    throw new ErroApi(0, MSG_CONEXAO);
  }
}

// O 422 pode vir com um texto próprio (ex.: "Função inexistente.") ou com a lista de
// erros do Pydantic. Da lista, só aproveitamos as mensagens escritas por nós em
// backend/app/schemas.py (as que começam com "Value error, "); as demais vêm em inglês.
function mensagem422(corpo: unknown): string {
  const detalhe = (corpo as { detail?: unknown } | null)?.detail;
  if (typeof detalhe === "string" && detalhe.trim()) return detalhe;
  if (Array.isArray(detalhe)) {
    for (const item of detalhe) {
      const msg = (item as { msg?: unknown } | null)?.msg;
      if (typeof msg === "string" && msg.startsWith("Value error, ")) {
        return msg.slice("Value error, ".length);
      }
    }
  }
  return MSG_DADOS_INVALIDOS;
}

async function erroDe(resposta: Response): Promise<ErroApi> {
  switch (resposta.status) {
    case 401:
      return new ErroApi(401, MSG_SEM_SESSAO);
    case 404:
      return new ErroApi(404, MSG_NAO_ENCONTRADO);
    case 409:
      return new ErroApi(409, MSG_NICKNAME_REPETIDO);
    case 422: {
      const corpo = await resposta.json().catch(() => null);
      return new ErroApi(422, mensagem422(corpo));
    }
    case 503:
      return new ErroApi(503, MSG_INDISPONIVEL);
    default:
      return new ErroApi(resposta.status, MSG_INESPERADA);
  }
}

export async function listarFuncoes(): Promise<Funcao[]> {
  const resposta = await enviar("/api/funcoes");
  if (!resposta.ok) throw await erroDe(resposta);
  return (await resposta.json()) as Funcao[];
}

export async function listarJogadores(): Promise<Jogador[]> {
  const resposta = await enviar("/api/jogadores");
  if (!resposta.ok) throw await erroDe(resposta);
  return (await resposta.json()) as Jogador[];
}

export async function criarJogador(dados: DadosJogador): Promise<Jogador> {
  const resposta = await enviar("/api/jogadores", {
    method: "POST",
    headers: CABECALHOS_JSON,
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) throw await erroDe(resposta);
  return (await resposta.json()) as Jogador;
}

export async function atualizarJogador(id: number, dados: DadosJogador): Promise<Jogador> {
  const resposta = await enviar(`/api/jogadores/${id}`, {
    method: "PUT",
    headers: CABECALHOS_JSON,
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) throw await erroDe(resposta);
  return (await resposta.json()) as Jogador;
}

export async function removerJogador(id: number): Promise<void> {
  const resposta = await enviar(`/api/jogadores/${id}`, { method: "DELETE" });
  if (!resposta.ok) throw await erroDe(resposta);
}

export function mensagemDoErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : MSG_INESPERADA;
}

export function statusDoErro(erro: unknown): number | null {
  return erro instanceof ErroApi ? erro.status : null;
}

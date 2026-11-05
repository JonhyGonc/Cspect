// Chamadas de autenticação ao backend (RF01).
// Todos os caminhos são relativos (/api/...): o Vite encaminha para o backend em desenvolvimento.

export type Usuario = {
  id: number;
  email: string;
  nome_exibicao: string;
};

export type DadosCadastro = {
  email: string;
  senha: string;
  nome_exibicao: string;
  aceite_termo: boolean;
  versao_termo: string;
};

export class ErroAutenticacao extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "ErroAutenticacao";
    this.status = status;
  }
}

const MSG_DADOS_INVALIDOS = "Confira os dados informados e tente novamente.";
const MSG_INDISPONIVEL = "O serviço está indisponível no momento. Tente novamente em instantes.";
const MSG_CONEXAO = "Não foi possível conectar ao servidor. Tente novamente.";
const MSG_INESPERADA = "Algo deu errado. Tente novamente.";

// Mensagens que valem para qualquer rota quando o status não tem texto próprio.
const PADRAO_POR_STATUS: Partial<Record<number, string>> = {
  422: MSG_DADOS_INVALIDOS,
  503: MSG_INDISPONIVEL,
};

const CABECALHOS_JSON = { "Content-Type": "application/json" };

async function enviar(caminho: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(caminho, init);
  } catch {
    throw new ErroAutenticacao(0, MSG_CONEXAO);
  }
}

function erroDe(status: number, especificas: Partial<Record<number, string>> = {}): ErroAutenticacao {
  const mensagem = especificas[status] ?? PADRAO_POR_STATUS[status] ?? MSG_INESPERADA;
  return new ErroAutenticacao(status, mensagem);
}

export async function cadastrar(dados: DadosCadastro): Promise<Usuario> {
  const resposta = await enviar("/api/auth/register", {
    method: "POST",
    headers: CABECALHOS_JSON,
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) {
    throw erroDe(resposta.status, { 409: "Este e-mail já está cadastrado." });
  }
  return (await resposta.json()) as Usuario;
}

export async function entrar(email: string, senha: string): Promise<Usuario> {
  const resposta = await enviar("/api/auth/login", {
    method: "POST",
    headers: CABECALHOS_JSON,
    body: JSON.stringify({ email, senha }),
  });
  if (!resposta.ok) {
    throw erroDe(resposta.status, {
      401: "E-mail ou senha inválidos.",
      423: "Conta temporariamente bloqueada. Tente novamente mais tarde.",
    });
  }
  return (await resposta.json()) as Usuario;
}

export async function sair(): Promise<void> {
  const resposta = await enviar("/api/auth/logout", { method: "POST" });
  if (!resposta.ok) {
    throw erroDe(resposta.status);
  }
}

// Devolve o usuário da sessão atual, ou null quando não há sessão válida (401).
export async function usuarioAtual(): Promise<Usuario | null> {
  const resposta = await enviar("/api/auth/me");
  if (resposta.status === 401) return null;
  if (!resposta.ok) {
    throw erroDe(resposta.status);
  }
  return (await resposta.json()) as Usuario;
}

export function mensagemDeErro(erro: unknown): string {
  return erro instanceof ErroAutenticacao ? erro.message : MSG_INESPERADA;
}

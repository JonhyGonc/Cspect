// Chamadas de táticas ao backend (RF08, RF12). Caminhos relativos (/api/...).

export type Lado = "T" | "CT";
export type Visibilidade = "privada" | "publica";

export type PosicaoApi = {
  jogador_id: number | null;
  funcao_id: number | null;
  x: number;
  y: number;
};

export type DadosTatica = {
  nome: string;
  lado: Lado;
  visibilidade: Visibilidade;
  posicoes: PosicaoApi[];
};

export type TaticaResumo = {
  id: number;
  nome: string;
  mapa_id: string;
  lado: Lado;
  visibilidade: Visibilidade;
  alterada_em: string;
};

export type Tatica = TaticaResumo & {
  criada_em: string;
  posicoes: PosicaoApi[];
};

export class ErroTatica extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "ErroTatica";
    this.status = status;
  }
}

const MSG_NAO_ENCONTRADA = "Tática não encontrada.";
const MSG_SEM_SESSAO = "Sua sessão expirou. Entre novamente para continuar salvando.";
const MSG_DADOS_INVALIDOS = "Confira os dados da tática e tente novamente.";
const MSG_INDISPONIVEL = "O banco de dados está indisponível no momento. Tente novamente em instantes.";
const MSG_CONEXAO = "Não foi possível conectar ao servidor. Tente novamente.";
const MSG_INESPERADA = "Algo deu errado. Tente novamente.";

const CABECALHOS_JSON = { "Content-Type": "application/json" };

async function enviar(caminho: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(caminho, init);
  } catch {
    throw new ErroTatica(0, MSG_CONEXAO);
  }
}

// O 422 com texto próprio (ex.: "Função inexistente.") é mostrado; a lista do Pydantic,
// só nas mensagens escritas por nós em backend/app/schemas.py.
async function erroDe(resposta: Response): Promise<ErroTatica> {
  switch (resposta.status) {
    case 401:
      return new ErroTatica(401, MSG_SEM_SESSAO);
    case 404:
      return new ErroTatica(404, MSG_NAO_ENCONTRADA);
    case 422: {
      const detalhe = ((await resposta.json().catch(() => null)) as { detail?: unknown } | null)?.detail;
      if (typeof detalhe === "string" && detalhe.trim()) return new ErroTatica(422, detalhe);
      if (Array.isArray(detalhe)) {
        for (const item of detalhe) {
          const msg = (item as { msg?: unknown } | null)?.msg;
          if (typeof msg === "string" && msg.startsWith("Value error, ")) {
            return new ErroTatica(422, msg.slice("Value error, ".length));
          }
        }
      }
      return new ErroTatica(422, MSG_DADOS_INVALIDOS);
    }
    case 503:
      return new ErroTatica(503, MSG_INDISPONIVEL);
    default:
      return new ErroTatica(resposta.status, MSG_INESPERADA);
  }
}

export async function listarTaticas(): Promise<TaticaResumo[]> {
  const resposta = await enviar("/api/taticas");
  if (!resposta.ok) throw await erroDe(resposta);
  return (await resposta.json()) as TaticaResumo[];
}

export async function obterTatica(id: number): Promise<Tatica> {
  const resposta = await enviar(`/api/taticas/${id}`);
  if (!resposta.ok) throw await erroDe(resposta);
  return (await resposta.json()) as Tatica;
}

// keepalive: a requisição continua mesmo se a página for fechada (salvamento ao sair).
export async function criarTatica(mapaId: string, dados: DadosTatica, keepalive = false): Promise<Tatica> {
  const resposta = await enviar("/api/taticas", {
    method: "POST",
    headers: CABECALHOS_JSON,
    body: JSON.stringify({ ...dados, mapa_id: mapaId }),
    keepalive,
  });
  if (!resposta.ok) throw await erroDe(resposta);
  return (await resposta.json()) as Tatica;
}

export async function atualizarTatica(id: number, dados: DadosTatica, keepalive = false): Promise<Tatica> {
  const resposta = await enviar(`/api/taticas/${id}`, {
    method: "PUT",
    headers: CABECALHOS_JSON,
    body: JSON.stringify(dados),
    keepalive,
  });
  if (!resposta.ok) throw await erroDe(resposta);
  return (await resposta.json()) as Tatica;
}

export function mensagemDoErroTatica(erro: unknown): string {
  return erro instanceof ErroTatica ? erro.message : MSG_INESPERADA;
}

export function statusDoErroTatica(erro: unknown): number | null {
  return erro instanceof ErroTatica ? erro.status : null;
}

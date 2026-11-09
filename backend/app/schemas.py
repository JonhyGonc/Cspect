import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator, model_validator

# Formato básico: algo@dominio.ext, sem espaços. Validação completa de e-mail
# fica fora do escopo da Fase 2 para não adicionar dependências.
_EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


class CadastroRequest(BaseModel):
    email: str = Field(max_length=254)
    senha: str = Field(min_length=8, max_length=128)
    nome_exibicao: str = Field(min_length=1, max_length=40)
    aceite_termo: bool
    versao_termo: str = Field(min_length=1, max_length=20)

    @field_validator("email")
    @classmethod
    def validar_email(cls, valor: str) -> str:
        normalizado = valor.strip().lower()
        if len(normalizado) > 254 or not _EMAIL.fullmatch(normalizado):
            raise ValueError("E-mail em formato inválido.")
        return normalizado

    @field_validator("nome_exibicao")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        limpo = valor.strip()
        if not 1 <= len(limpo) <= 40:
            raise ValueError("O nome de exibição deve ter entre 1 e 40 caracteres.")
        return limpo

    @field_validator("versao_termo")
    @classmethod
    def validar_versao_termo(cls, valor: str) -> str:
        limpo = valor.strip()
        if not limpo:
            raise ValueError("A versão do termo é obrigatória.")
        return limpo

    @field_validator("aceite_termo")
    @classmethod
    def validar_aceite(cls, valor: bool) -> bool:
        if not valor:
            raise ValueError("É preciso aceitar o termo de uso para criar a conta.")
        return valor


class UsuarioCriado(BaseModel):
    """Resposta do cadastro. Nunca inclui senha nem hash."""

    id: int
    email: str
    nome_exibicao: str


class LoginRequest(BaseModel):
    # Sem validação de formato de e-mail: um e-mail malformado recebe a mesma resposta
    # genérica de "e-mail ou senha inválidos", sem revelar nada sobre as contas.
    email: str = Field(max_length=254)
    senha: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, valor: str) -> str:
        return valor.strip().lower()


class UsuarioSessao(BaseModel):
    """Usuário da sessão ativa (login e /me). Nunca inclui senha nem hash."""

    id: int
    email: str
    nome_exibicao: str


# --- Jogadores (T3.1) ---------------------------------------------------------

NICKNAME_MAX = 32
OBSERVACOES_MAX = 500
SECUNDARIAS_MAX = 5  # com 6 funções e a principal excluída, sobram no máximo 5

# StrictInt: recusa true/false e textos como "1"; o limite superior é o do SMALLINT.
IdFuncao = Field(ge=1, le=32767)


class JogadorRequest(BaseModel):
    """Dados para criar (POST) ou substituir (PUT) um jogador (RNF04)."""

    nickname: str
    funcao_principal_id: StrictInt = IdFuncao
    funcoes_secundarias_ids: list[StrictInt] = Field(max_length=SECUNDARIAS_MAX)
    observacoes: str | None = Field(default="", max_length=OBSERVACOES_MAX)

    @field_validator("nickname")
    @classmethod
    def validar_nickname(cls, valor: str) -> str:
        limpo = valor.strip()
        if not 1 <= len(limpo) <= NICKNAME_MAX:
            raise ValueError(f"O nickname deve ter entre 1 e {NICKNAME_MAX} caracteres.")
        return limpo

    @field_validator("funcoes_secundarias_ids")
    @classmethod
    def validar_secundarias(cls, valor: list[int]) -> list[int]:
        if any(not 1 <= item <= 32767 for item in valor):
            raise ValueError("Função secundária inexistente.")
        if len(set(valor)) != len(valor):
            raise ValueError("Uma função secundária não pode se repetir.")
        return valor

    @field_validator("observacoes")
    @classmethod
    def normalizar_observacoes(cls, valor: str | None) -> str:
        return valor or ""

    @model_validator(mode="after")
    def secundaria_diferente_da_principal(self) -> "JogadorRequest":
        if self.funcao_principal_id in self.funcoes_secundarias_ids:
            raise ValueError("A função principal não pode ser também uma função secundária.")
        return self


class Funcao(BaseModel):
    id: int
    nome: str


class Jogador(BaseModel):
    id: int
    nickname: str
    avatar: str
    funcao_principal: Funcao
    funcoes_secundarias: list[Funcao]
    observacoes: str


# --- Táticas, plano fixo (T4.4) ----------------------------------------------

NOME_TATICA_MAX = 60
POSICOES_MAX = 20  # por quadro: folga sobre os 5 jogadores de um lado, sem abrir para abuso

MapaId = Literal["ancient", "anubis", "cache", "dust2", "inferno", "mirage", "nuke"]
Lado = Literal["T", "CT"]
Visibilidade = Literal["privada", "publica"]
# Coordenada normalizada: número finito de 0 a 1 (recusa NaN, infinito, texto e booleano).
Coordenada = Annotated[float, Field(strict=True, ge=0, le=1, allow_inf_nan=False)]
IdJogadorNaTatica = Annotated[int, Field(strict=True, ge=1, le=9_223_372_036_854_775_807)]
IdFuncaoNaTatica = Annotated[int, Field(strict=True, ge=1, le=32767)]


class PosicaoQuadro(BaseModel):
    """Posição de jogador no quadro (RF08): jogador (pode ser nulo, RF08A), função e coordenadas."""

    model_config = ConfigDict(extra="forbid")

    jogador_id: IdJogadorNaTatica | None = None
    funcao_id: IdFuncaoNaTatica | None = None
    x: Coordenada
    y: Coordenada


# --- Utilitários e traços no quadro (fase 5: RF09, RF10, RF11) -------------

UTILITARIOS_MAX = 30  # por tática
TRACOS_MAX = 30  # por tática
PONTOS_TRACO_MAX = 200
PONTOS_TRAJETORIA_MAX = 50
DURACAO_MAX = 120  # segundos: folga sobre a duração real de smoke e molotov
# Duração padrão por tipo, em segundos (RF11). Smoke: valor a confirmar no jogo, as fontes
# divergem entre 18 e 20 (Anexo B). Flash e HE são um momento, sem duração.
DURACAO_PADRAO = {"smoke": 18, "molotov": 7}

TipoUtilitario = Literal["smoke", "flash", "molotov", "he"]
StatusTraco = Literal["rascunho", "confirmado"]
# Ponto normalizado [x, y], na orientação original do PNG.
Ponto = tuple[Coordenada, Coordenada]


class UtilitarioQuadro(BaseModel):
    """Utilitário no quadro (RF10): tipo, impacto, trajetória opcional e duração (RF11).

    A trajetória é a linha de arremesso, do ponto de lançamento até antes do impacto; o
    desenho liga o último ponto dela ao impacto. Sem duração informada, smoke e molotov
    recebem a padrão; flash e HE não têm duração.
    """

    model_config = ConfigDict(extra="forbid")

    tipo: TipoUtilitario
    x: Coordenada
    y: Coordenada
    trajetoria: list[Ponto] | None = Field(default=None, min_length=1, max_length=PONTOS_TRAJETORIA_MAX)
    duracao: Annotated[int, Field(strict=True, ge=1, le=DURACAO_MAX)] | None = None

    @model_validator(mode="after")
    def duracao_por_tipo(self) -> "UtilitarioQuadro":
        if self.tipo in DURACAO_PADRAO:
            if self.duracao is None:
                self.duracao = DURACAO_PADRAO[self.tipo]
        elif self.duracao is not None:
            raise ValueError("Flash e HE não têm duração.")
        return self


class Traco(BaseModel):
    """Traço de caminho (RF09): jogador (nulo se removido do elenco, RF08A), pontos e status."""

    model_config = ConfigDict(extra="forbid")

    jogador_id: IdJogadorNaTatica | None = None
    pontos: list[Ponto] = Field(min_length=2, max_length=PONTOS_TRACO_MAX)
    status: StatusTraco = "rascunho"


class _DadosTatica(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str
    lado: Lado
    visibilidade: Visibilidade = "privada"
    posicoes: list[PosicaoQuadro] = Field(max_length=POSICOES_MAX)
    # Opcionais com padrão vazio: o contrato da T4.4 continua valendo.
    utilitarios: list[UtilitarioQuadro] = Field(default_factory=list, max_length=UTILITARIOS_MAX)
    tracos: list[Traco] = Field(default_factory=list, max_length=TRACOS_MAX)

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        limpo = valor.strip()
        if not 1 <= len(limpo) <= NOME_TATICA_MAX:
            raise ValueError(f"O nome da tática deve ter entre 1 e {NOME_TATICA_MAX} caracteres.")
        return limpo

    @field_validator("posicoes")
    @classmethod
    def jogador_uma_vez(cls, valor: list[PosicaoQuadro]) -> list[PosicaoQuadro]:
        ids = [p.jogador_id for p in valor if p.jogador_id is not None]
        if len(set(ids)) != len(ids):
            raise ValueError("Cada jogador pode ocupar só uma posição no plano.")
        return valor


# Classificação da tática (RF18): ids das listas fixas de execução, economia e objetivo.
# Pode haver mais de uma opção por categoria; ids repetidos contam uma vez.
IdClassificacao = Annotated[int, Field(strict=True, ge=1, le=32767)]
ListaClassificacao = Annotated[list[IdClassificacao], Field(max_length=10)]


class TaticaCriar(_DadosTatica):
    """POST /api/taticas: o mapa é escolhido na criação e não muda depois."""

    mapa_id: MapaId
    execucoes: ListaClassificacao = Field(default_factory=list)
    economias: ListaClassificacao = Field(default_factory=list)
    objetivos: ListaClassificacao = Field(default_factory=list)


class TaticaAtualizar(_DadosTatica):
    """PUT /api/taticas/{id}: substitui nome, lado, visibilidade, o plano fixo e, quando
    informadas, as classificações. Classificação ausente (null) fica como está; lista vazia
    apaga a classificação daquela categoria."""

    execucoes: ListaClassificacao | None = None
    economias: ListaClassificacao | None = None
    objetivos: ListaClassificacao | None = None


class TaticaResumo(BaseModel):
    """Cartão da biblioteca (RF19). posicoes é o plano fixo, para a miniatura; jogadores é
    a quantidade de posições com jogador, calculada a cada consulta (não fica no banco)."""

    id: int
    nome: str
    mapa_id: str
    lado: str
    visibilidade: str
    alterada_em: datetime
    execucoes: list[int]
    economias: list[int]
    objetivos: list[int]
    jogadores: int
    posicoes: list[PosicaoQuadro]


class ItemReferencia(BaseModel):
    id: int
    nome: str


class Referencias(BaseModel):
    """GET /api/referencias: as listas fixas dos filtros (RF18)."""

    execucoes: list[ItemReferencia]
    economias: list[ItemReferencia]
    objetivos: list[ItemReferencia]


class Tatica(TaticaResumo):
    criada_em: datetime
    posicoes: list[PosicaoQuadro]
    utilitarios: list[UtilitarioQuadro]
    tracos: list[Traco]


# --- Sequências e linha do tempo (fase 6: RF13, RF14, RF15) ------------------

SEQUENCIAS_MAX = 10  # por tática
MARCACOES_MAX = 50  # por sequência
NOME_SEQUENCIA_MAX = 60
INSTANTE_MAX_MS = 3_600_000  # 1 hora, em milissegundos

OrigemSequencia = Literal["zero", "plano"]
TipoMarcacao = Literal["manual", "automatica"]
# Identidade do utilitário entre as marcações de uma sequência (RF14).
RefUtilitario = Annotated[str, Field(strict=True, pattern=r"^[A-Za-z0-9_-]{1,16}$")]


def _nome_sequencia(valor: str) -> str:
    limpo = valor.strip()
    if not 1 <= len(limpo) <= NOME_SEQUENCIA_MAX:
        raise ValueError(f"O nome da sequência deve ter entre 1 e {NOME_SEQUENCIA_MAX} caracteres.")
    return limpo


class UtilitarioMarcacao(UtilitarioQuadro):
    """Utilitário numa marcação: igual ao do plano fixo, com a ref que o identifica."""

    ref: RefUtilitario


class Marcacao(BaseModel):
    """Marcação da linha do tempo (RF14): um quadro com instante, em milissegundos."""

    model_config = ConfigDict(extra="forbid")

    instante: Annotated[int, Field(strict=True, ge=0, le=INSTANTE_MAX_MS)]
    tipo: TipoMarcacao = "manual"
    posicoes: list[PosicaoQuadro] = Field(default_factory=list, max_length=POSICOES_MAX)
    utilitarios: list[UtilitarioMarcacao] = Field(default_factory=list, max_length=UTILITARIOS_MAX)
    tracos: list[Traco] = Field(default_factory=list, max_length=TRACOS_MAX)

    @field_validator("posicoes")
    @classmethod
    def jogador_uma_vez(cls, valor: list[PosicaoQuadro]) -> list[PosicaoQuadro]:
        ids = [p.jogador_id for p in valor if p.jogador_id is not None]
        if len(set(ids)) != len(ids):
            raise ValueError("Cada jogador pode ocupar só uma posição na marcação.")
        return valor

    @field_validator("utilitarios")
    @classmethod
    def ref_uma_vez(cls, valor: list[UtilitarioMarcacao]) -> list[UtilitarioMarcacao]:
        refs = [u.ref for u in valor]
        if len(set(refs)) != len(refs):
            raise ValueError("Cada utilitário aparece uma vez por marcação.")
        return valor


class SequenciaCriar(BaseModel):
    """POST /api/taticas/{id}/sequencias: do zero (marcação vazia em 0) ou do plano fixo."""

    model_config = ConfigDict(extra="forbid")

    nome: str
    origem: OrigemSequencia

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        return _nome_sequencia(valor)


class SequenciaAtualizar(BaseModel):
    """PUT /api/taticas/{id}/sequencias/{sid}: renomeia e substitui as marcações."""

    model_config = ConfigDict(extra="forbid")

    nome: str
    marcacoes: list[Marcacao] = Field(min_length=1, max_length=MARCACOES_MAX)

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        return _nome_sequencia(valor)

    @field_validator("marcacoes")
    @classmethod
    def instante_uma_vez(cls, valor: list[Marcacao]) -> list[Marcacao]:
        instantes = [m.instante for m in valor]
        if len(set(instantes)) != len(instantes):
            raise ValueError("Duas marcações não podem ter o mesmo instante.")
        return valor


class Sequencia(BaseModel):
    id: int
    nome: str
    origem: str
    criada_em: datetime
    alterada_em: datetime
    marcacoes: list[Marcacao]

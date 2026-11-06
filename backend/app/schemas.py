import re

from pydantic import BaseModel, Field, StrictInt, field_validator, model_validator

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

import re

from pydantic import BaseModel, Field, field_validator

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

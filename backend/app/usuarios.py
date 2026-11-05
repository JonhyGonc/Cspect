import psycopg
from psycopg.errors import UniqueViolation

from app.config import get_settings
from app.security import gerar_hash_senha


class EmailJaCadastrado(Exception):
    """Já existe um usuário com este e-mail (comparação sem diferenciar maiúsculas)."""


def criar_usuario(*, email: str, senha: str, nome_exibicao: str, versao_termo: str) -> dict:
    """Insere o usuário com a senha já convertida em hash. Retorna id, email e nome_exibicao."""
    senha_hash = gerar_hash_senha(senha)

    with psycopg.connect(get_settings().database_url, connect_timeout=3) as conexao:
        try:
            with conexao.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO usuarios (email, senha_hash, nome_exibicao, termo_versao, termo_aceito_em)
                    VALUES (%s, %s, %s, %s, now())
                    RETURNING id, email, nome_exibicao
                    """,
                    (email, senha_hash, nome_exibicao, versao_termo),
                )
                id_usuario, email_salvo, nome_salvo = cursor.fetchone()
        except UniqueViolation as erro:
            raise EmailJaCadastrado from erro

    return {"id": id_usuario, "email": email_salvo, "nome_exibicao": nome_salvo}

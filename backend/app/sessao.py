"""Sessões de login por cookie (RF01 e RNF05).

O cookie guarda um token aleatório. No banco fica apenas o hash SHA-256 desse token.
"""

import hashlib
import secrets

import psycopg
from fastapi import Cookie, HTTPException, Response, status

from app.config import get_settings

NOME_COOKIE = "sessao"
DIAS_SESSAO = 7  # a sessão expira após 7 dias sem uso; cada uso renova o prazo (RNF05)


def gerar_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def criar_sessao(cursor, usuario_id: int) -> str:
    """Grava a sessão no banco (só o hash do token) e devolve o token em texto puro, para o cookie."""
    token = gerar_token()
    cursor.execute(
        """
        INSERT INTO sessoes (usuario_id, token_hash, expira_em)
        VALUES (%s, %s, now() + make_interval(days => %s::integer))
        """,
        (usuario_id, hash_token(token), DIAS_SESSAO),
    )
    return token


def encerrar_sessao(token: str) -> None:
    """Apaga a sessão associada ao token. Não faz nada se ela não existir."""
    with psycopg.connect(get_settings().database_url, connect_timeout=3) as conexao:
        conexao.execute("DELETE FROM sessoes WHERE token_hash = %s", (hash_token(token),))


def definir_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=NOME_COOKIE,
        value=token,
        max_age=DIAS_SESSAO * 24 * 60 * 60,
        path="/",
        httponly=True,
        samesite="lax",
        secure=get_settings().cookie_secure,
    )


def limpar_cookie(response: Response) -> None:
    response.delete_cookie(
        key=NOME_COOKIE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=get_settings().cookie_secure,
    )


def usuario_atual(response: Response, sessao: str | None = Cookie(default=None)) -> dict:
    """Dependência reutilizável: devolve o usuário da sessão ativa e renova o prazo da sessão.

    Retorna 401 se não houver cookie, se a sessão não existir, se estiver expirada
    ou se o usuário tiver sido excluído.
    """
    nao_autenticado = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")
    if not sessao:
        raise nao_autenticado

    with psycopg.connect(get_settings().database_url, connect_timeout=3) as conexao:
        linha = conexao.execute(
            """
            UPDATE sessoes AS s
            SET ultimo_uso_em = now(),
                expira_em = now() + make_interval(days => %s::integer)
            FROM usuarios AS u
            WHERE s.token_hash = %s
              AND s.usuario_id = u.id
              AND u.status = 'ativo'
              AND s.expira_em > now()
            RETURNING u.id, u.email, u.nome_exibicao
            """,
            (DIAS_SESSAO, hash_token(sessao)),
        ).fetchone()

    if linha is None:
        raise nao_autenticado

    definir_cookie(response, sessao)  # renova também o prazo do cookie
    id_usuario, email, nome_exibicao = linha
    return {"id": id_usuario, "email": email, "nome_exibicao": nome_exibicao}

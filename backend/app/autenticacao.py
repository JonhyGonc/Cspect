"""Login com bloqueio por tentativas erradas (RF02 e RNF06)."""

from dataclasses import dataclass
from enum import Enum

import psycopg

from app.config import get_settings
from app.security import gerar_hash_senha, precisa_rehash, verificar_senha, verificar_senha_ficticia
from app.sessao import criar_sessao

MAXIMO_TENTATIVAS = 5  # erros seguidos até o bloqueio (RF02)
MINUTOS_BLOQUEIO = 15  # tempo de bloqueio (RF02)


class Situacao(Enum):
    AUTENTICADO = "autenticado"
    CREDENCIAIS_INVALIDAS = "credenciais_invalidas"  # e-mail inexistente, conta excluída ou senha errada
    BLOQUEADO = "bloqueado"


@dataclass(frozen=True)
class ResultadoLogin:
    situacao: Situacao
    usuario: dict | None = None
    token: str | None = None


def autenticar(*, email: str, senha: str) -> ResultadoLogin:
    """Valida e-mail e senha, aplica o bloqueio e cria a sessão em caso de sucesso.

    O resultado é devolvido em vez de lançar exceção, porque o contador de tentativas
    precisa ser gravado mesmo quando a senha está errada.
    """
    with psycopg.connect(get_settings().database_url, connect_timeout=3) as conexao:
        with conexao.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, email, nome_exibicao, senha_hash, status, tentativas_login,
                       bloqueado_ate, COALESCE(bloqueado_ate > now(), false)
                FROM usuarios
                WHERE lower(email) = lower(%s)
                FOR UPDATE
                """,
                (email,),
            )
            linha = cursor.fetchone()

            # E-mail inexistente ou conta excluída: mesma resposta, e o tempo de verificação é gasto.
            if linha is None or linha[4] == "excluido":
                verificar_senha_ficticia(senha)
                return ResultadoLogin(Situacao.CREDENCIAIS_INVALIDAS)

            id_usuario, email_salvo, nome_exibicao, senha_hash, _, tentativas, bloqueado_ate, bloqueado_agora = linha

            # Conta bloqueada: a senha nem é verificada.
            if bloqueado_agora:
                return ResultadoLogin(Situacao.BLOQUEADO)

            # Se o bloqueio anterior já passou, a conta volta ao normal e as tentativas recomeçam do zero.
            if bloqueado_ate is not None:
                tentativas = 0

            if not verificar_senha(senha_hash, senha):
                tentativas += 1
                cursor.execute(
                    """
                    UPDATE usuarios
                    SET tentativas_login = %s,
                        bloqueado_ate = CASE WHEN %s THEN now() + make_interval(mins => %s::integer) END
                    WHERE id = %s
                    """,
                    (tentativas, tentativas >= MAXIMO_TENTATIVAS, MINUTOS_BLOQUEIO, id_usuario),
                )
                return ResultadoLogin(Situacao.CREDENCIAIS_INVALIDAS)

            # Senha correta: zera o contador, limpa o bloqueio e cria a sessão.
            if precisa_rehash(senha_hash):
                cursor.execute(
                    "UPDATE usuarios SET senha_hash = %s WHERE id = %s",
                    (gerar_hash_senha(senha), id_usuario),
                )
            cursor.execute(
                "UPDATE usuarios SET tentativas_login = 0, bloqueado_ate = NULL WHERE id = %s",
                (id_usuario,),
            )
            token = criar_sessao(cursor, id_usuario)

    usuario = {"id": id_usuario, "email": email_salvo, "nome_exibicao": nome_exibicao}
    return ResultadoLogin(Situacao.AUTENTICADO, usuario=usuario, token=token)

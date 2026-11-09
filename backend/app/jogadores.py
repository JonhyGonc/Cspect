"""Acesso ao banco para jogadores e funções (RF04, RF05 e RNF03).

Toda consulta de jogador filtra pelo dono (usuario_id). Um jogador de outro usuário
é tratado como inexistente, para não revelar que ele existe.
"""

import psycopg
from psycopg.errors import UniqueViolation

from app.config import get_settings


class JogadorNaoEncontrado(Exception):
    """O jogador não existe ou pertence a outro usuário."""


class NicknameRepetido(Exception):
    """O usuário já tem um jogador com este nickname (sem diferenciar maiúsculas)."""


class FuncaoInexistente(Exception):
    """A função principal ou alguma secundária não existe na tabela funcoes."""


def calcular_avatar(nickname: str) -> str:
    """Iniciais do avatar: as duas primeiras letras ou dígitos do nickname, em maiúsculas.

    Símbolos e espaços são ignorados ("[TT] zé" vira "TT"). Se o nickname só tiver
    símbolos, usa os dois primeiros caracteres que não são espaço. Nickname de um
    caractere gera avatar de um caractere.
    """
    alfanumericos = [c for c in nickname if c.isalnum()]
    base = alfanumericos or [c for c in nickname if not c.isspace()]
    # O corte final mantém no máximo 2 caracteres mesmo quando uma letra cresce
    # ao virar maiúscula (ex.: "ß" vira "SS").
    return "".join(base[:2]).upper()[:2]


def _conectar():
    return psycopg.connect(get_settings().database_url, connect_timeout=3)


_SELECT_JOGADOR = """
    SELECT j.id, j.nickname, j.avatar, j.observacoes,
           fp.id, fp.nome,
           COALESCE(
               (SELECT json_agg(json_build_object('id', f.id, 'nome', f.nome) ORDER BY f.id)
                FROM jogador_funcoes_secundarias s
                JOIN funcoes f ON f.id = s.funcao_id
                WHERE s.jogador_id = j.id),
               '[]'::json
           )
    FROM jogadores j
    JOIN funcoes fp ON fp.id = j.funcao_principal_id
"""


def _montar(linha) -> dict:
    id_jogador, nickname, avatar, observacoes, id_principal, nome_principal, secundarias = linha
    return {
        "id": id_jogador,
        "nickname": nickname,
        "avatar": avatar,
        "funcao_principal": {"id": id_principal, "nome": nome_principal},
        "funcoes_secundarias": secundarias,
        "observacoes": observacoes,
    }


def listar_funcoes() -> list[dict]:
    with _conectar() as conexao:
        linhas = conexao.execute("SELECT id, nome FROM funcoes ORDER BY id").fetchall()
    return [{"id": id_funcao, "nome": nome} for id_funcao, nome in linhas]


def listar_jogadores(usuario_id: int) -> list[dict]:
    with _conectar() as conexao:
        linhas = conexao.execute(
            _SELECT_JOGADOR + " WHERE j.usuario_id = %s ORDER BY lower(j.nickname), j.id",
            (usuario_id,),
        ).fetchall()
    return [_montar(linha) for linha in linhas]


def _buscar(cursor, usuario_id: int, jogador_id: int) -> dict:
    linha = cursor.execute(
        _SELECT_JOGADOR + " WHERE j.id = %s AND j.usuario_id = %s",
        (jogador_id, usuario_id),
    ).fetchone()
    if linha is None:
        raise JogadorNaoEncontrado
    return _montar(linha)


def _conferir_funcoes(cursor, ids: list[int]) -> None:
    """Garante que todas as funções existem. A lista fixa vem do banco, que pode crescer."""
    distintos = set(ids)
    encontrados = cursor.execute(
        "SELECT count(*) FROM funcoes WHERE id = ANY(%s)", (list(distintos),)
    ).fetchone()[0]
    if encontrados != len(distintos):
        raise FuncaoInexistente


def _gravar_secundarias(cursor, jogador_id: int, funcoes_ids: list[int]) -> None:
    cursor.execute("DELETE FROM jogador_funcoes_secundarias WHERE jogador_id = %s", (jogador_id,))
    if funcoes_ids:
        cursor.executemany(
            "INSERT INTO jogador_funcoes_secundarias (jogador_id, funcao_id) VALUES (%s, %s)",
            [(jogador_id, funcao_id) for funcao_id in funcoes_ids],
        )


def criar_jogador(
    usuario_id: int,
    *,
    nickname: str,
    funcao_principal_id: int,
    funcoes_secundarias_ids: list[int],
    observacoes: str,
) -> dict:
    """Cria o jogador e suas funções secundárias numa única transação."""
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            _conferir_funcoes(cursor, [funcao_principal_id, *funcoes_secundarias_ids])
            try:
                id_jogador = cursor.execute(
                    """
                    INSERT INTO jogadores (usuario_id, nickname, avatar, funcao_principal_id, observacoes)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (usuario_id, nickname, calcular_avatar(nickname), funcao_principal_id, observacoes),
                ).fetchone()[0]
            except UniqueViolation as erro:
                raise NicknameRepetido from erro
            _gravar_secundarias(cursor, id_jogador, funcoes_secundarias_ids)
            return _buscar(cursor, usuario_id, id_jogador)


def atualizar_jogador(
    usuario_id: int,
    jogador_id: int,
    *,
    nickname: str,
    funcao_principal_id: int,
    funcoes_secundarias_ids: list[int],
    observacoes: str,
) -> dict:
    """Substitui todos os campos do jogador. Recalcula o avatar a partir do novo nickname."""
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            # Primeiro confere o dono: jogador de outro usuário responde 404 antes de qualquer outra regra.
            existe = cursor.execute(
                "SELECT 1 FROM jogadores WHERE id = %s AND usuario_id = %s FOR UPDATE",
                (jogador_id, usuario_id),
            ).fetchone()
            if existe is None:
                raise JogadorNaoEncontrado
            _conferir_funcoes(cursor, [funcao_principal_id, *funcoes_secundarias_ids])
            try:
                cursor.execute(
                    """
                    UPDATE jogadores
                    SET nickname = %s, avatar = %s, funcao_principal_id = %s, observacoes = %s
                    WHERE id = %s AND usuario_id = %s
                    """,
                    (
                        nickname,
                        calcular_avatar(nickname),
                        funcao_principal_id,
                        observacoes,
                        jogador_id,
                        usuario_id,
                    ),
                )
            except UniqueViolation as erro:
                raise NicknameRepetido from erro
            _gravar_secundarias(cursor, jogador_id, funcoes_secundarias_ids)
            return _buscar(cursor, usuario_id, jogador_id)


def remover_jogador(usuario_id: int, jogador_id: int) -> None:
    """Apaga o jogador. As funções secundárias saem junto (ON DELETE CASCADE).

    RF08A: nas táticas, a posição do jogador continua com a função e fica sem jogador
    (posicoes_quadro.jogador_id é ON DELETE SET NULL, migração 004).
    """
    with _conectar() as conexao:
        apagados = conexao.execute(
            "DELETE FROM jogadores WHERE id = %s AND usuario_id = %s",
            (jogador_id, usuario_id),
        ).rowcount
    if apagados == 0:
        raise JogadorNaoEncontrado

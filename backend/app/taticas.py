"""Acesso ao banco para táticas e plano fixo (RF08, RF08A, RF12, RNF03 e RNF04).

Toda consulta de tática filtra pelo autor (usuario_id). Uma tática de outro usuário é
tratada como inexistente (404), para não revelar que ela existe.
O plano fixo é o quadro da tática sem sequência; gravar o plano substitui todas as
posições desse quadro, numa única transação.
"""

import psycopg

from app.config import get_settings


class TaticaNaoEncontrada(Exception):
    """A tática não existe ou pertence a outro usuário."""


class FuncaoInexistente(Exception):
    """Alguma posição usa uma função que não existe na tabela funcoes."""


class JogadorInvalido(Exception):
    """Alguma posição usa um jogador que não existe ou é de outro usuário (sem dizer qual dos dois)."""


def _conectar():
    return psycopg.connect(get_settings().database_url, connect_timeout=3)


_COLUNAS_RESUMO = "t.id, t.nome, t.mapa_id, t.lado, t.visibilidade, t.alterada_em"


def _resumo(linha) -> dict:
    id_tatica, nome, mapa_id, lado, visibilidade, alterada_em = linha
    return {
        "id": id_tatica,
        "nome": nome,
        "mapa_id": mapa_id,
        "lado": lado,
        "visibilidade": visibilidade,
        "alterada_em": alterada_em,
    }


def listar_taticas(usuario_id: int) -> list[dict]:
    with _conectar() as conexao:
        linhas = conexao.execute(
            f"SELECT {_COLUNAS_RESUMO} FROM taticas t WHERE t.usuario_id = %s ORDER BY t.alterada_em DESC, t.id DESC",
            (usuario_id,),
        ).fetchall()
    return [_resumo(linha) for linha in linhas]


def _buscar(cursor, usuario_id: int, tatica_id: int) -> dict:
    linha = cursor.execute(
        f"SELECT {_COLUNAS_RESUMO}, t.criada_em FROM taticas t WHERE t.id = %s AND t.usuario_id = %s",
        (tatica_id, usuario_id),
    ).fetchone()
    if linha is None:
        raise TaticaNaoEncontrada
    tatica = _resumo(linha[:6])
    tatica["criada_em"] = linha[6]
    posicoes = cursor.execute(
        """
        SELECT p.jogador_id, p.funcao_id, p.x, p.y
        FROM posicoes_quadro p
        JOIN quadros q ON q.id = p.quadro_id
        WHERE q.tatica_id = %s AND q.sequencia_id IS NULL
        ORDER BY p.id
        """,
        (tatica_id,),
    ).fetchall()
    tatica["posicoes"] = [
        {"jogador_id": jogador_id, "funcao_id": funcao_id, "x": x, "y": y} for jogador_id, funcao_id, x, y in posicoes
    ]
    return tatica


def buscar_tatica(usuario_id: int, tatica_id: int) -> dict:
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            return _buscar(cursor, usuario_id, tatica_id)


def _conferir_posicoes(cursor, usuario_id: int, posicoes: list[dict]) -> None:
    """Funções precisam existir e jogadores precisam ser do próprio usuário (RNF03)."""
    funcoes = {p["funcao_id"] for p in posicoes if p["funcao_id"] is not None}
    if funcoes:
        encontradas = cursor.execute(
            "SELECT count(*) FROM funcoes WHERE id = ANY(%s)", (list(funcoes),)
        ).fetchone()[0]
        if encontradas != len(funcoes):
            raise FuncaoInexistente
    jogadores = {p["jogador_id"] for p in posicoes if p["jogador_id"] is not None}
    if jogadores:
        # FOR SHARE: o jogador não pode ser removido no meio desta gravação.
        encontrados = cursor.execute(
            "SELECT id FROM jogadores WHERE id = ANY(%s) AND usuario_id = %s FOR SHARE",
            (list(jogadores), usuario_id),
        ).fetchall()
        if len(encontrados) != len(jogadores):
            raise JogadorInvalido


def _gravar_plano(cursor, tatica_id: int, posicoes: list[dict]) -> None:
    quadro = cursor.execute(
        "SELECT id FROM quadros WHERE tatica_id = %s AND sequencia_id IS NULL", (tatica_id,)
    ).fetchone()
    if quadro is None:
        quadro_id = cursor.execute(
            "INSERT INTO quadros (tatica_id, tipo) VALUES (%s, 'manual') RETURNING id", (tatica_id,)
        ).fetchone()[0]
    else:
        quadro_id = quadro[0]
        cursor.execute("DELETE FROM posicoes_quadro WHERE quadro_id = %s", (quadro_id,))
    if posicoes:
        cursor.executemany(
            "INSERT INTO posicoes_quadro (quadro_id, jogador_id, funcao_id, x, y) VALUES (%s, %s, %s, %s, %s)",
            [(quadro_id, p["jogador_id"], p["funcao_id"], p["x"], p["y"]) for p in posicoes],
        )


def criar_tatica(
    usuario_id: int,
    *,
    nome: str,
    mapa_id: str,
    lado: str,
    visibilidade: str,
    posicoes: list[dict],
) -> dict:
    """Cria a tática com o plano fixo numa única transação."""
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            _conferir_posicoes(cursor, usuario_id, posicoes)
            tatica_id = cursor.execute(
                """
                INSERT INTO taticas (usuario_id, mapa_id, nome, lado, visibilidade)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (usuario_id, mapa_id, nome, lado, visibilidade),
            ).fetchone()[0]
            _gravar_plano(cursor, tatica_id, posicoes)
            return _buscar(cursor, usuario_id, tatica_id)


def atualizar_tatica(
    usuario_id: int,
    tatica_id: int,
    *,
    nome: str,
    lado: str,
    visibilidade: str,
    posicoes: list[dict],
) -> dict:
    """Substitui nome, lado, visibilidade e o plano fixo. O mapa não muda."""
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            # Primeiro confere o autor: tática de outro usuário responde 404 antes de qualquer outra regra.
            existe = cursor.execute(
                "SELECT 1 FROM taticas WHERE id = %s AND usuario_id = %s FOR UPDATE",
                (tatica_id, usuario_id),
            ).fetchone()
            if existe is None:
                raise TaticaNaoEncontrada
            _conferir_posicoes(cursor, usuario_id, posicoes)
            cursor.execute(
                """
                UPDATE taticas
                SET nome = %s, lado = %s, visibilidade = %s, alterada_em = now()
                WHERE id = %s AND usuario_id = %s
                """,
                (nome, lado, visibilidade, tatica_id, usuario_id),
            )
            _gravar_plano(cursor, tatica_id, posicoes)
            return _buscar(cursor, usuario_id, tatica_id)


def remover_tatica(usuario_id: int, tatica_id: int) -> None:
    """Apaga a tática. Quadros e posições saem junto (ON DELETE CASCADE)."""
    with _conectar() as conexao:
        apagados = conexao.execute(
            "DELETE FROM taticas WHERE id = %s AND usuario_id = %s",
            (tatica_id, usuario_id),
        ).rowcount
    if apagados == 0:
        raise TaticaNaoEncontrada

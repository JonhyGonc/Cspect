"""Acesso ao banco para táticas e plano fixo (RF08, RF08A, RF12, RNF03 e RNF04).

Toda consulta de tática filtra pelo autor (usuario_id). Uma tática de outro usuário é
tratada como inexistente (404), para não revelar que ela existe.
O plano fixo é o quadro da tática sem sequência; gravar o plano substitui todas as
posições, utilitários e traços desse quadro, numa única transação.
"""

import psycopg
from psycopg.types.json import Jsonb

from app.config import get_settings


class TaticaNaoEncontrada(Exception):
    """A tática não existe ou pertence a outro usuário."""


class FuncaoInexistente(Exception):
    """Alguma posição usa uma função que não existe na tabela funcoes."""


class JogadorInvalido(Exception):
    """Alguma posição usa um jogador que não existe ou é de outro usuário (sem dizer qual dos dois)."""


class ClassificacaoInexistente(Exception):
    """Algum id de execução, economia ou objetivo não existe na lista fixa."""


# Classificações (RF18): categoria -> (tabela de referência, tabela de ligação, coluna).
CLASSIFICACOES = {
    "execucoes": ("execucoes", "taticas_execucoes", "execucao_id"),
    "economias": ("economias", "taticas_economias", "economia_id"),
    "objetivos": ("objetivos", "taticas_objetivos", "objetivo_id"),
}


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


def listar_referencias() -> dict:
    """As três listas fixas (RF18), em ordem de id."""
    with _conectar() as conexao:
        return {
            categoria: [
                {"id": id_, "nome": nome}
                for id_, nome in conexao.execute(f"SELECT id, nome FROM {tabela} ORDER BY id").fetchall()
            ]
            for categoria, (tabela, _, _) in CLASSIFICACOES.items()
        }


def conferir_classificacoes(cursor, **listas: list[int] | None) -> None:
    """Cada id informado precisa existir na lista fixa da categoria (RNF04)."""
    for categoria, ids in listas.items():
        if not ids:
            continue
        tabela = CLASSIFICACOES[categoria][0]
        unicos = list(set(ids))
        encontrados = cursor.execute(f"SELECT count(*) FROM {tabela} WHERE id = ANY(%s)", (unicos,)).fetchone()[0]
        if encontrados != len(unicos):
            raise ClassificacaoInexistente


def _gravar_classificacoes(cursor, tatica_id: int, **listas: list[int] | None) -> None:
    """Substitui as classificações informadas; None deixa a categoria como está."""
    for categoria, ids in listas.items():
        if ids is None:
            continue
        _, ligacao, coluna = CLASSIFICACOES[categoria]
        cursor.execute(f"DELETE FROM {ligacao} WHERE tatica_id = %s", (tatica_id,))
        if ids:
            cursor.executemany(
                f"INSERT INTO {ligacao} (tatica_id, {coluna}) VALUES (%s, %s)",
                [(tatica_id, id_) for id_ in sorted(set(ids))],
            )


def _complementar(cursor, taticas: list[dict]) -> None:
    """Classificações, posições do plano fixo (para a miniatura) e quantidade de jogadores."""
    ids = [t["id"] for t in taticas]
    por_id = {t["id"]: t for t in taticas}
    for t in taticas:
        t.update(execucoes=[], economias=[], objetivos=[], posicoes=[], jogadores=0)
    if not ids:
        return
    for categoria, (_, ligacao, coluna) in CLASSIFICACOES.items():
        for tatica_id, id_ in cursor.execute(
            f"SELECT tatica_id, {coluna} FROM {ligacao} WHERE tatica_id = ANY(%s) ORDER BY {coluna}", (ids,)
        ).fetchall():
            por_id[tatica_id][categoria].append(id_)
    for tatica_id, jogador_id, funcao_id, x, y in cursor.execute(
        """
        SELECT q.tatica_id, p.jogador_id, p.funcao_id, p.x, p.y
        FROM posicoes_quadro p
        JOIN quadros q ON q.id = p.quadro_id
        WHERE q.tatica_id = ANY(%s) AND q.sequencia_id IS NULL
        ORDER BY p.id
        """,
        (ids,),
    ).fetchall():
        por_id[tatica_id]["posicoes"].append({"jogador_id": jogador_id, "funcao_id": funcao_id, "x": x, "y": y})
    # Quantidade de jogadores: posições com jogador. Posição sem jogador (jogador removido do
    # elenco, RF08A) não conta.
    for t in taticas:
        t["jogadores"] = sum(1 for p in t["posicoes"] if p["jogador_id"] is not None)


def _escapar_like(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def listar_taticas(
    usuario_id: int,
    *,
    mapa_id: str | None = None,
    lado: str | None = None,
    execucoes: list[int] | None = None,
    economias: list[int] | None = None,
    objetivos: list[int] | None = None,
    jogadores_min: int | None = None,
    jogadores_max: int | None = None,
    busca: str | None = None,
) -> list[dict]:
    """Táticas do usuário com os filtros da biblioteca (RF17, RF18).

    Regra: dentro de uma categoria (execução, economia, objetivo), basta a tática ter
    QUALQUER uma das opções escolhidas (OU); entre filtros diferentes, a tática precisa
    atender TODOS (E). Filtro ausente ou lista vazia não restringe. A busca procura o texto
    em qualquer parte do nome, sem diferenciar maiúsculas.
    """
    condicoes = ["t.usuario_id = %s"]
    parametros: list = [usuario_id]
    if mapa_id is not None:
        condicoes.append("t.mapa_id = %s")
        parametros.append(mapa_id)
    if lado is not None:
        condicoes.append("t.lado = %s")
        parametros.append(lado)
    for categoria, ids in (("execucoes", execucoes), ("economias", economias), ("objetivos", objetivos)):
        if ids:
            _, ligacao, coluna = CLASSIFICACOES[categoria]
            condicoes.append(f"EXISTS (SELECT 1 FROM {ligacao} c WHERE c.tatica_id = t.id AND c.{coluna} = ANY(%s))")
            parametros.append(list(set(ids)))
    if jogadores_min is not None:
        condicoes.append("COALESCE(j.total, 0) >= %s")
        parametros.append(jogadores_min)
    if jogadores_max is not None:
        condicoes.append("COALESCE(j.total, 0) <= %s")
        parametros.append(jogadores_max)
    if busca:
        condicoes.append("lower(t.nome) LIKE %s ESCAPE '\\'")
        parametros.append(f"%{_escapar_like(busca.lower())}%")
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            if execucoes or economias or objetivos:
                conferir_classificacoes(cursor, execucoes=execucoes, economias=economias, objetivos=objetivos)
            linhas = cursor.execute(
                f"""
                SELECT {_COLUNAS_RESUMO}
                FROM taticas t
                LEFT JOIN (
                    SELECT q.tatica_id, count(p.jogador_id) AS total
                    FROM quadros q
                    JOIN posicoes_quadro p ON p.quadro_id = q.id
                    WHERE q.sequencia_id IS NULL
                    GROUP BY q.tatica_id
                ) j ON j.tatica_id = t.id
                WHERE {" AND ".join(condicoes)}
                ORDER BY t.alterada_em DESC, t.id DESC
                """,
                parametros,
            ).fetchall()
            taticas = [_resumo(linha) for linha in linhas]
            _complementar(cursor, taticas)
            return taticas


def conteudo_quadros(cursor, quadro_ids: list[int], *, com_ref: bool = False) -> dict[int, dict]:
    """Posições, utilitários e traços de cada quadro, na ordem em que foram gravados.

    Serve ao plano fixo e às marcações da linha do tempo (um único conceito de quadro).
    com_ref inclui a identidade do utilitário entre marcações (só nas sequências).
    """
    conteudo = {q: {"posicoes": [], "utilitarios": [], "tracos": []} for q in quadro_ids}
    if not quadro_ids:
        return conteudo
    for quadro_id, jogador_id, funcao_id, x, y in cursor.execute(
        "SELECT quadro_id, jogador_id, funcao_id, x, y FROM posicoes_quadro WHERE quadro_id = ANY(%s) ORDER BY id",
        (quadro_ids,),
    ).fetchall():
        conteudo[quadro_id]["posicoes"].append({"jogador_id": jogador_id, "funcao_id": funcao_id, "x": x, "y": y})
    for quadro_id, tipo, x, y, trajetoria, duracao, ref in cursor.execute(
        """
        SELECT quadro_id, tipo, x, y, trajetoria, duracao, ref
        FROM utilitarios_quadro WHERE quadro_id = ANY(%s) ORDER BY id
        """,
        (quadro_ids,),
    ).fetchall():
        utilitario = {"tipo": tipo, "x": x, "y": y, "trajetoria": trajetoria, "duracao": duracao}
        if com_ref:
            utilitario["ref"] = ref
        conteudo[quadro_id]["utilitarios"].append(utilitario)
    for quadro_id, jogador_id, pontos, status in cursor.execute(
        "SELECT quadro_id, jogador_id, pontos, status FROM tracos WHERE quadro_id = ANY(%s) ORDER BY id",
        (quadro_ids,),
    ).fetchall():
        conteudo[quadro_id]["tracos"].append({"jogador_id": jogador_id, "pontos": pontos, "status": status})
    return conteudo


def _buscar(cursor, usuario_id: int, tatica_id: int) -> dict:
    linha = cursor.execute(
        f"SELECT {_COLUNAS_RESUMO}, t.criada_em FROM taticas t WHERE t.id = %s AND t.usuario_id = %s",
        (tatica_id, usuario_id),
    ).fetchone()
    if linha is None:
        raise TaticaNaoEncontrada
    tatica = _resumo(linha[:6])
    tatica["criada_em"] = linha[6]
    quadro = cursor.execute(
        "SELECT id FROM quadros WHERE tatica_id = %s AND sequencia_id IS NULL", (tatica_id,)
    ).fetchone()
    _complementar(cursor, [tatica])
    vazio = {"posicoes": [], "utilitarios": [], "tracos": []}
    tatica.update(conteudo_quadros(cursor, [quadro[0]])[quadro[0]] if quadro else vazio)
    return tatica


def buscar_tatica(usuario_id: int, tatica_id: int) -> dict:
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            return _buscar(cursor, usuario_id, tatica_id)


def conferir_conteudo(cursor, usuario_id: int, posicoes: list[dict], tracos: list[dict]) -> None:
    """Funções precisam existir e jogadores (das posições e dos traços) precisam ser do
    próprio usuário (RNF03)."""
    funcoes = {p["funcao_id"] for p in posicoes if p["funcao_id"] is not None}
    if funcoes:
        encontradas = cursor.execute(
            "SELECT count(*) FROM funcoes WHERE id = ANY(%s)", (list(funcoes),)
        ).fetchone()[0]
        if encontradas != len(funcoes):
            raise FuncaoInexistente
    jogadores = {p["jogador_id"] for p in [*posicoes, *tracos] if p["jogador_id"] is not None}
    if jogadores:
        # FOR SHARE: o jogador não pode ser removido no meio desta gravação.
        encontrados = cursor.execute(
            "SELECT id FROM jogadores WHERE id = ANY(%s) AND usuario_id = %s FOR SHARE",
            (list(jogadores), usuario_id),
        ).fetchall()
        if len(encontrados) != len(jogadores):
            raise JogadorInvalido


def gravar_conteudo(cursor, quadro_id: int, posicoes: list[dict], utilitarios: list[dict], tracos: list[dict]) -> None:
    """Insere posições, utilitários e traços num quadro vazio."""
    if posicoes:
        cursor.executemany(
            "INSERT INTO posicoes_quadro (quadro_id, jogador_id, funcao_id, x, y) VALUES (%s, %s, %s, %s, %s)",
            [(quadro_id, p["jogador_id"], p["funcao_id"], p["x"], p["y"]) for p in posicoes],
        )
    if utilitarios:
        cursor.executemany(
            """
            INSERT INTO utilitarios_quadro (quadro_id, tipo, x, y, trajetoria, duracao, ref)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    quadro_id,
                    u["tipo"],
                    u["x"],
                    u["y"],
                    None if u["trajetoria"] is None else Jsonb([list(p) for p in u["trajetoria"]]),
                    u["duracao"],
                    u.get("ref"),
                )
                for u in utilitarios
            ],
        )
    if tracos:
        cursor.executemany(
            "INSERT INTO tracos (quadro_id, jogador_id, pontos, status) VALUES (%s, %s, %s, %s)",
            [(quadro_id, t["jogador_id"], Jsonb([list(p) for p in t["pontos"]]), t["status"]) for t in tracos],
        )


def _gravar_plano(cursor, tatica_id: int, posicoes: list[dict], utilitarios: list[dict], tracos: list[dict]) -> None:
    """Substitui posições, utilitários e traços do plano fixo. No plano fixo não há ref."""
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
        cursor.execute("DELETE FROM utilitarios_quadro WHERE quadro_id = %s", (quadro_id,))
        cursor.execute("DELETE FROM tracos WHERE quadro_id = %s", (quadro_id,))
    gravar_conteudo(cursor, quadro_id, posicoes, [{**u, "ref": None} for u in utilitarios], tracos)


def criar_tatica(
    usuario_id: int,
    *,
    nome: str,
    mapa_id: str,
    lado: str,
    visibilidade: str,
    posicoes: list[dict],
    utilitarios: list[dict],
    tracos: list[dict],
    execucoes: list[int],
    economias: list[int],
    objetivos: list[int],
) -> dict:
    """Cria a tática com o plano fixo e a classificação, numa única transação."""
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            conferir_conteudo(cursor, usuario_id, posicoes, tracos)
            conferir_classificacoes(cursor, execucoes=execucoes, economias=economias, objetivos=objetivos)
            tatica_id = cursor.execute(
                """
                INSERT INTO taticas (usuario_id, mapa_id, nome, lado, visibilidade)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (usuario_id, mapa_id, nome, lado, visibilidade),
            ).fetchone()[0]
            _gravar_plano(cursor, tatica_id, posicoes, utilitarios, tracos)
            _gravar_classificacoes(cursor, tatica_id, execucoes=execucoes, economias=economias, objetivos=objetivos)
            return _buscar(cursor, usuario_id, tatica_id)


def atualizar_tatica(
    usuario_id: int,
    tatica_id: int,
    *,
    nome: str,
    lado: str,
    visibilidade: str,
    posicoes: list[dict],
    utilitarios: list[dict],
    tracos: list[dict],
    execucoes: list[int] | None = None,
    economias: list[int] | None = None,
    objetivos: list[int] | None = None,
) -> dict:
    """Substitui nome, lado, visibilidade, o plano fixo e as classificações informadas.
    O mapa não muda."""
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            # Primeiro confere o autor: tática de outro usuário responde 404 antes de qualquer outra regra.
            existe = cursor.execute(
                "SELECT 1 FROM taticas WHERE id = %s AND usuario_id = %s FOR UPDATE",
                (tatica_id, usuario_id),
            ).fetchone()
            if existe is None:
                raise TaticaNaoEncontrada
            conferir_conteudo(cursor, usuario_id, posicoes, tracos)
            conferir_classificacoes(cursor, execucoes=execucoes, economias=economias, objetivos=objetivos)
            cursor.execute(
                """
                UPDATE taticas
                SET nome = %s, lado = %s, visibilidade = %s, alterada_em = now()
                WHERE id = %s AND usuario_id = %s
                """,
                (nome, lado, visibilidade, tatica_id, usuario_id),
            )
            _gravar_plano(cursor, tatica_id, posicoes, utilitarios, tracos)
            _gravar_classificacoes(cursor, tatica_id, execucoes=execucoes, economias=economias, objetivos=objetivos)
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

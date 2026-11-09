"""Acesso ao banco para sequências e marcações da linha do tempo (RF13, RF14, RNF03, RNF04).

Toda rota parte da tática do usuário logado: tática ou sequência de outro usuário é
tratada como inexistente (404). Cada marcação é um quadro com sequencia_id e instante,
com o mesmo conteúdo do plano fixo (posições, utilitários e traços).
"""

from app.schemas import SEQUENCIAS_MAX
from app.taticas import (
    TaticaNaoEncontrada,
    _conectar,
    conferir_conteudo,
    conteudo_quadros,
    gravar_conteudo,
)


class SequenciaNaoEncontrada(Exception):
    """A sequência não existe, é de outra tática ou de outro usuário."""


class LimiteDeSequencias(Exception):
    """A tática já tem o máximo de sequências."""


def _conferir_tatica(cursor, usuario_id: int, tatica_id: int, *, travar: bool = False) -> None:
    trava = " FOR UPDATE" if travar else ""
    if (
        cursor.execute(
            f"SELECT 1 FROM taticas WHERE id = %s AND usuario_id = %s{trava}", (tatica_id, usuario_id)
        ).fetchone()
        is None
    ):
        raise TaticaNaoEncontrada


def _ler(cursor, tatica_id: int, sequencia_ids: list[int] | None = None) -> list[dict]:
    filtro = "" if sequencia_ids is None else " AND id = ANY(%s)"
    parametros = (tatica_id,) if sequencia_ids is None else (tatica_id, sequencia_ids)
    sequencias = [
        {"id": id_, "nome": nome, "origem": origem, "criada_em": criada, "alterada_em": alterada, "marcacoes": []}
        for id_, nome, origem, criada, alterada in cursor.execute(
            f"SELECT id, nome, origem, criada_em, alterada_em FROM sequencias WHERE tatica_id = %s{filtro} ORDER BY id",
            parametros,
        ).fetchall()
    ]
    if not sequencias:
        return sequencias
    por_id = {s["id"]: s for s in sequencias}
    quadros = cursor.execute(
        "SELECT id, sequencia_id, instante, tipo FROM quadros WHERE sequencia_id = ANY(%s) ORDER BY instante",
        (list(por_id),),
    ).fetchall()
    conteudo = conteudo_quadros(cursor, [q[0] for q in quadros], com_ref=True)
    for quadro_id, sequencia_id, instante, tipo in quadros:
        por_id[sequencia_id]["marcacoes"].append({"instante": instante, "tipo": tipo, **conteudo[quadro_id]})
    return sequencias


def listar_sequencias(usuario_id: int, tatica_id: int) -> list[dict]:
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            _conferir_tatica(cursor, usuario_id, tatica_id)
            return _ler(cursor, tatica_id)


def _marcacao_do_plano(cursor, tatica_id: int) -> dict:
    """Primeira marcação de uma sequência "do plano": copia jogadores, funções,
    utilitários (com refs novas) e só os traços confirmados do plano fixo."""
    quadro = cursor.execute(
        "SELECT id FROM quadros WHERE tatica_id = %s AND sequencia_id IS NULL", (tatica_id,)
    ).fetchone()
    if quadro is None:
        return {"posicoes": [], "utilitarios": [], "tracos": []}
    plano = conteudo_quadros(cursor, [quadro[0]])[quadro[0]]
    return {
        "posicoes": plano["posicoes"],
        "utilitarios": [{**u, "ref": f"u{i + 1}"} for i, u in enumerate(plano["utilitarios"])],
        "tracos": [t for t in plano["tracos"] if t["status"] == "confirmado"],
    }


def _inserir_marcacao(cursor, tatica_id: int, sequencia_id: int, marcacao: dict) -> None:
    quadro_id = cursor.execute(
        "INSERT INTO quadros (tatica_id, sequencia_id, instante, tipo) VALUES (%s, %s, %s, %s) RETURNING id",
        (tatica_id, sequencia_id, marcacao["instante"], marcacao["tipo"]),
    ).fetchone()[0]
    gravar_conteudo(cursor, quadro_id, marcacao["posicoes"], marcacao["utilitarios"], marcacao["tracos"])


def criar_sequencia(usuario_id: int, tatica_id: int, *, nome: str, origem: str) -> dict:
    """Cria a sequência com a marcação inicial no instante 0: vazia (do zero) ou com a
    cópia do plano fixo salvo (do plano)."""
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            # A trava na tática evita passar do limite com dois POSTs ao mesmo tempo.
            _conferir_tatica(cursor, usuario_id, tatica_id, travar=True)
            total = cursor.execute("SELECT count(*) FROM sequencias WHERE tatica_id = %s", (tatica_id,)).fetchone()[0]
            if total >= SEQUENCIAS_MAX:
                raise LimiteDeSequencias
            sequencia_id = cursor.execute(
                "INSERT INTO sequencias (tatica_id, nome, origem) VALUES (%s, %s, %s) RETURNING id",
                (tatica_id, nome, origem),
            ).fetchone()[0]
            inicial = (
                _marcacao_do_plano(cursor, tatica_id)
                if origem == "plano"
                else {"posicoes": [], "utilitarios": [], "tracos": []}
            )
            _inserir_marcacao(cursor, tatica_id, sequencia_id, {"instante": 0, "tipo": "manual", **inicial})
            cursor.execute("UPDATE taticas SET alterada_em = now() WHERE id = %s", (tatica_id,))
            return _ler(cursor, tatica_id, [sequencia_id])[0]


def atualizar_sequencia(usuario_id: int, tatica_id: int, sequencia_id: int, *, nome: str, marcacoes: list[dict]) -> dict:
    """Renomeia e substitui todas as marcações da sequência, numa única transação."""
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            _conferir_tatica(cursor, usuario_id, tatica_id)
            if (
                cursor.execute(
                    "SELECT 1 FROM sequencias WHERE id = %s AND tatica_id = %s FOR UPDATE", (sequencia_id, tatica_id)
                ).fetchone()
                is None
            ):
                raise SequenciaNaoEncontrada
            conferir_conteudo(
                cursor,
                usuario_id,
                [p for m in marcacoes for p in m["posicoes"]],
                [t for m in marcacoes for t in m["tracos"]],
            )
            cursor.execute(
                "UPDATE sequencias SET nome = %s, alterada_em = now() WHERE id = %s", (nome, sequencia_id)
            )
            cursor.execute("DELETE FROM quadros WHERE sequencia_id = %s", (sequencia_id,))
            for marcacao in sorted(marcacoes, key=lambda m: m["instante"]):
                _inserir_marcacao(cursor, tatica_id, sequencia_id, marcacao)
            cursor.execute("UPDATE taticas SET alterada_em = now() WHERE id = %s", (tatica_id,))
            return _ler(cursor, tatica_id, [sequencia_id])[0]


def remover_sequencia(usuario_id: int, tatica_id: int, sequencia_id: int) -> None:
    """Apaga a sequência; as marcações saem junto (ON DELETE CASCADE)."""
    with _conectar() as conexao:
        with conexao.cursor() as cursor:
            _conferir_tatica(cursor, usuario_id, tatica_id)
            apagadas = cursor.execute(
                "DELETE FROM sequencias WHERE id = %s AND tatica_id = %s", (sequencia_id, tatica_id)
            ).rowcount
            if apagadas == 0:
                raise SequenciaNaoEncontrada
            cursor.execute("UPDATE taticas SET alterada_em = now() WHERE id = %s", (tatica_id,))

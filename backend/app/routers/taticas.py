from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.schemas import (
    POSICOES_MAX,
    Lado,
    MapaId,
    Referencias,
    Tatica,
    TaticaAtualizar,
    TaticaCriar,
    TaticaResumo,
)
from app.sessao import usuario_atual
from app.taticas import (
    ClassificacaoInexistente,
    FuncaoInexistente,
    JogadorInvalido,
    TaticaNaoEncontrada,
    atualizar_tatica,
    buscar_tatica,
    criar_tatica,
    listar_referencias,
    listar_taticas,
    remover_tatica,
)

router = APIRouter(prefix="/api", tags=["taticas"])

# Limite do BIGINT: um id maior que isso nunca existe e responde 422.
IdTatica = Annotated[int, Path(ge=1, le=9_223_372_036_854_775_807)]

_RESPOSTAS_COMUNS = {
    401: {"description": "Sem sessão válida"},
    503: {"description": "Banco de dados indisponível"},
}
_RESPOSTAS_ESCRITA = {
    **_RESPOSTAS_COMUNS,
    422: {"description": "Dados inválidos, função inexistente ou jogador inválido"},
}
_RESPOSTA_404 = {404: {"description": "Tática não encontrada"}}


def _nao_encontrada() -> HTTPException:
    return HTTPException(status_code=404, detail="Tática não encontrada.")


def _funcao_inexistente() -> HTTPException:
    return HTTPException(status_code=422, detail="Função inexistente.")


def _jogador_invalido() -> HTTPException:
    # Mesma resposta para jogador inexistente e jogador de outro usuário (RNF03).
    return HTTPException(status_code=422, detail="Algum jogador da tática não está disponível no seu elenco.")


def _classificacao_inexistente() -> HTTPException:
    return HTTPException(status_code=422, detail="Classificação inexistente.")


def _banco_fora() -> HTTPException:
    return HTTPException(status_code=503, detail="Banco de dados indisponível.")


FiltroIds = Annotated[list[int], Query()]
Quantidade = Annotated[int | None, Query(ge=0, le=POSICOES_MAX)]


@router.get("/referencias", response_model=Referencias, responses={503: _RESPOSTAS_COMUNS[503]})
def referencias() -> dict:
    """Listas fixas de execução, economia e objetivo (RF18), para os filtros. Não exige sessão."""
    try:
        return listar_referencias()
    except psycopg.OperationalError:
        raise _banco_fora()


@router.get(
    "/taticas",
    response_model=list[TaticaResumo],
    responses={**_RESPOSTAS_COMUNS, 422: {"description": "Filtro inválido"}},
)
def listar(
    usuario: dict = Depends(usuario_atual),
    mapa_id: Annotated[MapaId | None, Query()] = None,
    lado: Annotated[Lado | None, Query()] = None,
    execucao: FiltroIds = [],
    economia: FiltroIds = [],
    objetivo: FiltroIds = [],
    jogadores_min: Quantidade = None,
    jogadores_max: Quantidade = None,
    busca: Annotated[str | None, Query(max_length=60)] = None,
) -> list[dict]:
    """Só as táticas do usuário logado, da alteração mais recente para a mais antiga.

    Filtros opcionais (RF18): execucao, economia e objetivo podem se repetir
    (?execucao=1&execucao=3). Dentro da mesma categoria basta uma das opções (OU); entre
    filtros diferentes, todos precisam valer (E). Valor fora da lista fixa responde 422.
    """
    if any(not 1 <= id_ <= 32767 for id_ in [*execucao, *economia, *objetivo]):
        raise HTTPException(status_code=422, detail="Filtro inválido.")
    if jogadores_min is not None and jogadores_max is not None and jogadores_min > jogadores_max:
        raise HTTPException(status_code=422, detail="A quantidade mínima de jogadores é maior que a máxima.")
    try:
        return listar_taticas(
            usuario["id"],
            mapa_id=mapa_id,
            lado=lado,
            execucoes=execucao,
            economias=economia,
            objetivos=objetivo,
            jogadores_min=jogadores_min,
            jogadores_max=jogadores_max,
            busca=(busca or "").strip() or None,
        )
    except ClassificacaoInexistente:
        raise HTTPException(status_code=422, detail="Filtro inválido.")
    except psycopg.OperationalError:
        raise _banco_fora()


@router.post(
    "/taticas",
    status_code=status.HTTP_201_CREATED,
    response_model=Tatica,
    responses=_RESPOSTAS_ESCRITA,
)
def criar(dados: TaticaCriar, usuario: dict = Depends(usuario_atual)) -> dict:
    """Cria a tática com o plano fixo (primeiro salvamento do rascunho do editor)."""
    try:
        return criar_tatica(usuario["id"], **dados.model_dump())
    except FuncaoInexistente:
        raise _funcao_inexistente()
    except JogadorInvalido:
        raise _jogador_invalido()
    except ClassificacaoInexistente:
        raise _classificacao_inexistente()
    except psycopg.OperationalError:
        raise _banco_fora()


@router.get(
    "/taticas/{tatica_id}",
    response_model=Tatica,
    responses={**_RESPOSTAS_COMUNS, **_RESPOSTA_404},
)
def obter(tatica_id: IdTatica, usuario: dict = Depends(usuario_atual)) -> dict:
    """Tática com o plano fixo. Tática de outro usuário responde 404."""
    try:
        return buscar_tatica(usuario["id"], tatica_id)
    except TaticaNaoEncontrada:
        raise _nao_encontrada()
    except psycopg.OperationalError:
        raise _banco_fora()


@router.put(
    "/taticas/{tatica_id}",
    response_model=Tatica,
    responses={**_RESPOSTAS_ESCRITA, **_RESPOSTA_404},
)
def atualizar(dados: TaticaAtualizar, tatica_id: IdTatica, usuario: dict = Depends(usuario_atual)) -> dict:
    """Substitui nome, lado, visibilidade e o plano fixo. Tática de outro usuário responde 404."""
    try:
        return atualizar_tatica(usuario["id"], tatica_id, **dados.model_dump())
    except TaticaNaoEncontrada:
        raise _nao_encontrada()
    except FuncaoInexistente:
        raise _funcao_inexistente()
    except JogadorInvalido:
        raise _jogador_invalido()
    except ClassificacaoInexistente:
        raise _classificacao_inexistente()
    except psycopg.OperationalError:
        raise _banco_fora()


@router.delete(
    "/taticas/{tatica_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_RESPOSTAS_COMUNS, **_RESPOSTA_404},
)
def remover(tatica_id: IdTatica, usuario: dict = Depends(usuario_atual)) -> None:
    """Remove a tática com o plano fixo. Tática de outro usuário responde 404."""
    try:
        remover_tatica(usuario["id"], tatica_id)
    except TaticaNaoEncontrada:
        raise _nao_encontrada()
    except psycopg.OperationalError:
        raise _banco_fora()

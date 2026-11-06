from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.schemas import Tatica, TaticaAtualizar, TaticaCriar, TaticaResumo
from app.sessao import usuario_atual
from app.taticas import (
    FuncaoInexistente,
    JogadorInvalido,
    TaticaNaoEncontrada,
    atualizar_tatica,
    buscar_tatica,
    criar_tatica,
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


def _banco_fora() -> HTTPException:
    return HTTPException(status_code=503, detail="Banco de dados indisponível.")


@router.get("/taticas", response_model=list[TaticaResumo], responses=_RESPOSTAS_COMUNS)
def listar(usuario: dict = Depends(usuario_atual)) -> list[dict]:
    """Lista apenas as táticas do usuário logado, da alteração mais recente para a mais antiga."""
    try:
        return listar_taticas(usuario["id"])
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

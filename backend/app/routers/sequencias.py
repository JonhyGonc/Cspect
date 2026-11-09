from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.routers.taticas import (
    IdTatica,
    _banco_fora,
    _funcao_inexistente,
    _jogador_invalido,
    _RESPOSTAS_COMUNS,
    _RESPOSTAS_ESCRITA,
)
from app.schemas import SEQUENCIAS_MAX, Sequencia, SequenciaAtualizar, SequenciaCriar
from app.sequencias import (
    LimiteDeSequencias,
    SequenciaNaoEncontrada,
    atualizar_sequencia,
    criar_sequencia,
    listar_sequencias,
    remover_sequencia,
)
from app.sessao import usuario_atual
from app.taticas import FuncaoInexistente, JogadorInvalido, TaticaNaoEncontrada

# Rota própria, aninhada na tática: a linha do tempo grava cada sequência com o seu PUT,
# separado do PUT do plano fixo.
router = APIRouter(prefix="/api/taticas/{tatica_id}/sequencias", tags=["sequencias"])

IdSequencia = Annotated[int, Path(ge=1, le=9_223_372_036_854_775_807)]
_RESPOSTA_404 = {404: {"description": "Tática ou sequência não encontrada"}}


def _nao_encontrada() -> HTTPException:
    # Mesma resposta para tática e sequência inexistentes ou de outro usuário (RNF03).
    return HTTPException(status_code=404, detail="Sequência não encontrada.")


@router.get("", response_model=list[Sequencia], responses={**_RESPOSTAS_COMUNS, **_RESPOSTA_404})
def listar(tatica_id: IdTatica, usuario: dict = Depends(usuario_atual)) -> list[dict]:
    """Sequências da tática, com as marcações em ordem de instante."""
    try:
        return listar_sequencias(usuario["id"], tatica_id)
    except TaticaNaoEncontrada:
        raise _nao_encontrada()
    except psycopg.OperationalError:
        raise _banco_fora()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=Sequencia,
    responses={**_RESPOSTAS_ESCRITA, **_RESPOSTA_404},
)
def criar(dados: SequenciaCriar, tatica_id: IdTatica, usuario: dict = Depends(usuario_atual)) -> dict:
    """Cria a sequência do zero (marcação vazia em 0) ou do plano fixo salvo."""
    try:
        return criar_sequencia(usuario["id"], tatica_id, **dados.model_dump())
    except TaticaNaoEncontrada:
        raise _nao_encontrada()
    except LimiteDeSequencias:
        raise HTTPException(status_code=422, detail=f"Limite de {SEQUENCIAS_MAX} sequências por tática.")
    except psycopg.OperationalError:
        raise _banco_fora()


@router.put(
    "/{sequencia_id}",
    response_model=Sequencia,
    responses={**_RESPOSTAS_ESCRITA, **_RESPOSTA_404},
)
def atualizar(
    dados: SequenciaAtualizar,
    tatica_id: IdTatica,
    sequencia_id: IdSequencia,
    usuario: dict = Depends(usuario_atual),
) -> dict:
    """Renomeia a sequência e substitui as marcações."""
    try:
        return atualizar_sequencia(usuario["id"], tatica_id, sequencia_id, **dados.model_dump())
    except (TaticaNaoEncontrada, SequenciaNaoEncontrada):
        raise _nao_encontrada()
    except FuncaoInexistente:
        raise _funcao_inexistente()
    except JogadorInvalido:
        raise _jogador_invalido()
    except psycopg.OperationalError:
        raise _banco_fora()


@router.delete(
    "/{sequencia_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_RESPOSTAS_COMUNS, **_RESPOSTA_404},
)
def remover(tatica_id: IdTatica, sequencia_id: IdSequencia, usuario: dict = Depends(usuario_atual)) -> None:
    """Apaga a sequência com as marcações."""
    try:
        remover_sequencia(usuario["id"], tatica_id, sequencia_id)
    except (TaticaNaoEncontrada, SequenciaNaoEncontrada):
        raise _nao_encontrada()
    except psycopg.OperationalError:
        raise _banco_fora()

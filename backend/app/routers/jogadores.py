from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.jogadores import (
    FuncaoInexistente,
    JogadorNaoEncontrado,
    NicknameRepetido,
    atualizar_jogador,
    criar_jogador,
    listar_funcoes,
    listar_jogadores,
    remover_jogador,
)
from app.schemas import Funcao, Jogador, JogadorRequest
from app.sessao import usuario_atual

router = APIRouter(prefix="/api", tags=["jogadores"])

# Limite do BIGINT: um id maior que isso nunca existe e responde 422.
IdJogador = Annotated[int, Path(ge=1, le=9_223_372_036_854_775_807)]

_RESPOSTAS_COMUNS = {
    401: {"description": "Sem sessão válida"},
    503: {"description": "Banco de dados indisponível"},
}
_RESPOSTAS_ESCRITA = {
    **_RESPOSTAS_COMUNS,
    409: {"description": "Nickname já usado por outro jogador do usuário"},
    422: {"description": "Dados inválidos ou função inexistente"},
}


def _nao_encontrado() -> HTTPException:
    return HTTPException(status_code=404, detail="Jogador não encontrado.")


def _nickname_repetido() -> HTTPException:
    return HTTPException(status_code=409, detail="Você já tem um jogador com este nickname.")


def _funcao_inexistente() -> HTTPException:
    return HTTPException(status_code=422, detail="Função inexistente.")


def _banco_fora() -> HTTPException:
    return HTTPException(status_code=503, detail="Banco de dados indisponível.")


@router.get(
    "/funcoes",
    response_model=list[Funcao],
    responses={503: _RESPOSTAS_COMUNS[503]},
)
def funcoes() -> list[dict]:
    """Lista fixa de funções (RF05). Não exige sessão."""
    try:
        return listar_funcoes()
    except psycopg.OperationalError:
        raise _banco_fora()


@router.get("/jogadores", response_model=list[Jogador], responses=_RESPOSTAS_COMUNS)
def jogadores(usuario: dict = Depends(usuario_atual)) -> list[dict]:
    """Lista apenas os jogadores do usuário logado (RNF03)."""
    try:
        return listar_jogadores(usuario["id"])
    except psycopg.OperationalError:
        raise _banco_fora()


@router.post(
    "/jogadores",
    status_code=status.HTTP_201_CREATED,
    response_model=Jogador,
    responses=_RESPOSTAS_ESCRITA,
)
def criar(dados: JogadorRequest, usuario: dict = Depends(usuario_atual)) -> dict:
    try:
        return criar_jogador(usuario["id"], **dados.model_dump())
    except NicknameRepetido:
        raise _nickname_repetido()
    except FuncaoInexistente:
        raise _funcao_inexistente()
    except psycopg.OperationalError:
        raise _banco_fora()


@router.put(
    "/jogadores/{jogador_id}",
    response_model=Jogador,
    responses={**_RESPOSTAS_ESCRITA, 404: {"description": "Jogador não encontrado"}},
)
def atualizar(
    dados: JogadorRequest,
    jogador_id: IdJogador,
    usuario: dict = Depends(usuario_atual),
) -> dict:
    """Substitui todos os campos do jogador. Jogador de outro usuário responde 404."""
    try:
        return atualizar_jogador(usuario["id"], jogador_id, **dados.model_dump())
    except JogadorNaoEncontrado:
        raise _nao_encontrado()
    except NicknameRepetido:
        raise _nickname_repetido()
    except FuncaoInexistente:
        raise _funcao_inexistente()
    except psycopg.OperationalError:
        raise _banco_fora()


@router.delete(
    "/jogadores/{jogador_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**_RESPOSTAS_COMUNS, 404: {"description": "Jogador não encontrado"}},
)
def remover(jogador_id: IdJogador, usuario: dict = Depends(usuario_atual)) -> None:
    """Remove o jogador e suas funções secundárias. Jogador de outro usuário responde 404."""
    try:
        remover_jogador(usuario["id"], jogador_id)
    except JogadorNaoEncontrado:
        raise _nao_encontrado()
    except psycopg.OperationalError:
        raise _banco_fora()

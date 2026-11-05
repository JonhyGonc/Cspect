import psycopg
from fastapi import APIRouter, HTTPException, status

from app.schemas import CadastroRequest, UsuarioCriado
from app.usuarios import EmailJaCadastrado, criar_usuario

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UsuarioCriado,
    responses={
        409: {"description": "E-mail já cadastrado"},
        422: {"description": "Dados inválidos"},
        503: {"description": "Banco de dados indisponível"},
    },
)
def registrar(dados: CadastroRequest) -> dict:
    try:
        return criar_usuario(
            email=dados.email,
            senha=dados.senha,
            nome_exibicao=dados.nome_exibicao,
            versao_termo=dados.versao_termo,
        )
    except EmailJaCadastrado:
        raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado.")
    except psycopg.OperationalError:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível.")

import psycopg
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status

from app.autenticacao import Situacao, autenticar
from app.schemas import CadastroRequest, LoginRequest, UsuarioCriado, UsuarioSessao
from app.sessao import encerrar_sessao, definir_cookie, limpar_cookie, usuario_atual
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


@router.post(
    "/login",
    response_model=UsuarioSessao,
    responses={
        401: {"description": "E-mail ou senha inválidos"},
        422: {"description": "Dados inválidos"},
        423: {"description": "Conta temporariamente bloqueada"},
        503: {"description": "Banco de dados indisponível"},
    },
)
def login(dados: LoginRequest, response: Response) -> dict:
    try:
        resultado = autenticar(email=dados.email, senha=dados.senha)
    except psycopg.OperationalError:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível.")

    if resultado.situacao is Situacao.BLOQUEADO:
        raise HTTPException(
            status_code=423,
            detail="Conta temporariamente bloqueada. Tente novamente mais tarde.",
        )
    if resultado.situacao is Situacao.CREDENCIAIS_INVALIDAS:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")

    definir_cookie(response, resultado.token)
    return resultado.usuario


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={503: {"description": "Banco de dados indisponível"}},
)
def logout(sessao: str | None = Cookie(default=None)) -> Response:
    """Apaga a sessão do cookie e limpa o cookie. Responde 204 mesmo sem sessão."""
    if sessao:
        try:
            encerrar_sessao(sessao)
        except psycopg.OperationalError:
            raise HTTPException(status_code=503, detail="Banco de dados indisponível.")

    resposta = Response(status_code=status.HTTP_204_NO_CONTENT)
    limpar_cookie(resposta)
    return resposta


@router.get(
    "/me",
    response_model=UsuarioSessao,
    responses={401: {"description": "Sem sessão válida"}},
)
def me(usuario: dict = Depends(usuario_atual)) -> dict:
    return usuario

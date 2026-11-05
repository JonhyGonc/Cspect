import psycopg
import pytest

from tests.conftest import URL_BANCO_TESTE

ENDPOINT = "/api/auth/register"

DADOS_VALIDOS = {
    "email": "joao@exemplo.com",
    "senha": "senha-forte-123",
    "nome_exibicao": "João",
    "aceite_termo": True,
    "versao_termo": "0.1",
}


def _com(**alteracoes) -> dict:
    return {**DADOS_VALIDOS, **alteracoes}


def test_cadastro_com_sucesso_retorna_201_sem_senha_nem_hash(cliente):
    resposta = cliente.post(ENDPOINT, json=DADOS_VALIDOS)

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert set(corpo) == {"id", "email", "nome_exibicao"}
    assert corpo["email"] == "joao@exemplo.com"
    assert corpo["nome_exibicao"] == "João"
    assert "senha" not in resposta.text
    assert "senha_hash" not in resposta.text
    assert "$argon2" not in resposta.text


def test_senha_e_guardada_como_hash_no_banco(cliente):
    cliente.post(ENDPOINT, json=DADOS_VALIDOS)

    with psycopg.connect(URL_BANCO_TESTE) as conexao:
        senha_hash, versao, aceito_em = conexao.execute(
            "SELECT senha_hash, termo_versao, termo_aceito_em FROM usuarios WHERE email = %s",
            ("joao@exemplo.com",),
        ).fetchone()

    assert senha_hash.startswith("$argon2")
    assert DADOS_VALIDOS["senha"] not in senha_hash
    assert versao == "0.1"
    assert aceito_em is not None


@pytest.mark.parametrize("email_repetido", ["joao@exemplo.com", "JOAO@Exemplo.com", "Joao@EXEMPLO.COM"])
def test_email_repetido_sem_diferenciar_maiusculas_retorna_409(cliente, email_repetido):
    assert cliente.post(ENDPOINT, json=DADOS_VALIDOS).status_code == 201

    resposta = cliente.post(ENDPOINT, json=_com(email=email_repetido))

    assert resposta.status_code == 409


@pytest.mark.parametrize("email", ["sem-arroba", "a@b", "a b@exemplo.com"])
def test_email_invalido_retorna_422(cliente, email):
    assert cliente.post(ENDPOINT, json=_com(email=email)).status_code == 422


def test_senha_curta_retorna_422(cliente):
    assert cliente.post(ENDPOINT, json=_com(senha="1234567")).status_code == 422


def test_nome_vazio_retorna_422(cliente):
    assert cliente.post(ENDPOINT, json=_com(nome_exibicao="")).status_code == 422


def test_aceite_nao_marcado_retorna_422(cliente):
    assert cliente.post(ENDPOINT, json=_com(aceite_termo=False)).status_code == 422


def test_erro_de_validacao_nao_devolve_a_senha(cliente):
    resposta = cliente.post(ENDPOINT, json=_com(senha="curta"))

    assert resposta.status_code == 422
    assert "curta" not in resposta.text


def test_health_continua_respondendo(cliente):
    resposta = cliente.get("/api/health")

    assert resposta.status_code == 200
    assert resposta.json()["api"] == {"status": "ok"}

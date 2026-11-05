import hashlib

import psycopg
import pytest

from tests.conftest import URL_BANCO_TESTE

ENDPOINT_REGISTER = "/api/auth/register"
ENDPOINT_LOGIN = "/api/auth/login"
ENDPOINT_LOGOUT = "/api/auth/logout"
ENDPOINT_ME = "/api/auth/me"

EMAIL = "joao@exemplo.com"
SENHA = "senha-forte-123"
MENSAGEM_INVALIDA = "E-mail ou senha inválidos."
MENSAGEM_BLOQUEADA = "Conta temporariamente bloqueada. Tente novamente mais tarde."


def _cadastrar(cliente, email: str = EMAIL, senha: str = SENHA) -> None:
    resposta = cliente.post(
        ENDPOINT_REGISTER,
        json={
            "email": email,
            "senha": senha,
            "nome_exibicao": "João",
            "aceite_termo": True,
            "versao_termo": "0.1",
        },
    )
    assert resposta.status_code == 201


def _login(cliente, email: str = EMAIL, senha: str = SENHA):
    return cliente.post(ENDPOINT_LOGIN, json={"email": email, "senha": senha})


def _executar(comando: str, *parametros) -> None:
    with psycopg.connect(URL_BANCO_TESTE) as conexao:
        conexao.execute(comando, parametros)


def _consultar(comando: str, *parametros):
    with psycopg.connect(URL_BANCO_TESTE) as conexao:
        return conexao.execute(comando, parametros).fetchone()


def _estado_do_usuario(email: str = EMAIL):
    """Devolve (tentativas_login, bloqueado_ate esta preenchido, bloqueado_ate ainda vigente)."""
    return _consultar(
        """
        SELECT tentativas_login, bloqueado_ate IS NOT NULL,
               COALESCE(bloqueado_ate > now(), false)
        FROM usuarios WHERE lower(email) = lower(%s)
        """,
        email,
    )


# --- Login -----------------------------------------------------------------


def test_login_correto_retorna_200_e_define_cookie_sessao(cliente):
    _cadastrar(cliente)

    resposta = _login(cliente)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert set(corpo) == {"id", "email", "nome_exibicao"}
    assert corpo["email"] == EMAIL
    assert corpo["nome_exibicao"] == "João"
    assert "senha" not in resposta.text
    assert "senha_hash" not in resposta.text

    assert "sessao" in cliente.cookies
    cabecalho = resposta.headers["set-cookie"].lower()
    assert cabecalho.startswith("sessao=")
    assert "httponly" in cabecalho
    assert "samesite=lax" in cabecalho
    assert "path=/" in cabecalho


def test_cookie_secure_fica_desligado_por_padrao(cliente):
    _cadastrar(cliente)

    resposta = _login(cliente)

    assert "secure" not in resposta.headers["set-cookie"].lower()


def test_senha_errada_retorna_401_com_mensagem_padrao(cliente):
    _cadastrar(cliente)

    resposta = _login(cliente, senha="senha-errada-999")

    assert resposta.status_code == 401
    assert resposta.json()["detail"] == MENSAGEM_INVALIDA
    assert "sessao" not in cliente.cookies


def test_email_inexistente_retorna_401_com_a_mesma_mensagem(cliente):
    _cadastrar(cliente)

    senha_errada = _login(cliente, senha="senha-errada-999")
    email_inexistente = _login(cliente, email="ninguem@exemplo.com")

    assert email_inexistente.status_code == 401
    assert email_inexistente.json() == senha_errada.json()
    assert email_inexistente.json()["detail"] == MENSAGEM_INVALIDA


def test_login_aceita_email_em_maiusculas(cliente):
    _cadastrar(cliente)

    assert _login(cliente, email="JOAO@Exemplo.COM").status_code == 200


def test_cinco_erros_seguidos_bloqueiam_e_sexta_tentativa_com_senha_correta_retorna_423(cliente):
    _cadastrar(cliente)

    for _ in range(5):
        assert _login(cliente, senha="senha-errada-999").status_code == 401

    resposta = _login(cliente)  # senha correta, mas a conta já está bloqueada

    assert resposta.status_code == 423
    assert resposta.json()["detail"] == MENSAGEM_BLOQUEADA
    assert "sessao" not in cliente.cookies


def test_conta_bloqueada_nao_conta_novas_tentativas(cliente):
    _cadastrar(cliente)
    for _ in range(5):
        _login(cliente, senha="senha-errada-999")

    _login(cliente, senha="senha-errada-999")  # 423 sem verificar a senha

    tentativas, bloqueio_definido, bloqueio_vigente = _estado_do_usuario()
    assert tentativas == 5
    assert bloqueio_definido
    assert bloqueio_vigente


def test_bloqueio_define_prazo_de_15_minutos(cliente):
    _cadastrar(cliente)
    for _ in range(5):
        _login(cliente, senha="senha-errada-999")

    minutos_restantes = _consultar(
        "SELECT EXTRACT(EPOCH FROM (bloqueado_ate - now())) / 60 FROM usuarios WHERE lower(email) = lower(%s)",
        EMAIL,
    )[0]

    assert 14 < minutos_restantes <= 15


def test_login_correto_zera_as_tentativas_antes_do_bloqueio(cliente):
    _cadastrar(cliente)
    for _ in range(3):
        _login(cliente, senha="senha-errada-999")

    assert _login(cliente).status_code == 200
    assert _estado_do_usuario()[0] == 0

    # Depois de zerar, quatro erros seguidos ainda não bloqueiam a conta.
    for _ in range(4):
        assert _login(cliente, senha="senha-errada-999").status_code == 401
    assert _login(cliente).status_code == 200


def test_bloqueio_expirado_deixa_o_login_funcionar_de_novo(cliente):
    _cadastrar(cliente)
    for _ in range(5):
        _login(cliente, senha="senha-errada-999")
    assert _login(cliente).status_code == 423

    _executar(
        "UPDATE usuarios SET bloqueado_ate = now() - interval '1 minute' WHERE lower(email) = lower(%s)",
        EMAIL,
    )

    assert _login(cliente).status_code == 200
    assert _estado_do_usuario() == (0, False, False)


def test_usuario_excluido_nao_consegue_logar(cliente):
    _cadastrar(cliente)
    _executar("UPDATE usuarios SET status = 'excluido' WHERE lower(email) = lower(%s)", EMAIL)

    resposta = _login(cliente)

    assert resposta.status_code == 401
    assert resposta.json()["detail"] == MENSAGEM_INVALIDA
    assert "sessao" not in cliente.cookies


def test_sessao_guarda_apenas_o_hash_sha256_do_token(cliente):
    _cadastrar(cliente)
    _login(cliente)
    token = cliente.cookies["sessao"]

    token_hash = _consultar("SELECT token_hash FROM sessoes")[0]

    assert token_hash == hashlib.sha256(token.encode("utf-8")).hexdigest()
    assert token_hash != token
    assert _consultar("SELECT count(*) FROM sessoes WHERE token_hash = %s", token)[0] == 0


# --- Logout ----------------------------------------------------------------


def test_logout_sem_sessao_retorna_204(cliente):
    assert cliente.post(ENDPOINT_LOGOUT).status_code == 204


def test_logout_invalida_a_sessao_no_servidor(cliente):
    _cadastrar(cliente)
    _login(cliente)
    token = cliente.cookies["sessao"]
    assert cliente.get(ENDPOINT_ME).status_code == 200

    resposta = cliente.post(ENDPOINT_LOGOUT)

    assert resposta.status_code == 204
    assert "sessao=" in resposta.headers["set-cookie"]
    assert _consultar("SELECT count(*) FROM sessoes")[0] == 0

    # Mesmo que o token antigo seja reenviado, ele não vale mais.
    reenvio = cliente.get(ENDPOINT_ME, headers={"Cookie": f"sessao={token}"})
    assert reenvio.status_code == 401


# --- /me e sessão ----------------------------------------------------------


def test_me_sem_cookie_retorna_401(cliente):
    assert cliente.get(ENDPOINT_ME).status_code == 401


def test_me_com_cookie_valido_retorna_200(cliente):
    _cadastrar(cliente)
    _login(cliente)

    resposta = cliente.get(ENDPOINT_ME)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert set(corpo) == {"id", "email", "nome_exibicao"}
    assert corpo["email"] == EMAIL
    assert corpo["nome_exibicao"] == "João"


def test_me_renova_o_prazo_da_sessao_para_7_dias(cliente):
    _cadastrar(cliente)
    _login(cliente)
    _executar("UPDATE sessoes SET expira_em = now() + interval '1 day'")

    assert cliente.get(ENDPOINT_ME).status_code == 200

    dias_restantes = _consultar(
        "SELECT EXTRACT(EPOCH FROM (expira_em - now())) / 86400 FROM sessoes"
    )[0]
    assert 6.9 < dias_restantes <= 7


def test_sessao_expirada_retorna_401(cliente):
    _cadastrar(cliente)
    _login(cliente)
    _executar("UPDATE sessoes SET expira_em = now() - interval '1 second'")

    assert cliente.get(ENDPOINT_ME).status_code == 401


def test_sessao_de_usuario_excluido_retorna_401(cliente):
    _cadastrar(cliente)
    _login(cliente)
    _executar("UPDATE usuarios SET status = 'excluido' WHERE lower(email) = lower(%s)", EMAIL)

    assert cliente.get(ENDPOINT_ME).status_code == 401


@pytest.mark.parametrize("cookie", ["sessao=", "sessao=token-inventado", "outro=valor"])
def test_me_com_cookie_invalido_retorna_401(cliente, cookie):
    assert cliente.get(ENDPOINT_ME, headers={"Cookie": cookie}).status_code == 401

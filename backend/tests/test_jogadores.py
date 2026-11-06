import psycopg
import pytest
from fastapi.testclient import TestClient

from app.jogadores import calcular_avatar
from tests.conftest import URL_BANCO_TESTE

ENDPOINT_FUNCOES = "/api/funcoes"
ENDPOINT_JOGADORES = "/api/jogadores"

# Ids fixos da migração 003.
ENTRY, AWPER, LURKER, SUPPORT, IGL, ANCHOR = 1, 2, 3, 4, 5, 6


def _logar(cliente_http, email: str) -> None:
    """Cadastra o usuário e faz login. O cookie de sessão fica guardado no próprio cliente."""
    cadastro = cliente_http.post(
        "/api/auth/register",
        json={
            "email": email,
            "senha": "senha-forte-123",
            "nome_exibicao": "Teste",
            "aceite_termo": True,
            "versao_termo": "0.1",
        },
    )
    assert cadastro.status_code == 201
    login = cliente_http.post("/api/auth/login", json={"email": email, "senha": "senha-forte-123"})
    assert login.status_code == 200


@pytest.fixture
def logado(cliente):
    """Cliente com sessão do usuário A."""
    _logar(cliente, "a@exemplo.com")
    return cliente


@pytest.fixture
def outro(cliente):
    """Segundo cliente, com cookies próprios e sessão do usuário B."""
    from app.main import app

    with TestClient(app) as cliente_b:
        _logar(cliente_b, "b@exemplo.com")
        yield cliente_b


def _dados(**alteracoes) -> dict:
    dados = {
        "nickname": "coldzera",
        "funcao_principal_id": AWPER,
        "funcoes_secundarias_ids": [IGL, SUPPORT],
        "observacoes": "Joga de AWP no lado CT.",
    }
    dados.update(alteracoes)
    return dados


def _criar(cliente_http, **alteracoes):
    return cliente_http.post(ENDPOINT_JOGADORES, json=_dados(**alteracoes))


def _consultar(comando: str, *parametros):
    with psycopg.connect(URL_BANCO_TESTE) as conexao:
        return conexao.execute(comando, parametros).fetchone()


# --- Funções ----------------------------------------------------------------


def test_funcoes_lista_as_seis_sem_exigir_sessao(cliente):
    resposta = cliente.get(ENDPOINT_FUNCOES)

    assert resposta.status_code == 200
    assert resposta.json() == [
        {"id": 1, "nome": "Entry Fragger"},
        {"id": 2, "nome": "AWPer"},
        {"id": 3, "nome": "Lurker"},
        {"id": 4, "nome": "Support"},
        {"id": 5, "nome": "IGL"},
        {"id": 6, "nome": "Anchor"},
    ]


# --- Criar ------------------------------------------------------------------


def test_criar_jogador_com_sucesso(logado):
    resposta = _criar(logado, nickname="  coldzera  ")

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert isinstance(corpo["id"], int)
    assert corpo["nickname"] == "coldzera"  # espaços das pontas removidos
    assert corpo["avatar"] == "CO"
    assert corpo["funcao_principal"] == {"id": AWPER, "nome": "AWPer"}
    assert corpo["funcoes_secundarias"] == [
        {"id": SUPPORT, "nome": "Support"},
        {"id": IGL, "nome": "IGL"},
    ]
    assert corpo["observacoes"] == "Joga de AWP no lado CT."


def test_criar_sem_observacoes_e_sem_secundarias(logado):
    dados = _dados(funcoes_secundarias_ids=[])
    del dados["observacoes"]

    resposta = logado.post(ENDPOINT_JOGADORES, json=dados)

    assert resposta.status_code == 201
    assert resposta.json()["observacoes"] == ""
    assert resposta.json()["funcoes_secundarias"] == []


def test_nickname_repetido_sem_diferenciar_maiusculas(logado):
    assert _criar(logado, nickname="FalleN").status_code == 201

    resposta = _criar(logado, nickname="  fallen ")

    assert resposta.status_code == 409


def test_mesmo_nickname_em_usuarios_diferentes_e_permitido(logado, outro):
    assert _criar(logado, nickname="fallen").status_code == 201
    assert _criar(outro, nickname="FALLEN").status_code == 201


def test_funcao_secundaria_igual_a_principal(logado):
    resposta = _criar(logado, funcao_principal_id=AWPER, funcoes_secundarias_ids=[IGL, AWPER])

    assert resposta.status_code == 422


def test_funcao_secundaria_repetida(logado):
    resposta = _criar(logado, funcoes_secundarias_ids=[IGL, IGL])

    assert resposta.status_code == 422


@pytest.mark.parametrize(
    "alteracoes",
    [
        {"funcao_principal_id": 99},
        {"funcoes_secundarias_ids": [IGL, 99]},
    ],
    ids=["principal", "secundaria"],
)
def test_funcao_inexistente(logado, alteracoes):
    resposta = _criar(logado, **alteracoes)

    assert resposta.status_code == 422
    assert _consultar("SELECT count(*) FROM jogadores")[0] == 0


@pytest.mark.parametrize(
    "alteracoes",
    [
        {"nickname": ""},
        {"nickname": "   "},
        {"nickname": "x" * 33},
        {"observacoes": "x" * 501},
        {"funcao_principal_id": ENTRY, "funcoes_secundarias_ids": [1, 2, 3, 4, 5, 6]},
        {"funcao_principal_id": True},
        {"funcao_principal_id": "2"},
        {"funcoes_secundarias_ids": "4"},
    ],
    ids=[
        "nickname-vazio",
        "nickname-so-espacos",
        "nickname-33",
        "observacoes-501",
        "seis-secundarias",
        "principal-booleano",
        "principal-texto",
        "secundarias-nao-lista",
    ],
)
def test_dados_invalidos(logado, alteracoes):
    assert _criar(logado, **alteracoes).status_code == 422


def test_limites_aceitos(logado):
    resposta = _criar(
        logado,
        nickname="  " + "x" * 32 + "  ",
        observacoes="o" * 500,
        funcao_principal_id=ENTRY,
        funcoes_secundarias_ids=[AWPER, LURKER, SUPPORT, IGL, ANCHOR],
    )

    assert resposta.status_code == 201
    assert resposta.json()["nickname"] == "x" * 32
    assert len(resposta.json()["funcoes_secundarias"]) == 5


# --- Listar -----------------------------------------------------------------


def test_listar_retorna_so_jogadores_do_usuario_logado(logado, outro):
    _criar(logado, nickname="fallen")
    _criar(logado, nickname="coldzera")
    _criar(outro, nickname="s1mple")

    lista_a = logado.get(ENDPOINT_JOGADORES)
    lista_b = outro.get(ENDPOINT_JOGADORES)

    assert lista_a.status_code == 200
    assert [j["nickname"] for j in lista_a.json()] == ["coldzera", "fallen"]
    assert [j["nickname"] for j in lista_b.json()] == ["s1mple"]
    assert set(lista_a.json()[0]) == {
        "id",
        "nickname",
        "avatar",
        "funcao_principal",
        "funcoes_secundarias",
        "observacoes",
    }


# --- Editar e remover -------------------------------------------------------


def test_editar_o_proprio_jogador(logado):
    id_jogador = _criar(logado).json()["id"]

    resposta = logado.put(
        f"{ENDPOINT_JOGADORES}/{id_jogador}",
        json={
            "nickname": "  kscerato ",
            "funcao_principal_id": ENTRY,
            "funcoes_secundarias_ids": [ANCHOR],
            "observacoes": "Agora é entry.",
        },
    )

    assert resposta.status_code == 200
    assert resposta.json() == {
        "id": id_jogador,
        "nickname": "kscerato",
        "avatar": "KS",
        "funcao_principal": {"id": ENTRY, "nome": "Entry Fragger"},
        "funcoes_secundarias": [{"id": ANCHOR, "nome": "Anchor"}],
        "observacoes": "Agora é entry.",
    }
    assert logado.get(ENDPOINT_JOGADORES).json() == [resposta.json()]


def test_editar_mudando_so_maiusculas_do_proprio_nickname(logado):
    id_jogador = _criar(logado, nickname="fallen").json()["id"]

    resposta = logado.put(f"{ENDPOINT_JOGADORES}/{id_jogador}", json=_dados(nickname="FalleN"))

    assert resposta.status_code == 200
    assert resposta.json()["nickname"] == "FalleN"


def test_editar_para_nickname_de_outro_jogador(logado):
    _criar(logado, nickname="fallen")
    id_jogador = _criar(logado, nickname="coldzera").json()["id"]

    resposta = logado.put(f"{ENDPOINT_JOGADORES}/{id_jogador}", json=_dados(nickname="FALLEN"))

    assert resposta.status_code == 409


def test_editar_com_secundaria_igual_a_principal(logado):
    id_jogador = _criar(logado).json()["id"]

    resposta = logado.put(
        f"{ENDPOINT_JOGADORES}/{id_jogador}",
        json=_dados(funcao_principal_id=IGL, funcoes_secundarias_ids=[IGL]),
    )

    assert resposta.status_code == 422


def test_remover_o_proprio_jogador(logado):
    id_jogador = _criar(logado).json()["id"]

    resposta = logado.delete(f"{ENDPOINT_JOGADORES}/{id_jogador}")

    assert resposta.status_code == 204
    assert resposta.content == b""
    assert logado.get(ENDPOINT_JOGADORES).json() == []
    # As funções secundárias saem junto com o jogador.
    assert _consultar(
        "SELECT count(*) FROM jogador_funcoes_secundarias WHERE jogador_id = %s", id_jogador
    )[0] == 0
    assert logado.delete(f"{ENDPOINT_JOGADORES}/{id_jogador}").status_code == 404


def test_editar_ou_remover_jogador_de_outro_usuario_retorna_404(logado, outro):
    jogador_b = _criar(outro, nickname="s1mple").json()

    editar = logado.put(f"{ENDPOINT_JOGADORES}/{jogador_b['id']}", json=_dados(nickname="invasor"))
    remover = logado.delete(f"{ENDPOINT_JOGADORES}/{jogador_b['id']}")

    assert editar.status_code == 404
    assert remover.status_code == 404
    # A resposta é a mesma de um id que não existe, sem revelar nada.
    assert editar.json() == logado.put(f"{ENDPOINT_JOGADORES}/999999", json=_dados()).json()
    # O jogador do usuário B continua igual.
    assert outro.get(ENDPOINT_JOGADORES).json() == [jogador_b]


def test_editar_jogador_de_outro_usuario_com_dados_invalidos_nao_revela_existencia(logado, outro):
    """Mesmo com função inexistente, o jogador alheio responde como um id que não existe."""
    id_b = _criar(outro).json()["id"]

    resposta = logado.put(f"{ENDPOINT_JOGADORES}/{id_b}", json=_dados(funcao_principal_id=99))

    assert resposta.status_code == 404


# --- Sessão -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("metodo", "caminho"),
    [
        ("GET", ENDPOINT_JOGADORES),
        ("POST", ENDPOINT_JOGADORES),
        ("PUT", f"{ENDPOINT_JOGADORES}/1"),
        ("DELETE", f"{ENDPOINT_JOGADORES}/1"),
    ],
)
def test_sem_sessao_retorna_401(cliente, metodo, caminho):
    corpo = None if metodo in ("GET", "DELETE") else _dados()

    resposta = cliente.request(metodo, caminho, json=corpo)

    assert resposta.status_code == 401


def test_sessao_invalida_retorna_401(cliente):
    cliente.cookies.set("sessao", "token-que-nao-existe")

    assert cliente.get(ENDPOINT_JOGADORES).status_code == 401


# --- Avatar -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("nickname", "avatar"),
    [
        ("coldzera", "CO"),
        ("s1mple", "S1"),
        ("x", "X"),
        ("  ab  ", "AB"),
        ("[TT] zé", "TT"),
        ("zé", "ZÉ"),
    ],
)
def test_avatar_com_as_iniciais(logado, nickname, avatar):
    resposta = _criar(logado, nickname=nickname)

    assert resposta.status_code == 201
    assert resposta.json()["avatar"] == avatar
    assert _consultar("SELECT avatar FROM jogadores WHERE id = %s", resposta.json()["id"])[0] == avatar


def test_avatar_e_recalculado_ao_editar(logado):
    id_jogador = _criar(logado, nickname="fallen").json()["id"]

    resposta = logado.put(f"{ENDPOINT_JOGADORES}/{id_jogador}", json=_dados(nickname="taco"))

    assert resposta.json()["avatar"] == "TA"


@pytest.mark.parametrize(
    ("nickname", "avatar"),
    [("!!!", "!!"), ("a", "A"), ("ßx", "SS"), ("-k-", "K")],
)
def test_calcular_avatar_casos_de_borda(nickname, avatar):
    assert calcular_avatar(nickname) == avatar

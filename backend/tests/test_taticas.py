"""Testes das táticas com plano fixo (T4.4). Cobrem só o pedido na tarefa:
salvar e reabrir, acesso de outro usuário, validação e RF08A."""

import pytest

from tests.test_jogadores import AWPER, ENTRY, IGL, _criar, _logar, logado, outro  # noqa: F401

ENDPOINT = "/api/taticas"


def _tatica(**alteracoes) -> dict:
    dados = {
        "nome": "Execução no B",
        "mapa_id": "dust2",
        "lado": "T",
        "visibilidade": "privada",
        "posicoes": [{"jogador_id": None, "funcao_id": IGL, "x": 0.25, "y": 0.75}],
    }
    dados.update(alteracoes)
    return dados


def _atualizacao(**alteracoes) -> dict:
    dados = _tatica(**alteracoes)
    dados.pop("mapa_id")
    return dados


def test_dono_salva_e_reabre_o_plano(logado):
    jogador = _criar(logado, nickname="alfa", funcao_principal_id=ENTRY, funcoes_secundarias_ids=[]).json()
    posicoes = [
        {"jogador_id": jogador["id"], "funcao_id": AWPER, "x": 0.1, "y": 0.2},
        {"jogador_id": None, "funcao_id": None, "x": 0, "y": 1},
    ]
    criada = logado.post(ENDPOINT, json=_tatica(nome="  Rush B  ", posicoes=posicoes))
    assert criada.status_code == 201
    corpo = criada.json()
    assert corpo["nome"] == "Rush B"  # espaços das pontas removidos

    reaberta = logado.get(f"{ENDPOINT}/{corpo['id']}").json()
    assert {k: reaberta[k] for k in ("nome", "mapa_id", "lado", "visibilidade")} == {
        "nome": "Rush B",
        "mapa_id": "dust2",
        "lado": "T",
        "visibilidade": "privada",
    }
    assert reaberta["posicoes"] == [
        {"jogador_id": jogador["id"], "funcao_id": AWPER, "x": 0.1, "y": 0.2},
        {"jogador_id": None, "funcao_id": None, "x": 0.0, "y": 1.0},
    ]

    # PUT substitui nome, lado e o plano inteiro; o mapa continua o mesmo.
    novas = [{"jogador_id": jogador["id"], "funcao_id": None, "x": 0.5, "y": 0.5}]
    atualizada = logado.put(f"{ENDPOINT}/{corpo['id']}", json=_atualizacao(nome="Retake", lado="CT", posicoes=novas))
    assert atualizada.status_code == 200
    reaberta = logado.get(f"{ENDPOINT}/{corpo['id']}").json()
    assert (reaberta["nome"], reaberta["lado"], reaberta["mapa_id"]) == ("Retake", "CT", "dust2")
    assert reaberta["posicoes"] == novas

    lista = logado.get(ENDPOINT).json()
    assert [(t["id"], t["nome"]) for t in lista] == [(corpo["id"], "Retake")]


def test_outro_usuario_recebe_404(logado, outro):
    tatica_id = logado.post(ENDPOINT, json=_tatica()).json()["id"]

    assert outro.get(f"{ENDPOINT}/{tatica_id}").status_code == 404
    assert outro.put(f"{ENDPOINT}/{tatica_id}", json=_atualizacao(nome="Invadida")).status_code == 404
    assert outro.delete(f"{ENDPOINT}/{tatica_id}").status_code == 404
    assert outro.get(ENDPOINT).json() == []
    # Id inexistente responde igual.
    assert outro.get(f"{ENDPOINT}/{tatica_id + 1000}").status_code == 404

    # A tática continua intacta para o dono, que consegue remover.
    assert logado.get(f"{ENDPOINT}/{tatica_id}").json()["nome"] == "Execução no B"
    assert logado.delete(f"{ENDPOINT}/{tatica_id}").status_code == 204
    assert logado.get(f"{ENDPOINT}/{tatica_id}").status_code == 404


def test_jogador_de_outro_usuario_responde_422_generico(logado, outro):
    jogador_b = _criar(outro, nickname="bravo").json()
    posicoes = [{"jogador_id": jogador_b["id"], "funcao_id": None, "x": 0.5, "y": 0.5}]
    resposta = logado.post(ENDPOINT, json=_tatica(posicoes=posicoes))
    inexistente = logado.post(ENDPOINT, json=_tatica(posicoes=[{**posicoes[0], "jogador_id": 999999}]))

    assert resposta.status_code == inexistente.status_code == 422
    assert resposta.json() == inexistente.json()  # não confirma se o jogador existe


@pytest.mark.parametrize(
    "alteracoes",
    [
        {"nome": "   "},
        {"nome": "a" * 61},
        {"lado": "TR"},
        {"mapa_id": "vertigo"},
        {"visibilidade": "amigos"},
        {"posicoes": [{"jogador_id": None, "funcao_id": None, "x": 1.5, "y": 0.5}]},
        {"posicoes": [{"jogador_id": None, "funcao_id": None, "x": 0.5, "y": -0.1}]},
        {"posicoes": [{"jogador_id": None, "funcao_id": 99, "x": 0.5, "y": 0.5}]},
        {"dono_id": 2},
    ],
)
def test_validacao_responde_422(logado, alteracoes):
    assert logado.post(ENDPOINT, json=_tatica(**alteracoes)).status_code == 422


def test_remover_jogador_mantem_posicao_com_funcao(logado):
    """RF08A: a posição continua na tática, com a função e sem jogador."""
    jogador = _criar(logado, nickname="alfa", funcao_principal_id=ENTRY, funcoes_secundarias_ids=[]).json()
    posicoes = [{"jogador_id": jogador["id"], "funcao_id": AWPER, "x": 0.3, "y": 0.4}]
    tatica_id = logado.post(ENDPOINT, json=_tatica(posicoes=posicoes)).json()["id"]

    assert logado.delete(f"/api/jogadores/{jogador['id']}").status_code == 204

    reaberta = logado.get(f"{ENDPOINT}/{tatica_id}").json()
    assert reaberta["posicoes"] == [{"jogador_id": None, "funcao_id": AWPER, "x": 0.3, "y": 0.4}]

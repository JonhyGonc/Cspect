"""Testes das sequências da linha do tempo (fase 6). Cobrem só o pedido na tarefa:
criação do zero e do plano, acesso de outro usuário e validação de instante e coordenadas.
A interpolação é do navegador e tem teste próprio (frontend/src/editor/interpolacao.test.ts)."""

import pytest

from tests.test_jogadores import AWPER, _criar, logado, outro  # noqa: F401
from tests.test_taticas import ENDPOINT, _tatica


def _sequencias(tatica_id: int) -> str:
    return f"{ENDPOINT}/{tatica_id}/sequencias"


def _marcacao(**alteracoes) -> dict:
    marcacao = {"instante": 0, "tipo": "manual", "posicoes": [], "utilitarios": [], "tracos": []}
    marcacao.update(alteracoes)
    return marcacao


def test_cria_do_zero_e_do_plano_e_salva_marcacoes(logado):
    jogador = _criar(logado, nickname="alfa").json()
    plano = {
        "posicoes": [{"jogador_id": jogador["id"], "funcao_id": AWPER, "x": 0.1, "y": 0.2}],
        "utilitarios": [{"tipo": "smoke", "x": 0.5, "y": 0.5, "trajetoria": None, "duracao": 18}],
        "tracos": [
            {"jogador_id": jogador["id"], "pontos": [[0.1, 0.1], [0.2, 0.2]], "status": "confirmado"},
            {"jogador_id": jogador["id"], "pontos": [[0.3, 0.3], [0.4, 0.4]], "status": "rascunho"},
        ],
    }
    tatica_id = logado.post(ENDPOINT, json=_tatica(**plano)).json()["id"]

    zero = logado.post(_sequencias(tatica_id), json={"nome": "Do zero", "origem": "zero"})
    assert zero.status_code == 201
    assert zero.json()["marcacoes"] == [_marcacao()]

    do_plano = logado.post(_sequencias(tatica_id), json={"nome": "Do plano", "origem": "plano"}).json()
    [inicial] = do_plano["marcacoes"]
    assert inicial["instante"] == 0
    assert inicial["posicoes"] == plano["posicoes"]
    assert inicial["utilitarios"] == [{**plano["utilitarios"][0], "ref": "u1"}]
    assert inicial["tracos"] == [plano["tracos"][0]]  # só o traço confirmado

    # PUT renomeia e substitui as marcações (manual e automática).
    marcacoes = [
        inicial,
        _marcacao(
            instante=2500,
            tipo="automatica",
            posicoes=[{"jogador_id": jogador["id"], "funcao_id": AWPER, "x": 0.6, "y": 0.7}],
        ),
    ]
    resposta = logado.put(f"{_sequencias(tatica_id)}/{do_plano['id']}", json={"nome": "Exec", "marcacoes": marcacoes})
    assert resposta.status_code == 200
    lista = logado.get(_sequencias(tatica_id)).json()
    assert [s["nome"] for s in lista] == ["Do zero", "Exec"]
    assert lista[1]["marcacoes"] == marcacoes
    # O plano fixo não muda.
    assert logado.get(f"{ENDPOINT}/{tatica_id}").json()["tracos"] == plano["tracos"]


def test_outro_usuario_recebe_404_em_todas_as_rotas(logado, outro):
    tatica_id = logado.post(ENDPOINT, json=_tatica()).json()["id"]
    sequencia_id = logado.post(_sequencias(tatica_id), json={"nome": "S", "origem": "zero"}).json()["id"]
    corpo = {"nome": "Invadida", "marcacoes": [_marcacao()]}

    assert outro.get(_sequencias(tatica_id)).status_code == 404
    assert outro.post(_sequencias(tatica_id), json={"nome": "X", "origem": "zero"}).status_code == 404
    assert outro.put(f"{_sequencias(tatica_id)}/{sequencia_id}", json=corpo).status_code == 404
    assert outro.delete(f"{_sequencias(tatica_id)}/{sequencia_id}").status_code == 404

    # Sequência de outra tática do próprio dono também é 404 por essa rota.
    outra_tatica = logado.post(ENDPOINT, json=_tatica()).json()["id"]
    assert logado.put(f"{_sequencias(outra_tatica)}/{sequencia_id}", json=corpo).status_code == 404

    assert logado.get(_sequencias(tatica_id)).json()[0]["nome"] == "S"
    assert logado.delete(f"{_sequencias(tatica_id)}/{sequencia_id}").status_code == 204
    assert logado.get(_sequencias(tatica_id)).json() == []


@pytest.mark.parametrize(
    "marcacao",
    [
        _marcacao(instante=-1),
        _marcacao(instante=3_600_001),
        _marcacao(instante="500"),
        _marcacao(posicoes=[{"jogador_id": None, "funcao_id": None, "x": 1.5, "y": 0.5}]),
        _marcacao(utilitarios=[{"tipo": "he", "x": 0.5, "y": -0.2, "ref": "u1"}]),
    ],
)
def test_validacao_de_instante_e_coordenadas_responde_422(logado, marcacao):
    tatica_id = logado.post(ENDPOINT, json=_tatica()).json()["id"]
    sequencia_id = logado.post(_sequencias(tatica_id), json={"nome": "S", "origem": "zero"}).json()["id"]
    resposta = logado.put(f"{_sequencias(tatica_id)}/{sequencia_id}", json={"nome": "S", "marcacoes": [marcacao]})
    assert resposta.status_code == 422

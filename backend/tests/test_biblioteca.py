"""Testes da biblioteca (fase 7). Cobrem só o pedido na tarefa: acesso, filtro combinado,
validação de classificação e contagem de jogadores."""

from tests.test_jogadores import _criar, logado, outro  # noqa: F401
from tests.test_taticas import ENDPOINT, _atualizacao, _tatica

RUSH, SPLIT, EXEC = 1, 2, 3
ECO, FULL_BUY = 1, 5
RETAKE = 3


def _ids(resposta) -> list[str]:
    assert resposta.status_code == 200, resposta.text
    return sorted(t["nome"] for t in resposta.json())


def test_filtro_combinado_e_contagem_de_jogadores(logado):
    alfa = _criar(logado, nickname="alfa").json()["id"]
    bravo = _criar(logado, nickname="bravo").json()["id"]
    pos = lambda jogador_id, x: {"jogador_id": jogador_id, "funcao_id": None, "x": x, "y": 0.5}  # noqa: E731
    logado.post(
        ENDPOINT,
        json=_tatica(
            nome="Rush B",
            lado="T",
            execucoes=[RUSH, SPLIT],
            economias=[FULL_BUY],
            # A posição sem jogador (RF08A) não conta na quantidade.
            posicoes=[pos(alfa, 0.1), pos(bravo, 0.2), pos(None, 0.3)],
        ),
    )
    logado.post(
        ENDPOINT,
        json=_tatica(
            nome="Retake A",
            lado="CT",
            execucoes=[EXEC],
            economias=[FULL_BUY],
            objetivos=[RETAKE],
            posicoes=[pos(alfa, 0.4)],
        ),
    )
    logado.post(
        ENDPOINT,
        json=_tatica(nome="Eco no meio", mapa_id="mirage", execucoes=[RUSH], economias=[ECO], posicoes=[]),
    )

    lista = {t["nome"]: t for t in logado.get(ENDPOINT).json()}
    assert {nome: t["jogadores"] for nome, t in lista.items()} == {"Rush B": 2, "Retake A": 1, "Eco no meio": 0}
    assert lista["Rush B"]["execucoes"] == [RUSH, SPLIT] and len(lista["Rush B"]["posicoes"]) == 3

    # OU dentro da categoria, E entre categorias.
    assert _ids(logado.get(ENDPOINT, params={"execucao": RUSH})) == ["Eco no meio", "Rush B"]
    assert _ids(logado.get(ENDPOINT, params={"execucao": [RUSH, EXEC]})) == ["Eco no meio", "Retake A", "Rush B"]
    assert _ids(logado.get(ENDPOINT, params={"execucao": [RUSH, EXEC], "economia": FULL_BUY})) == [
        "Retake A",
        "Rush B",
    ]
    filtros = {"execucao": [RUSH, EXEC], "economia": FULL_BUY, "lado": "T", "mapa_id": "dust2"}
    assert _ids(logado.get(ENDPOINT, params=filtros)) == ["Rush B"]
    assert _ids(logado.get(ENDPOINT, params={"objetivo": RETAKE, "jogadores_max": 1})) == ["Retake A"]
    assert _ids(logado.get(ENDPOINT, params={"jogadores_min": 2})) == ["Rush B"]
    assert _ids(logado.get(ENDPOINT, params={"jogadores_max": 0})) == ["Eco no meio"]
    assert _ids(logado.get(ENDPOINT, params={"busca": "rEtAkE"})) == ["Retake A"]
    assert _ids(logado.get(ENDPOINT, params={"busca": "%"})) == []  # % é texto, não curinga


def test_classificacao_salva_reabre_e_valida(logado):
    referencias = logado.get("/api/referencias").json()
    assert [len(referencias[c]) for c in ("execucoes", "economias", "objetivos")] == [6, 5, 5]

    tatica_id = logado.post(ENDPOINT, json=_tatica(execucoes=[EXEC], objetivos=[RETAKE])).json()["id"]
    url = f"{ENDPOINT}/{tatica_id}"
    resposta = logado.put(url, json=_atualizacao(execucoes=[RUSH, SPLIT], economias=[ECO], objetivos=[]))
    assert resposta.status_code == 200
    reaberta = logado.get(url).json()
    assert (reaberta["execucoes"], reaberta["economias"], reaberta["objetivos"]) == ([RUSH, SPLIT], [ECO], [])

    # Sem as classificações no corpo, elas ficam como estão.
    logado.put(url, json=_atualizacao(nome="Outro nome"))
    assert logado.get(url).json()["execucoes"] == [RUSH, SPLIT]

    # Id fora da lista fixa: 422, e nada muda.
    assert logado.put(url, json=_atualizacao(execucoes=[99])).status_code == 422
    assert logado.put(url, json=_atualizacao(objetivos=["Pick"])).status_code == 422
    assert logado.get(url).json()["execucoes"] == [RUSH, SPLIT]

    # Filtro com valor fora da lista fixa: 422.
    for params in ({"execucao": 99}, {"lado": "TR"}, {"mapa_id": "vertigo"}, {"jogadores_min": 3, "jogadores_max": 1}):
        assert logado.get(ENDPOINT, params=params).status_code == 422, params


def test_outro_usuario_nao_ve_nem_abre(logado, outro):
    tatica_id = logado.post(ENDPOINT, json=_tatica(execucoes=[RUSH])).json()["id"]

    assert outro.get(ENDPOINT).json() == []
    assert outro.get(ENDPOINT, params={"execucao": RUSH}).json() == []
    assert outro.get(f"{ENDPOINT}/{tatica_id}").status_code == 404
    assert outro.put(f"{ENDPOINT}/{tatica_id}", json=_atualizacao(execucoes=[SPLIT])).status_code == 404
    assert logado.get(f"{ENDPOINT}/{tatica_id}").json()["execucoes"] == [RUSH]

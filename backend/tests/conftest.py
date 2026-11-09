import os

# Os testes usam um banco separado (cspect_test), nunca o banco de desenvolvimento.
# Precisa ser definido antes de o app ser importado, pois as configurações são lidas na importação.
URL_BANCO_TESTE = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://cspect:troque-esta-senha@localhost:5432/cspect_test",
)
os.environ["DATABASE_URL"] = URL_BANCO_TESTE

import pytest  # noqa: E402


@pytest.fixture(scope="session")
def banco_migrado() -> None:
    from app.migrate import aplicar_migracoes

    aplicar_migracoes()


@pytest.fixture
def cliente(banco_migrado):
    import psycopg
    from fastapi.testclient import TestClient

    from app.main import app

    with psycopg.connect(URL_BANCO_TESTE) as conexao:
        # As tabelas com FK para usuarios precisam entrar na lista, senão o TRUNCATE falha.
        # funcoes não entra: é a lista fixa preenchida pela migração 003.
        conexao.execute(
            "TRUNCATE usuarios, sessoes, jogadores, jogador_funcoes_secundarias, taticas, quadros, posicoes_quadro,"
            " utilitarios_quadro, tracos, sequencias, taticas_execucoes, taticas_economias, taticas_objetivos"
            " RESTART IDENTITY"
        )

    with TestClient(app) as cliente_http:
        yield cliente_http

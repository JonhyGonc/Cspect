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
        # sessoes precisa entrar na lista: a FK dela para usuarios impede truncar só usuarios.
        conexao.execute("TRUNCATE usuarios, sessoes RESTART IDENTITY")

    with TestClient(app) as cliente_http:
        yield cliente_http

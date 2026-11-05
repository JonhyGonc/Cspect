import psycopg

from app.migrate import aplicar_migracoes
from tests.conftest import URL_BANCO_TESTE


def _tabela_existe() -> bool:
    with psycopg.connect(URL_BANCO_TESTE) as conexao:
        return conexao.execute(
            "SELECT to_regclass('public.usuarios') IS NOT NULL"
        ).fetchone()[0]


def test_migracao_cria_tabela_e_pode_rodar_de_novo(banco_migrado):
    with psycopg.connect(URL_BANCO_TESTE) as conexao:
        # sessoes precisa ser apagada junto: a FK dela impede apagar só usuarios.
        conexao.execute("DROP TABLE IF EXISTS sessoes, usuarios")

    aplicar_migracoes()
    aplicar_migracoes()  # segunda execução não pode falhar

    assert _tabela_existe()

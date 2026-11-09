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
        # As tabelas que dependem de usuarios precisam ser apagadas junto, por causa das FKs.
        conexao.execute(
            "DROP TABLE IF EXISTS taticas_execucoes, taticas_economias, taticas_objetivos, execucoes, economias,"
            " objetivos, tracos, utilitarios_quadro, posicoes_quadro, quadros, sequencias, taticas,"
            " jogador_funcoes_secundarias, jogadores, funcoes, sessoes, usuarios"
        )

    aplicar_migracoes()
    aplicar_migracoes()  # segunda execução não pode falhar

    assert _tabela_existe()
    with psycopg.connect(URL_BANCO_TESTE) as conexao:
        assert conexao.execute("SELECT count(*) FROM funcoes").fetchone()[0] == 6

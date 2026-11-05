"""Aplica as migrações SQL de backend/migrations no banco definido em DATABASE_URL.

Uso (a partir da pasta backend/):
    python -m app.migrate
"""

from pathlib import Path

import psycopg

from app.config import get_settings

PASTA_MIGRACOES = Path(__file__).resolve().parent.parent / "migrations"


def aplicar_migracoes() -> list[str]:
    """Executa, em ordem, cada arquivo *.sql da pasta de migrações. Retorna os nomes aplicados."""
    aplicados: list[str] = []
    with psycopg.connect(get_settings().database_url) as conexao:
        for arquivo in sorted(PASTA_MIGRACOES.glob("*.sql")):
            with conexao.cursor() as cursor:
                cursor.execute(arquivo.read_text(encoding="utf-8"))
            aplicados.append(arquivo.name)
    return aplicados


if __name__ == "__main__":
    for nome in aplicar_migracoes():
        print(f"Migração aplicada: {nome}")

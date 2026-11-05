import psycopg

from app.config import get_settings


def check_database() -> dict[str, str]:
    """Testa a conexão com o PostgreSQL. Nunca lança exceção."""
    try:
        with psycopg.connect(get_settings().database_url, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return {"status": "ok", "message": "Conexão com o PostgreSQL funcionando."}
    except Exception as exc:  # erro de conexão, senha, banco inexistente etc.
        return {"status": "error", "message": f"Não foi possível conectar: {exc.__class__.__name__}"}

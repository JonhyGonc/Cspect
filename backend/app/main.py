from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import check_database

app = FastAPI(title="Cspect API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    """Informa o status da API e do banco. Responde 200 mesmo com o banco fora."""
    return {
        "api": {"status": "ok"},
        "database": check_database(),
    }

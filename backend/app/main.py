from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import check_database
from app.routers.auth import router as auth_router

app = FastAPI(title="Cspect API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.exception_handler(RequestValidationError)
async def erro_de_validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Igual ao padrão do FastAPI, mas sem devolver o valor enviado (ex.: a senha)."""
    erros = [{chave: valor for chave, valor in erro.items() if chave != "input"} for erro in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(erros)})


@app.get("/api/health")
def health() -> dict:
    """Informa o status da API e do banco. Responde 200 mesmo com o banco fora."""
    return {
        "api": {"status": "ok"},
        "database": check_database(),
    }

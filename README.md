# Cspect — Plataforma de Táticas de CS2

Plataforma web para criar, editar, organizar e compartilhar táticas de Counter-Strike 2.

A especificação completa está em [`docs/documentacao-plataforma-taticas-cs2-v4.md`](docs/documentacao-plataforma-taticas-cs2-v4.md).

**Status atual:** Fase 1 — estrutura base (frontend, backend e banco se comunicando).

## Pré-requisitos

- Node.js 20 ou superior
- Python 3.11 ou superior
- PostgreSQL 14 ou superior

## 1. Criar o banco de dados

Conecte-se ao PostgreSQL como superusuário e execute:

```sql
CREATE ROLE cspect WITH LOGIN PASSWORD 'troque-esta-senha';
CREATE DATABASE cspect OWNER cspect;
```

No Linux, por exemplo: `sudo -u postgres psql`. Troque `troque-esta-senha` por uma senha sua.

## 2. Configurar o backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # ajuste DATABASE_URL com a sua senha
uvicorn app.main:app --reload --port 8000
```

Teste: `curl http://localhost:8000/api/health`

## 3. Configurar o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. A página mostra o status da API e do banco.

## Verificações

- Com o banco ligado, a página mostra **API: ok** e **Banco: ok**.
- Com o banco desligado, a página mostra **Banco: erro** sem quebrar.
- Build do frontend: `npm run build` dentro de `frontend/`.

## Estrutura

```
cspect/
├── backend/        API em FastAPI
├── frontend/       Aplicação em React + TypeScript + Tailwind
└── docs/           Documentação de planejamento
```

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
python -m pip install -r requirements.txt
cp .env.example .env             # Windows: copy .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Use sempre `python -m uvicorn` (e não apenas `uvicorn`), para garantir que o servidor roda com as bibliotecas do ambiente virtual.

Teste: `curl http://localhost:8000/api/health` (no Windows, abra `http://localhost:8000/api/health` no navegador).

### Criar as tabelas (migrações)

Com o ambiente virtual ativo, a partir da pasta `backend/`:

```bash
python -m app.migrate
```

As migrações ficam em `backend/migrations/` e podem ser executadas mais de uma vez sem erro.

### Cadastro de usuário

`POST /api/auth/register` recebe `email`, `senha` (mínimo de 8 caracteres), `nome_exibicao` (1 a 40 caracteres), `aceite_termo` (precisa ser `true`) e `versao_termo`. Responde `201` com `id`, `email` e `nome_exibicao`, `409` se o e-mail já existir (sem diferenciar maiúsculas) e `422` para dados inválidos.

### Testes do backend

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest
```

Os testes que usam o banco gravam em `cspect_test`, e não no banco de desenvolvimento. Crie-o uma vez, dentro do `psql` (no Linux: `sudo -u postgres psql`; no Windows: SQL Shell (psql)):

```sql
CREATE DATABASE cspect_test OWNER cspect;
```

Para usar outro banco, defina `TEST_DATABASE_URL`. As tabelas desse banco (`usuarios`, `sessoes`, `funcoes`, `jogadores` e `jogador_funcoes_secundarias`) são apagadas e recriadas durante os testes.

### Problemas comuns no Windows

- **"A execução de scripts está desabilitada"** ao ativar o ambiente virtual ou rodar `npm`: rode `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, confirme com `S` e tente de novo.
- **`uvicorn` não reconhecido:** o ambiente virtual não está ativo. Confirme que o prompt mostra `(.venv)` antes de rodar os comandos.

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

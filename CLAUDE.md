# Cspect — instruções para o Claude neste repositório

Plataforma web para criar, editar e compartilhar táticas de Counter-Strike 2.

## Fonte da verdade

A especificação vigente é `docs/documentacao-plataforma-taticas-cs2-v4.md`. Antes de implementar qualquer tarefa, leia as seções indicadas pela tarefa. Se houver conflito entre o código e a documentação, pare e pergunte ao usuário. Não decida sozinho.

## Estado atual

- **Fase 1 (estrutura base):** concluída. Backend FastAPI, frontend React + TypeScript + Vite + Tailwind, PostgreSQL. Endpoint `GET /api/health`.
- **Fase 2 (cadastro e login):** concluída. `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Cookie de sessão `sessao` (HttpOnly, SameSite=Lax). Termo de uso em `frontend/src/conteudo/termo_uso.ts`, ainda como rascunho.
- **Fase 3 (jogadores):** backend concluído (T3.1). `GET /api/funcoes`, `GET/POST/PUT/DELETE /api/jogadores`. A tela no frontend (T3.2) está pendente.

## Estrutura

- `backend/app/`: código da API. `routers/` tem os endpoints. `main.py` registra os routers e o CORS.
- `backend/migrations/`: arquivos SQL numerados (`001_...`, `002_...`). A próxima é `004`.
- `backend/tests/`: testes pytest. Usam o banco `cspect_test`, nunca o banco de desenvolvimento.
- `frontend/src/`: `App.tsx` e `roteamento.tsx` (roteamento próprio, sem react-router), `paginas/`, `componentes/`, `api/` (chamadas ao backend), `conteudo/`.

## Regras

- **Nunca altere a `main` diretamente.** Cada tarefa vai numa branch `dev-<nome>` criada a partir da `main` atual.
- **Não faça merge na `main`.** Quem decide o merge é o usuário.
- **Migrações:** nunca altere uma migração já existente. Crie uma nova, com `CREATE ... IF NOT EXISTS`, para ela poder rodar de novo.
- **Testes:** rode `python -m pytest` em `backend/` antes de entregar. Os testes existentes não podem quebrar. Se algum falhar, corrija antes de enviar.
- **Frontend:** rode `npm run build` em `frontend/` antes de entregar. Requisições usam caminhos relativos (`/api/...`), nunca URLs absolutas.
- **Validação:** toda validação precisa existir no servidor, mesmo que também exista no navegador (RNF04).
- **Acesso aos dados:** um usuário só lê e altera os próprios dados. Dado de outro usuário responde 404 (RNF03).
- **Visual:** tema escuro, com a paleta da seção 9 da documentação. Sem logotipos ou nomes de marca da Valve.
- **Mensagens de erro:** em português, sem revelar detalhes internos (por exemplo, se um e-mail existe).
- **Segredos:** nunca grave senhas, tokens ou o arquivo `.env` no repositório. Use `.env.example` para novas variáveis.

## Entrega de cada tarefa

1. Crie a branch, implemente e rode os testes.
2. Faça o commit com uma mensagem clara em português.
3. Envie a branch com `git push -u origin <branch>`.
4. Relate: arquivos criados e alterados, resultado de cada critério de aceitação, decisões fora da especificação e o que não foi testado.

Se um passo não puder ser feito (por exemplo, falta de rede para instalar pacotes), diga isso claramente. Não declare a tarefa concluída sem ter rodado o que era possível.

-- Migração 002: tabela de sessões de login (documentação v4, RF01 e RNF05).
-- Guarda apenas o hash SHA-256 do token do cookie. O token em texto puro nunca é salvo.
-- Idempotente: pode ser executada várias vezes sem erro.

CREATE TABLE IF NOT EXISTS sessoes (
    id             BIGSERIAL PRIMARY KEY,
    usuario_id     BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash     TEXT NOT NULL UNIQUE,
    criada_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ultimo_uso_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_em      TIMESTAMPTZ NOT NULL
);

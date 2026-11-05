-- Migração 001: tabela de usuários (documentação v4, seção 11).
-- Idempotente: pode ser executada várias vezes sem erro.

CREATE TABLE IF NOT EXISTS usuarios (
    id               BIGSERIAL PRIMARY KEY,
    email            VARCHAR(254) NOT NULL,
    senha_hash       TEXT NOT NULL,
    nome_exibicao    VARCHAR(40) NOT NULL,
    papel            VARCHAR(20) NOT NULL DEFAULT 'comum'
                         CHECK (papel IN ('comum', 'administrador')),
    termo_versao     VARCHAR(20) NOT NULL,
    termo_aceito_em  TIMESTAMPTZ NOT NULL,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
    tentativas_login INTEGER NOT NULL DEFAULT 0 CHECK (tentativas_login >= 0),
    bloqueado_ate    TIMESTAMPTZ,
    status           VARCHAR(20) NOT NULL DEFAULT 'ativo'
                         CHECK (status IN ('ativo', 'excluido'))
);

-- E-mail único sem diferenciar maiúsculas de minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_unico ON usuarios (lower(email));

-- Migração 003: funções, jogadores e funções secundárias (documentação v4, RF04, RF05 e seção 11).
-- Idempotente: pode ser executada várias vezes sem erro.

-- Tabela de referência com a lista fixa de funções, preparada para crescer.
CREATE TABLE IF NOT EXISTS funcoes (
    id   SMALLINT PRIMARY KEY,
    nome VARCHAR(30) UNIQUE NOT NULL
);

INSERT INTO funcoes (id, nome) VALUES
    (1, 'Entry Fragger'),
    (2, 'AWPer'),
    (3, 'Lurker'),
    (4, 'Support'),
    (5, 'IGL'),
    (6, 'Anchor')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS jogadores (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nickname            VARCHAR(32) NOT NULL,
    avatar              VARCHAR(3) NOT NULL,
    funcao_principal_id SMALLINT NOT NULL REFERENCES funcoes(id),
    observacoes         VARCHAR(500) NOT NULL DEFAULT '',
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nickname único por usuário, sem diferenciar maiúsculas de minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS jogadores_nickname_unico ON jogadores (usuario_id, lower(nickname));

-- A regra "secundária diferente da principal" é validada no servidor (RNF04), em app/schemas.py.
CREATE TABLE IF NOT EXISTS jogador_funcoes_secundarias (
    jogador_id BIGINT REFERENCES jogadores(id) ON DELETE CASCADE,
    funcao_id  SMALLINT REFERENCES funcoes(id),
    PRIMARY KEY (jogador_id, funcao_id)
);

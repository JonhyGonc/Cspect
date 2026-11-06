-- Migração 004: táticas, quadros e posições de jogador no quadro
-- (documentação v4, RF08, RF08A, RF12, RF24 e seção 11). Só o plano fixo nesta etapa.
-- Idempotente: pode ser executada várias vezes sem erro.

-- usuario_id aceita NULL de propósito: na fase de publicação, a exclusão de conta (RF24)
-- vai desvincular as táticas públicas (autor "usuário desconhecido") antes de apagar o
-- usuário. O ON DELETE CASCADE remove só as que continuarem vinculadas (as privadas).
-- Hoje a API sempre grava o autor e toda tática é criada como privada.
CREATE TABLE IF NOT EXISTS taticas (
    id           BIGSERIAL PRIMARY KEY,
    usuario_id   BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
    mapa_id      VARCHAR(16) NOT NULL
                 CHECK (mapa_id IN ('ancient', 'anubis', 'cache', 'dust2', 'inferno', 'mirage', 'nuke')),
    nome         VARCHAR(60) NOT NULL,
    lado         VARCHAR(2) NOT NULL CHECK (lado IN ('T', 'CT')),
    visibilidade VARCHAR(8) NOT NULL DEFAULT 'privada' CHECK (visibilidade IN ('privada', 'publica')),
    criada_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
    alterada_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taticas_usuario ON taticas (usuario_id);

-- Quadro: um estado do campo. No plano fixo, sequencia_id e instante ficam vazios.
-- A FK de sequencia_id entra junto com a tabela de sequências, na fase da linha do tempo.
CREATE TABLE IF NOT EXISTS quadros (
    id           BIGSERIAL PRIMARY KEY,
    tatica_id    BIGINT NOT NULL REFERENCES taticas(id) ON DELETE CASCADE,
    sequencia_id BIGINT,
    instante     INTEGER,
    tipo         VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (tipo IN ('manual', 'automatica'))
);

-- Cada tática tem um único plano fixo (o quadro sem sequência).
CREATE UNIQUE INDEX IF NOT EXISTS quadros_plano_fixo_unico ON quadros (tatica_id) WHERE sequencia_id IS NULL;

-- jogador_id vira NULL quando o jogador é removido do elenco (RF08A): a posição fica
-- com a função e sem jogador.
CREATE TABLE IF NOT EXISTS posicoes_quadro (
    id         BIGSERIAL PRIMARY KEY,
    quadro_id  BIGINT NOT NULL REFERENCES quadros(id) ON DELETE CASCADE,
    jogador_id BIGINT REFERENCES jogadores(id) ON DELETE SET NULL,
    funcao_id  SMALLINT REFERENCES funcoes(id),
    x          DOUBLE PRECISION NOT NULL CHECK (x >= 0 AND x <= 1),
    y          DOUBLE PRECISION NOT NULL CHECK (y >= 0 AND y <= 1)
);

-- No máximo uma posição por jogador em cada quadro. Posições sem jogador (NULL) não conflitam.
CREATE UNIQUE INDEX IF NOT EXISTS posicoes_quadro_jogador_unico ON posicoes_quadro (quadro_id, jogador_id);
CREATE INDEX IF NOT EXISTS posicoes_quadro_jogador ON posicoes_quadro (jogador_id);

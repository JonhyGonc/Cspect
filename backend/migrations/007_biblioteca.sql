-- Migração 007: classificação das táticas e índices da biblioteca (documentação v4,
-- RF17, RF18, RF19 e seção 11). Idempotente: pode ser executada várias vezes sem erro.

-- Listas fixas do MVP (RF18), com ids fixos para os filtros e a API.
CREATE TABLE IF NOT EXISTS execucoes (
    id   SMALLINT PRIMARY KEY,
    nome VARCHAR(30) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS economias (
    id   SMALLINT PRIMARY KEY,
    nome VARCHAR(30) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS objetivos (
    id   SMALLINT PRIMARY KEY,
    nome VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO execucoes (id, nome) VALUES
    (1, 'Rush'), (2, 'Split'), (3, 'Exec'), (4, 'Fake'), (5, 'Default'), (6, 'Contact')
ON CONFLICT DO NOTHING;
INSERT INTO economias (id, nome) VALUES
    (1, 'Eco'), (2, 'Anti-eco'), (3, 'Force Buy'), (4, 'Half Buy'), (5, 'Full Buy')
ON CONFLICT DO NOTHING;
INSERT INTO objetivos (id, nome) VALUES
    (1, 'Map Control'), (2, 'Pick'), (3, 'Retake'), (4, 'Post-Plant'), (5, 'Lurk')
ON CONFLICT DO NOTHING;

-- Muitos para muitos: uma tática pode ter mais de uma opção em cada categoria (RF18).
-- Apagar a tática apaga as classificações dela.
CREATE TABLE IF NOT EXISTS taticas_execucoes (
    tatica_id   BIGINT NOT NULL REFERENCES taticas(id) ON DELETE CASCADE,
    execucao_id SMALLINT NOT NULL REFERENCES execucoes(id),
    PRIMARY KEY (tatica_id, execucao_id)
);
CREATE TABLE IF NOT EXISTS taticas_economias (
    tatica_id   BIGINT NOT NULL REFERENCES taticas(id) ON DELETE CASCADE,
    economia_id SMALLINT NOT NULL REFERENCES economias(id),
    PRIMARY KEY (tatica_id, economia_id)
);
CREATE TABLE IF NOT EXISTS taticas_objetivos (
    tatica_id   BIGINT NOT NULL REFERENCES taticas(id) ON DELETE CASCADE,
    objetivo_id SMALLINT NOT NULL REFERENCES objetivos(id),
    PRIMARY KEY (tatica_id, objetivo_id)
);

-- Índices da busca e dos filtros. A chave primária já atende "classificações da tática";
-- os índices invertidos atendem "táticas com esta classificação".
CREATE INDEX IF NOT EXISTS taticas_execucoes_execucao ON taticas_execucoes (execucao_id, tatica_id);
CREATE INDEX IF NOT EXISTS taticas_economias_economia ON taticas_economias (economia_id, tatica_id);
CREATE INDEX IF NOT EXISTS taticas_objetivos_objetivo ON taticas_objetivos (objetivo_id, tatica_id);
CREATE INDEX IF NOT EXISTS taticas_usuario_mapa_lado ON taticas (usuario_id, mapa_id, lado);
-- Busca por nome sem diferenciar maiúsculas (ILIKE sobre lower(nome)).
CREATE INDEX IF NOT EXISTS taticas_usuario_nome ON taticas (usuario_id, lower(nome));
-- Contagem de jogadores do plano fixo (quadro sem sequência).
CREATE INDEX IF NOT EXISTS quadros_plano_fixo ON quadros (tatica_id) WHERE sequencia_id IS NULL;

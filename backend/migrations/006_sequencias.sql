-- Migração 006: sequências animadas e linha do tempo (documentação v4, RF13, RF14, RF15,
-- Fluxo 4 e seção 11). Idempotente: pode ser executada várias vezes sem erro.
--
-- Uma sequência é um conjunto de marcações. Cada marcação é um quadro (o mesmo conceito
-- do plano fixo) com sequencia_id e instante preenchidos.

CREATE TABLE IF NOT EXISTS sequencias (
    id          BIGSERIAL PRIMARY KEY,
    tatica_id   BIGINT NOT NULL REFERENCES taticas(id) ON DELETE CASCADE,
    nome        VARCHAR(60) NOT NULL,
    origem      VARCHAR(5) NOT NULL CHECK (origem IN ('zero', 'plano')),
    criada_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    alterada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sequencias_tatica ON sequencias (tatica_id);

-- A FK que a migração 004 deixou para esta fase: apagar a sequência apaga as marcações.
-- Instante: tempo da marcação em milissegundos, sem negativos (vazio no plano fixo).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quadros_sequencia_fk') THEN
        ALTER TABLE quadros
            ADD CONSTRAINT quadros_sequencia_fk
            FOREIGN KEY (sequencia_id) REFERENCES sequencias(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quadros_instante_check') THEN
        ALTER TABLE quadros
            ADD CONSTRAINT quadros_instante_check CHECK (
                (sequencia_id IS NULL AND instante IS NULL)
                OR (sequencia_id IS NOT NULL AND instante IS NOT NULL AND instante >= 0)
            );
    END IF;
END
$$;

-- Uma marcação por instante em cada sequência.
CREATE UNIQUE INDEX IF NOT EXISTS quadros_sequencia_instante_unico
    ON quadros (sequencia_id, instante) WHERE sequencia_id IS NOT NULL;

-- Identidade do utilitário entre marcações (RF14): a mesma ref aparece em todas as
-- marcações em que o utilitário existe, e não se repete dentro de uma marcação.
-- No plano fixo fica vazia.
ALTER TABLE utilitarios_quadro ADD COLUMN IF NOT EXISTS ref VARCHAR(16);

CREATE UNIQUE INDEX IF NOT EXISTS utilitarios_quadro_ref_unica
    ON utilitarios_quadro (quadro_id, ref) WHERE ref IS NOT NULL;

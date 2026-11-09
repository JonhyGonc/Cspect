-- Migração 005: utilitários e traços no quadro (documentação v4, RF09, RF10, RF11 e seção 11).
-- Idempotente: pode ser executada várias vezes sem erro.
--
-- Pontos (trajetória e traço) ficam em JSONB, como lista de pares [x, y] normalizados
-- de 0 a 1 na orientação original do PNG. A API valida cada ponto (RNF04); o banco
-- confere só que é uma lista.

-- Utilitário no quadro: tipo, posição de impacto, trajetória opcional e duração.
-- A trajetória pertence ao próprio utilitário (coluna, não tabela): é a linha de arremesso
-- até o impacto, desenhada do ponto de lançamento até antes do impacto.
-- Duração em segundos: smoke 18 (valor a confirmar no jogo, as fontes divergem entre 18
-- e 20, RF11) e molotov 7. Flash e HE são um momento: duração NULL.
CREATE TABLE IF NOT EXISTS utilitarios_quadro (
    id         BIGSERIAL PRIMARY KEY,
    quadro_id  BIGINT NOT NULL REFERENCES quadros(id) ON DELETE CASCADE,
    tipo       VARCHAR(8) NOT NULL CHECK (tipo IN ('smoke', 'flash', 'molotov', 'he')),
    x          DOUBLE PRECISION NOT NULL CHECK (x >= 0 AND x <= 1),
    y          DOUBLE PRECISION NOT NULL CHECK (y >= 0 AND y <= 1),
    trajetoria JSONB CHECK (trajetoria IS NULL OR jsonb_typeof(trajetoria) = 'array'),
    duracao    SMALLINT CHECK (duracao IS NULL OR duracao > 0)
);

CREATE INDEX IF NOT EXISTS utilitarios_quadro_quadro ON utilitarios_quadro (quadro_id);

-- Traço (RF09): caminho de um jogador. jogador_id vira NULL quando o jogador é removido
-- do elenco (RF08A): o traço continua na tática, sem jogador.
-- Rascunho é o traço ainda não confirmado com "definir caminho"; também é salvo.
CREATE TABLE IF NOT EXISTS tracos (
    id         BIGSERIAL PRIMARY KEY,
    quadro_id  BIGINT NOT NULL REFERENCES quadros(id) ON DELETE CASCADE,
    jogador_id BIGINT REFERENCES jogadores(id) ON DELETE SET NULL,
    pontos     JSONB NOT NULL CHECK (jsonb_typeof(pontos) = 'array'),
    status     VARCHAR(10) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'confirmado'))
);

CREATE INDEX IF NOT EXISTS tracos_quadro ON tracos (quadro_id);
CREATE INDEX IF NOT EXISTS tracos_jogador ON tracos (jogador_id);

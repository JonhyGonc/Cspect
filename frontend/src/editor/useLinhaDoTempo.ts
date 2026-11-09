import { useCallback, useMemo, useRef, useState } from "react";
import type { SequenciaApi } from "../api/sequencias";
import { combinarEstados } from "../componentes/IndicadorSalvamento";
import { estadoNoInstante, faixasDeDuracao } from "./interpolacao";
import type { Plano } from "./plano";
import { aplicarAlteracao } from "./sequencias";
import type { EstadoSalvamento } from "./useGravacaoAdiada";
import { useReproducao } from "./useReproducao";
import { useSequencias } from "./useSequencias";

// Liga o editor à linha do tempo (RF13 a RF15).
//
// Com o plano fixo aberto, `plano` e `alterar` são os do plano fixo. Com uma sequência
// aberta, `plano` é o estado interpolado no instante atual (editor/interpolacao.ts) e cada
// alteração vale para esse instante: altera a marcação que está nele ou cria uma marcação
// automática (regras em editor/sequencias.ts). O plano fixo não muda.
// Também junta o estado de gravação da tática e de cada sequência num indicador só.

type Opcoes = {
  planoFixo: Plano;
  alterarPlano: (transformar: (atual: Plano) => Plano) => void;
  sequenciasIniciais: SequenciaApi[];
  idsDoElenco: Set<number>;
  salvamento: {
    estado: EstadoSalvamento;
    tentarDeNovo: () => void;
    garantirId: () => Promise<number | null>;
  };
};

export function useLinhaDoTempo({ planoFixo, alterarPlano, sequenciasIniciais, idsDoElenco, salvamento }: Opcoes) {
  const sequencias = useSequencias({
    iniciais: sequenciasIniciais,
    idsDoElenco,
    garantirTatica: salvamento.garantirId,
  });
  const marcacoes = sequencias.marcacoes;

  // A reprodução vai até a última marcação ou até o fim da última faixa de duração.
  const faixas = useMemo(() => (marcacoes ? faixasDeDuracao(marcacoes) : []), [marcacoes]);
  const fim = marcacoes
    ? Math.max(marcacoes[marcacoes.length - 1]?.instante ?? 0, ...faixas.map((f) => f.inicio + (f.duracao ?? 0)))
    : 0;
  // Régua com folga depois do fim, em múltiplos de 5 s (mínimo 10 s).
  const comprimento = Math.max(10_000, Math.ceil((fim + 3000) / 5000) * 5000);
  const reproducao = useReproducao(fim);
  const instanteRef = useRef(reproducao.instante);
  instanteRef.current = reproducao.instante;

  const plano = useMemo(
    () => (marcacoes ? estadoNoInstante(marcacoes, reproducao.instante) : planoFixo),
    [marcacoes, reproducao.instante, planoFixo],
  );
  const { pausar } = reproducao;
  const { alterar: alterarSequencia } = sequencias;
  const alterar = useCallback(
    (transformar: (atual: Plano) => Plano) => {
      if (!marcacoes) {
        alterarPlano(transformar);
        return;
      }
      // Editar durante a reprodução pausa e vale para o instante em que ela parou.
      pausar();
      const instante = Math.round(instanteRef.current);
      alterarSequencia((atuais) => aplicarAlteracao(atuais, instante, transformar));
    },
    [marcacoes, alterarPlano, alterarSequencia, pausar],
  );

  // Estado de gravação de cada sequência (GravadorSequencia), para o indicador único.
  const [gravacoes, setGravacoes] = useState<Record<number, { estado: EstadoSalvamento; tentar: () => void }>>({});
  const aoMudarGravacao = useCallback((id: number, estado: EstadoSalvamento, tentar: () => void) => {
    setGravacoes((atual) => ({ ...atual, [id]: { estado, tentar } }));
  }, []);
  const ativas = sequencias.info.map((info) => gravacoes[info.id]).filter((g) => g !== undefined);
  const estadoSalvamento = combinarEstados([salvamento.estado, ...ativas.map((g) => g.estado)]);
  const tentarDeNovo = () => {
    if (salvamento.estado.fase === "erro") salvamento.tentarDeNovo();
    ativas.filter((g) => g.estado.fase === "erro").forEach((g) => g.tentar());
  };

  return {
    sequencias,
    marcacoes,
    reproducao,
    fim,
    comprimento,
    plano,
    alterar,
    aoMudarGravacao,
    estadoSalvamento,
    tentarDeNovo,
  };
}

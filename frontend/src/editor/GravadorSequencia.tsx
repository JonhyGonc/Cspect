import { useEffect } from "react";
import { atualizarSequencia } from "../api/sequencias";
import type { Marcacao } from "./interpolacao";
import { marcacaoParaApi } from "./sequencias";
import { useGravacaoAdiada, type EstadoSalvamento } from "./useGravacaoAdiada";

type Props = {
  taticaId: number;
  sequenciaId: number;
  nome: string;
  marcacoes: Marcacao[];
  salvoEm: Date;
  aoMudarEstado: (sequenciaId: number, estado: EstadoSalvamento, tentarDeNovo: () => void) => void;
};

// Grava uma sequência em segundo plano (PUT próprio), com as mesmas regras do plano fixo:
// 1,5 s depois da última alteração e ao sair. Não desenha nada; informa o estado acima.
export function GravadorSequencia({ taticaId, sequenciaId, nome, marcacoes, salvoEm, aoMudarEstado }: Props) {
  const { estado, tentarDeNovo } = useGravacaoAdiada({
    dados: { nome: nome.trim(), marcacoes: marcacoes.map(marcacaoParaApi) },
    gravar: (dados, { keepalive }) => atualizarSequencia(taticaId, sequenciaId, dados, keepalive),
    validar: (dados) => (dados.nome ? null : "Dê um nome à sequência para salvar."),
    salvoEm,
  });

  useEffect(() => {
    aoMudarEstado(sequenciaId, estado, tentarDeNovo);
  }, [aoMudarEstado, sequenciaId, estado, tentarDeNovo]);

  return null;
}

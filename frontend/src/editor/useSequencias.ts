import { useCallback, useState } from "react";
import { criarSequencia, removerSequencia, type SequenciaApi } from "../api/sequencias";
import { mensagemDoErroTatica } from "../api/taticas";
import {
  criarHistorico,
  desfazer as desfazerPasso,
  podeDesfazer,
  podeRefazer,
  refazer as refazerPasso,
  registrar,
  type Historico,
} from "./historico";
import type { Marcacao } from "./interpolacao";
import { marcacaoDaApi, SEQUENCIAS_MAX } from "./sequencias";

// Sequências da tática (RF13) no estado da tela.
//
// Cada sequência tem o próprio histórico de desfazer (RF16), com as marcações. Trocar de
// sequência não é ação. Criar e apagar sequência vão direto ao servidor (POST e DELETE);
// as alterações das marcações são gravadas em segundo plano por GravadorSequencia.

export type InfoSequencia = { id: number; nome: string; origem: "zero" | "plano"; salvoEm: Date };

type Estado = {
  info: InfoSequencia[];
  historicos: Record<number, Historico<Marcacao[]>>;
};

function daApi(api: SequenciaApi, idsDoElenco: Set<number>) {
  return {
    info: { id: api.id, nome: api.nome, origem: api.origem, salvoEm: new Date(api.alterada_em) },
    historico: criarHistorico(api.marcacoes.map((m) => marcacaoDaApi(m, idsDoElenco))),
  };
}

type Opcoes = {
  iniciais: SequenciaApi[];
  idsDoElenco: Set<number>;
  // Garante que a tática existe no banco (grava o rascunho e o plano) e devolve o id.
  garantirTatica: () => Promise<number | null>;
};

export function useSequencias({ iniciais, idsDoElenco, garantirTatica }: Opcoes) {
  const [estado, setEstado] = useState<Estado>(() => {
    const convertidas = iniciais.map((s) => daApi(s, idsDoElenco));
    return {
      info: convertidas.map((c) => c.info),
      historicos: Object.fromEntries(convertidas.map((c) => [c.info.id, c.historico])),
    };
  });
  const [aberta, setAberta] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const historico = aberta !== null ? estado.historicos[aberta] : undefined;

  const alterar = useCallback(
    (transformar: (marcacoes: Marcacao[]) => Marcacao[]) => {
      if (aberta === null) return;
      setEstado((atual) => {
        const h = atual.historicos[aberta];
        if (!h) return atual;
        const novo = registrar(h, transformar(h.presente));
        return novo === h ? atual : { ...atual, historicos: { ...atual.historicos, [aberta]: novo } };
      });
    },
    [aberta],
  );

  const mover = useCallback(
    (passo: (h: Historico<Marcacao[]>) => Historico<Marcacao[]>) => {
      if (aberta === null) return;
      setEstado((atual) => {
        const h = atual.historicos[aberta];
        return h ? { ...atual, historicos: { ...atual.historicos, [aberta]: passo(h) } } : atual;
      });
    },
    [aberta],
  );
  const desfazer = useCallback(() => mover(desfazerPasso), [mover]);
  const refazer = useCallback(() => mover(refazerPasso), [mover]);

  async function criar(origem: "zero" | "plano") {
    if (estado.info.length >= SEQUENCIAS_MAX) {
      setErro(`Limite de ${SEQUENCIAS_MAX} sequências por tática.`);
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      // "Do plano" copia o plano fixo salvo: grava antes o que ainda estiver pendente.
      const id = await garantirTatica();
      if (id === null) {
        setErro("Não foi possível salvar a tática. Confira o nome e tente de novo.");
        return;
      }
      const nome = `Sequência ${estado.info.length + 1}`;
      const criada = daApi(await criarSequencia(id, nome, origem), idsDoElenco);
      setEstado((atual) => ({
        info: [...atual.info, criada.info],
        historicos: { ...atual.historicos, [criada.info.id]: criada.historico },
      }));
      setAberta(criada.info.id);
    } catch (falha) {
      setErro(mensagemDoErroTatica(falha));
    } finally {
      setOcupado(false);
    }
  }

  async function apagar(sequenciaId: number) {
    setOcupado(true);
    setErro(null);
    try {
      const id = await garantirTatica();
      if (id === null) return;
      await removerSequencia(id, sequenciaId);
      if (aberta === sequenciaId) setAberta(null);
      setEstado((atual) => {
        const historicos = { ...atual.historicos };
        delete historicos[sequenciaId];
        return { info: atual.info.filter((s) => s.id !== sequenciaId), historicos };
      });
    } catch (falha) {
      setErro(mensagemDoErroTatica(falha));
    } finally {
      setOcupado(false);
    }
  }

  // Renomear é gravado, mas não é ação do histórico (como o nome da tática).
  function renomear(sequenciaId: number, nome: string) {
    setEstado((atual) => ({ ...atual, info: atual.info.map((s) => (s.id === sequenciaId ? { ...s, nome } : s)) }));
  }

  return {
    info: estado.info,
    marcacoesDe: (id: number) => estado.historicos[id]?.presente ?? [],
    aberta,
    abrir: setAberta,
    marcacoes: historico?.presente ?? null,
    alterar,
    desfazer,
    refazer,
    podeDesfazer: historico ? podeDesfazer(historico) : false,
    podeRefazer: historico ? podeRefazer(historico) : false,
    criar,
    apagar,
    renomear,
    ocupado,
    erro,
  };
}

export type Sequencias = ReturnType<typeof useSequencias>;

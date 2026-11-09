import { useCallback, useRef, useState } from "react";
import { atualizarTatica, criarTatica, type DadosTatica } from "../api/taticas";
import { useGravacaoAdiada } from "./useGravacaoAdiada";

export { ATRASO_SALVAMENTO_MS, type EstadoSalvamento } from "./useGravacaoAdiada";

// Salvamento em segundo plano da tática e do plano fixo (RNF01).
//
// Rascunho: a tática só é criada (POST) na primeira gravação; depois, PUT. As regras de
// espera, saída e falha estão em useGravacaoAdiada. Desfazer e refazer não pedem nada ao
// servidor: se mudarem o estado, ele entra na mesma gravação adiada.

type Opcoes = {
  taticaId: number | null; // null = rascunho, ainda não existe no banco
  mapaId: string;
  dados: DadosTatica;
  salvoEm: Date | null;
  aoCriar: (id: number) => void;
};

export function useSalvamento({ taticaId, mapaId, dados, salvoEm, aoCriar }: Opcoes) {
  const idRef = useRef(taticaId);
  const [id, setId] = useState(taticaId);
  const aoCriarRef = useRef(aoCriar);
  aoCriarRef.current = aoCriar;

  const gravar = useCallback(
    async (enviar: DadosTatica, { keepalive }: { keepalive: boolean }) => {
      if (idRef.current === null) {
        const criada = await criarTatica(mapaId, enviar, keepalive);
        idRef.current = criada.id;
        if (!keepalive) {
          setId(criada.id);
          aoCriarRef.current(criada.id);
        }
      } else {
        await atualizarTatica(idRef.current, enviar, keepalive);
      }
    },
    [mapaId],
  );

  const gravacao = useGravacaoAdiada({
    dados,
    gravar,
    salvoEm,
    validar: (d) => (d.nome ? null : "Dê um nome à tática para salvar."),
    // A criação já está a caminho: não envia outro POST ao sair (duplicaria a tática).
    podeGravarNaSaida: (emAndamento) => !(emAndamento && idRef.current === null),
  });

  // Garante que a tática existe no banco com o estado atual (usado ao criar sequência):
  // grava o que estiver pendente e, num rascunho ainda intocado, cria a tática.
  const dadosRef = useRef(dados);
  dadosRef.current = dados;
  const { salvarAgora } = gravacao;
  const garantirId = useCallback(async (): Promise<number | null> => {
    if (!(await salvarAgora())) return null;
    if (idRef.current === null) {
      if (!dadosRef.current.nome) return null;
      await gravar(dadosRef.current, { keepalive: false });
    }
    return idRef.current;
  }, [salvarAgora, gravar]);

  return { ...gravacao, taticaId: id, garantirId };
}

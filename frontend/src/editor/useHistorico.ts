import { useCallback, useState } from "react";
import {
  criarHistorico,
  desfazer as desfazerPasso,
  podeDesfazer,
  podeRefazer,
  refazer as refazerPasso,
  registrar,
} from "./historico";

// Estado da tática com desfazer e refazer (RF16).
// `alterar` recebe uma função (estado atual -> novo estado) e grava o resultado
// como UMA ação no histórico. Devolver o mesmo objeto não grava nada.
export function useHistorico<T>(inicial: T) {
  const [historico, setHistorico] = useState(() => criarHistorico(inicial));

  const alterar = useCallback((transformar: (atual: T) => T) => {
    setHistorico((h) => registrar(h, transformar(h.presente)));
  }, []);

  const desfazer = useCallback(() => setHistorico(desfazerPasso), []);
  const refazer = useCallback(() => setHistorico(refazerPasso), []);

  return {
    estado: historico.presente,
    alterar,
    desfazer,
    refazer,
    podeDesfazer: podeDesfazer(historico),
    podeRefazer: podeRefazer(historico),
  };
}

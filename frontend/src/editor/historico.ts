// Histórico de desfazer e refazer do editor (RF16).
//
// Funções puras, sem React, para poderem ser testadas com `npm test`.
// Cada passo guarda o estado inteiro da tática (um retrato imutável), então
// desfazer volta exatamente ao estado anterior, seja qual for a ação.
// O hook que usa estas funções na tela fica em useHistorico.ts.

export const LIMITE_HISTORICO = 100;

export type Historico<T> = {
  passado: T[]; // mais antigo primeiro
  presente: T;
  futuro: T[]; // próximo a refazer primeiro
};

export function criarHistorico<T>(inicial: T): Historico<T> {
  return { passado: [], presente: inicial, futuro: [] };
}

// Registra uma ação nova: o estado atual vai para o passado e a pilha de refazer é limpa.
// Se a ação não mudou nada (mesmo objeto), o histórico fica como está.
// Acima do limite, o passo mais antigo é descartado.
export function registrar<T>(historico: Historico<T>, novo: T, limite: number = LIMITE_HISTORICO): Historico<T> {
  if (Object.is(novo, historico.presente)) return historico;
  const passado = [...historico.passado, historico.presente];
  if (passado.length > limite) passado.splice(0, passado.length - limite);
  return { passado, presente: novo, futuro: [] };
}

export function desfazer<T>(historico: Historico<T>): Historico<T> {
  if (historico.passado.length === 0) return historico;
  const anterior = historico.passado[historico.passado.length - 1];
  return {
    passado: historico.passado.slice(0, -1),
    presente: anterior,
    futuro: [historico.presente, ...historico.futuro],
  };
}

export function refazer<T>(historico: Historico<T>): Historico<T> {
  if (historico.futuro.length === 0) return historico;
  const [proximo, ...resto] = historico.futuro;
  return {
    passado: [...historico.passado, historico.presente],
    presente: proximo,
    futuro: resto,
  };
}

export function podeDesfazer<T>(historico: Historico<T>): boolean {
  return historico.passado.length > 0;
}

export function podeRefazer<T>(historico: Historico<T>): boolean {
  return historico.futuro.length > 0;
}

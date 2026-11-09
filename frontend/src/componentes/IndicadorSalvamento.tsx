import type { EstadoSalvamento } from "../editor/useSalvamento";

function horaCurta(data: Date): string {
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Indicador discreto do salvamento (RNF01).
export function IndicadorSalvamento({
  estado,
  aoTentarDeNovo,
}: {
  estado: EstadoSalvamento;
  aoTentarDeNovo: () => void;
}) {
  return (
    <div
      role="status"
      data-testid="salvamento"
      data-fase={estado.fase}
      className="flex shrink-0 items-center gap-2 text-sm"
    >
      {estado.fase === "rascunho" && <span className="opacity-60">Rascunho: salva na primeira alteração</span>}
      {estado.fase === "pendente" && <span className="opacity-60">Alterações não salvas</span>}
      {estado.fase === "salvando" && <span className="opacity-70">Salvando...</span>}
      {estado.fase === "salvo" && <span className="opacity-60">Salvo às {horaCurta(estado.em)}</span>}
      {estado.fase === "invalido" && <span className="text-destaque">{estado.mensagem}</span>}
      {estado.fase === "erro" && (
        <>
          <span className="text-red-400" title={estado.mensagem}>
            Não foi possível salvar
          </span>
          <button
            type="button"
            onClick={aoTentarDeNovo}
            className="rounded-md border border-white/10 px-2 py-1 text-xs font-semibold transition hover:border-destaque"
          >
            Tentar de novo
          </button>
        </>
      )}
    </div>
  );
}

// Prioridade do indicador quando a tática e as sequências gravam em separado.
const PRIORIDADE: Record<EstadoSalvamento["fase"], number> = {
  erro: 5,
  invalido: 4,
  salvando: 3,
  pendente: 2,
  salvo: 1,
  rascunho: 0,
};

export function combinarEstados(estados: EstadoSalvamento[]): EstadoSalvamento {
  return estados.reduce((a, b) => {
    if (PRIORIDADE[b.fase] !== PRIORIDADE[a.fase]) return PRIORIDADE[b.fase] > PRIORIDADE[a.fase] ? b : a;
    return a.fase === "salvo" && b.fase === "salvo" && b.em > a.em ? b : a;
  });
}

import { useEffect, useRef, type ReactNode } from "react";

type DialogoConfirmacaoProps = {
  titulo: string;
  children: ReactNode;
  rotuloConfirmar: string;
  rotuloConfirmando: string;
  confirmando: boolean;
  erro?: string | null;
  aoConfirmar: () => void;
  aoCancelar: () => void;
};

// Diálogo modal próprio. Não usa window.confirm, que trava a página e não segue o tema.
// O foco começa em "Cancelar" para que Enter não confirme por engano; Esc fecha.
export function DialogoConfirmacao({
  titulo,
  children,
  rotuloConfirmar,
  rotuloConfirmando,
  confirmando,
  erro,
  aoConfirmar,
  aoCancelar,
}: DialogoConfirmacaoProps) {
  const botaoCancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    botaoCancelar.current?.focus();
  }, []);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !confirmando) aoCancelar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoCancelar, confirmando]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-8"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !confirmando) aoCancelar();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby="dialogo-texto"
        className="w-full max-w-md rounded-lg border border-white/10 bg-painel p-6 shadow-xl"
      >
        <h2 id="dialogo-titulo" className="mb-3 text-lg font-bold">
          {titulo}
        </h2>
        <div id="dialogo-texto" className="flex flex-col gap-2 text-sm opacity-90">
          {children}
        </div>

        {erro && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {erro}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={botaoCancelar}
            type="button"
            onClick={aoCancelar}
            disabled={confirmando}
            className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold transition hover:border-destaque disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={confirmando}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmando ? rotuloConfirmando : rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

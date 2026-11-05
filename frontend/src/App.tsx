import { useEffect, useState } from "react";
import { fetchHealth, type HealthResponse } from "./api/health";

type State =
  | { phase: "loading" }
  | { phase: "done"; health: HealthResponse | null };

function StatusLine({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-painel px-4 py-3">
      <span className="font-medium">
        {label}: <span className={ok ? "text-destaque" : "text-red-400"}>{ok ? "ok" : "erro"}</span>
      </span>
      {detail && <span className="text-sm opacity-70">{detail}</span>}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    fetchHealth().then((health) => setState({ phase: "done", health }));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold text-destaque">Cspect</h1>
      <p className="opacity-80">Status da estrutura base da aplicação.</p>

      {state.phase === "loading" && <p className="opacity-70">Verificando serviços...</p>}

      {state.phase === "done" && state.health === null && (
        <StatusLine label="API" ok={false} detail="Backend indisponível" />
      )}

      {state.phase === "done" && state.health !== null && (
        <div className="flex flex-col gap-3">
          <StatusLine label="API" ok={state.health.api.status === "ok"} />
          <StatusLine
            label="Banco"
            ok={state.health.database.status === "ok"}
            detail={state.health.database.message}
          />
        </div>
      )}
    </main>
  );
}

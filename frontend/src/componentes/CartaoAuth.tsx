import type { ReactNode } from "react";

// Moldura comum às telas de cadastro e login: cartão centralizado no tema escuro.
export function CartaoAuth({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg bg-painel p-8 shadow-lg">
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-destaque">Cspect</p>
        <h1 className="mb-6 text-2xl font-bold">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}

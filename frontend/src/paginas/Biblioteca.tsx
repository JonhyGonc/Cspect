import { useEffect, useState } from "react";
import { mensagemDeErro, sair, usuarioAtual, type Usuario } from "../api/auth";
import { navegar } from "../roteamento";

type Estado =
  | { fase: "carregando" }
  | { fase: "pronto"; usuario: Usuario }
  | { fase: "erro"; mensagem: string };

// Placeholder da biblioteca. Só confere a sessão e mostra o usuário.
export function Biblioteca() {
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [saindo, setSaindo] = useState(false);
  const [erroSair, setErroSair] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    usuarioAtual()
      .then((usuario) => {
        if (cancelado) return;
        if (usuario === null) {
          // Sem sessão válida: volta para o login sem deixar /biblioteca no histórico.
          navegar("/login", { substituir: true });
          return;
        }
        setEstado({ fase: "pronto", usuario });
      })
      .catch((falha) => {
        if (!cancelado) setEstado({ fase: "erro", mensagem: mensagemDeErro(falha) });
      });

    return () => {
      cancelado = true;
    };
  }, []);

  async function aoSair() {
    if (saindo) return;
    setSaindo(true);
    setErroSair(null);
    try {
      await sair();
      navegar("/login");
    } catch (falha) {
      setErroSair(mensagemDeErro(falha));
      setSaindo(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between rounded-lg bg-painel px-6 py-4">
        <p className="text-lg font-bold text-destaque">Cspect</p>
        {estado.fase === "pronto" && (
          <div className="flex items-center gap-4">
            <span className="text-sm">
              Olá, <strong>{estado.usuario.nome_exibicao}</strong>
            </span>
            <button
              type="button"
              onClick={aoSair}
              disabled={saindo}
              className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque disabled:opacity-40"
            >
              {saindo ? "Saindo..." : "Sair"}
            </button>
          </div>
        )}
      </header>

      {estado.fase === "carregando" && <p className="opacity-70">Carregando...</p>}

      {estado.fase === "erro" && (
        <p role="alert" className="text-red-400">
          {estado.mensagem}
        </p>
      )}

      {estado.fase === "pronto" && (
        <section className="rounded-lg bg-painel p-8">
          <h1 className="mb-2 text-2xl font-bold">Biblioteca de táticas</h1>
          <p className="opacity-70">A biblioteca de táticas chega nas próximas etapas.</p>
        </section>
      )}

      {erroSair && (
        <p role="alert" className="text-sm text-red-400">
          {erroSair}
        </p>
      )}
    </main>
  );
}

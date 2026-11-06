import { useEffect, useState } from "react";
import { mensagemDeErro, usuarioAtual, type Usuario } from "../api/auth";
import { Cabecalho } from "../componentes/Cabecalho";
import { Link, navegar } from "../roteamento";

type Estado =
  | { fase: "carregando" }
  | { fase: "pronto"; usuario: Usuario }
  | { fase: "erro"; mensagem: string };

// Placeholder da biblioteca. Só confere a sessão e mostra o usuário.
export function Biblioteca() {
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });

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

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <Cabecalho usuario={estado.fase === "pronto" ? estado.usuario : null} ativa="biblioteca" />

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
          <p className="mt-4 text-sm">
            Enquanto isso, cadastre o seu elenco em{" "}
            <Link para="/jogadores" className="font-semibold text-destaque underline">
              Jogadores
            </Link>
            .
          </p>
        </section>
      )}
    </main>
  );
}

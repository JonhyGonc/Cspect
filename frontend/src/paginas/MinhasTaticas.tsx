import { useEffect, useState } from "react";
import { listarTaticas, mensagemDoErroTatica, statusDoErroTatica, type TaticaResumo } from "../api/taticas";
import { Cabecalho } from "../componentes/Cabecalho";
import { CartaoTatica, useNomesCartao } from "../componentes/CartaoTatica";
import { useSessao } from "../componentes/useSessao";
import { Link, navegar } from "../roteamento";

type Carga = { fase: "carregando" } | { fase: "pronto"; dados: TaticaResumo[] } | { fase: "erro"; mensagem: string };

// Minhas táticas (seção 8): todas as táticas do usuário, da alteração mais recente para a
// mais antiga, com o mesmo cartão da biblioteca. Nesta fase a biblioteca também mostra só
// as táticas do usuário; a diferença (públicas de outros usuários na biblioteca, rótulo de
// publicação aqui) chega com a publicação (RF20).
export function MinhasTaticas() {
  const sessao = useSessao();
  const nomes = useNomesCartao();
  const [taticas, setTaticas] = useState<Carga>({ fase: "carregando" });

  const logado = sessao.fase === "pronto";
  useEffect(() => {
    if (!logado) return;
    let cancelado = false;
    listarTaticas()
      .then((dados) => !cancelado && setTaticas({ fase: "pronto", dados }))
      .catch((falha) => {
        if (cancelado) return;
        if (statusDoErroTatica(falha) === 401) {
          navegar("/login", { substituir: true });
          return;
        }
        setTaticas({ fase: "erro", mensagem: mensagemDoErroTatica(falha) });
      });
    return () => {
      cancelado = true;
    };
  }, [logado]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-8">
      <Cabecalho usuario={sessao.fase === "pronto" ? sessao.usuario : null} ativa="minhas" />

      {sessao.fase === "carregando" && <p className="opacity-70">Carregando...</p>}
      {sessao.fase === "erro" && (
        <p role="alert" className="text-red-400">
          {sessao.mensagem}
        </p>
      )}

      {sessao.fase === "pronto" && (
        <section aria-labelledby="titulo-minhas" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg bg-painel p-6">
            <div>
              <h1 id="titulo-minhas" className="text-2xl font-bold">
                Minhas táticas
              </h1>
              <p className="text-sm opacity-70">Da alteração mais recente para a mais antiga.</p>
            </div>
            <Link
              para="/editor"
              className="rounded-md bg-destaque px-3 py-1.5 text-sm font-bold text-fundo transition hover:brightness-110"
            >
              Nova tática
            </Link>
          </div>

          {(taticas.fase === "carregando" || nomes === null) && <p className="opacity-70">Carregando táticas...</p>}
          {taticas.fase === "erro" && (
            <p role="alert" className="text-red-400">
              {taticas.mensagem}
            </p>
          )}
          {nomes === "erro" && (
            <p role="alert" className="text-red-400">
              Não foi possível carregar os nomes das classificações. Tente recarregar a página.
            </p>
          )}
          {taticas.fase === "pronto" && nomes && nomes !== "erro" && taticas.dados.length === 0 && (
            <p className="rounded-lg bg-painel p-6 opacity-70">
              Você ainda não tem táticas.{" "}
              <Link para="/editor" className="font-semibold text-destaque underline">
                Crie a primeira
              </Link>
              .
            </p>
          )}
          {taticas.fase === "pronto" && nomes && nomes !== "erro" && taticas.dados.length > 0 && (
            <ul className="grid grid-cols-3 gap-4" aria-label="Táticas">
              {taticas.dados.map((tatica) => (
                <li key={tatica.id}>
                  <CartaoTatica tatica={tatica} nomes={nomes} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

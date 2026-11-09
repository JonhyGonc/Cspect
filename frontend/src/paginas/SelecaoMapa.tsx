import { useEffect, useState } from "react";
import { listarTaticas, mensagemDoErroTatica, statusDoErroTatica, type TaticaResumo } from "../api/taticas";
import { Cabecalho } from "../componentes/Cabecalho";
import { useSessao } from "../componentes/useSessao";
import { MAPAS, mapaPorId } from "../editor/mapas";
import { Link, navegar } from "../roteamento";

type CargaTaticas =
  | { fase: "carregando" }
  | { fase: "pronto"; dados: TaticaResumo[] }
  | { fase: "erro"; mensagem: string };

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Seleção de mapa (RF07, Fluxo 3): escolhe um dos sete mapas do MVP e abre o editor com
// um rascunho. Abaixo, as táticas já salvas do usuário, para reabrir no editor.
export function SelecaoMapa() {
  const sessao = useSessao();
  const [taticas, setTaticas] = useState<CargaTaticas>({ fase: "carregando" });

  const logado = sessao.fase === "pronto";
  useEffect(() => {
    if (!logado) return;
    let cancelado = false;
    listarTaticas()
      .then((dados) => {
        if (!cancelado) setTaticas({ fase: "pronto", dados });
      })
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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <Cabecalho usuario={sessao.fase === "pronto" ? sessao.usuario : null} ativa="editor" />

      {sessao.fase === "carregando" && <p className="opacity-70">Carregando...</p>}
      {sessao.fase === "erro" && (
        <p role="alert" className="text-red-400">
          {sessao.mensagem}
        </p>
      )}

      {sessao.fase === "pronto" && (
        <>
          <section aria-labelledby="titulo-mapas" className="rounded-lg bg-painel p-8">
            <h1 id="titulo-mapas" className="mb-2 text-2xl font-bold">
              Nova tática
            </h1>
            <p className="mb-6 opacity-70">Escolha o mapa para abrir o editor.</p>
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-label="Mapas">
              {MAPAS.map((mapa) => (
                <li key={mapa.id}>
                  <Link
                    para={`/editor/${mapa.id}`}
                    className="flex h-24 items-center justify-center rounded-lg border border-white/10 bg-fundo text-lg font-bold transition hover:border-destaque hover:text-destaque"
                  >
                    {mapa.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="titulo-salvas" className="rounded-lg bg-painel p-8">
            <h2 id="titulo-salvas" className="mb-4 text-xl font-bold">
              Suas táticas
            </h2>
            {taticas.fase === "carregando" && <p className="opacity-70">Carregando...</p>}
            {taticas.fase === "erro" && (
              <p role="alert" className="text-red-400">
                {taticas.mensagem}
              </p>
            )}
            {taticas.fase === "pronto" && taticas.dados.length === 0 && (
              <p className="opacity-70">Nenhuma tática salva ainda.</p>
            )}
            {taticas.fase === "pronto" && taticas.dados.length > 0 && (
              <ul className="flex flex-col gap-2" aria-label="Táticas salvas">
                {taticas.dados.map((tatica) => (
                  <li key={tatica.id}>
                    <Link
                      para={`/taticas/${tatica.id}`}
                      className="flex items-center justify-between gap-4 rounded-md border border-white/5 bg-fundo px-4 py-3 transition hover:border-destaque"
                    >
                      <span className="min-w-0 truncate font-bold">{tatica.nome}</span>
                      <span className="shrink-0 text-sm opacity-70">
                        {mapaPorId(tatica.mapa_id)?.nome ?? tatica.mapa_id} ·{" "}
                        <span className={tatica.lado === "T" ? "text-time_t" : "text-time_ct"}>{tatica.lado}</span> ·
                        alterada em {dataCurta(tatica.alterada_em)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

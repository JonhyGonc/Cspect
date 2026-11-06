import { Cabecalho } from "../componentes/Cabecalho";
import { useSessao } from "../componentes/useSessao";
import { MAPAS } from "../editor/mapas";
import { Link } from "../roteamento";

// Seleção de mapa (RF07, Fluxo 3): escolhe um dos sete mapas do MVP e abre o editor.
export function SelecaoMapa() {
  const sessao = useSessao();

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
      )}
    </main>
  );
}

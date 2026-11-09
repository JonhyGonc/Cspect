import { useEffect, useState } from "react";
import { CATEGORIAS } from "../api/referencias";
import {
  listarTaticas,
  mensagemDoErroTatica,
  statusDoErroTatica,
  type FiltrosTaticas,
  type Lado,
  type TaticaResumo,
} from "../api/taticas";
import { Cabecalho } from "../componentes/Cabecalho";
import { CartaoTatica, useNomesCartao } from "../componentes/CartaoTatica";
import { useSessao } from "../componentes/useSessao";
import { MAPAS } from "../editor/mapas";
import { Link, navegar } from "../roteamento";

type Carga = { fase: "carregando" } | { fase: "pronto"; dados: TaticaResumo[] } | { fase: "erro"; mensagem: string };

const JOGADORES_MAX = 20;
const ATRASO_BUSCA_MS = 300;

const CHIP = "rounded-full border px-3 py-1 text-xs font-semibold transition";
const CHIP_ATIVO = "border-destaque bg-destaque text-fundo";
const CHIP_INATIVO = "border-white/10 hover:border-destaque";

function numeroOuNada(texto: string): number | undefined {
  if (texto.trim() === "") return undefined;
  const n = Number(texto);
  return Number.isInteger(n) ? Math.min(JOGADORES_MAX, Math.max(0, n)) : undefined;
}

// Biblioteca (RF17, RF18, Fluxo 6): táticas organizadas por mapa, com busca e filtros.
// Nesta fase mostra só as táticas do usuário; as públicas entram com a publicação (RF20).
export function Biblioteca() {
  const sessao = useSessao();
  const nomes = useNomesCartao();
  const [filtros, setFiltros] = useState<FiltrosTaticas>({});
  const [busca, setBusca] = useState("");
  const [minimo, setMinimo] = useState("");
  const [maximo, setMaximo] = useState("");
  const [taticas, setTaticas] = useState<Carga>({ fase: "carregando" });

  // A busca e a quantidade entram nos filtros com um pequeno atraso, para não consultar a
  // cada tecla.
  useEffect(() => {
    const espera = window.setTimeout(
      () =>
        setFiltros((atual) => ({
          ...atual,
          busca: busca.trim() || undefined,
          jogadores_min: numeroOuNada(minimo),
          jogadores_max: numeroOuNada(maximo),
        })),
      ATRASO_BUSCA_MS,
    );
    return () => window.clearTimeout(espera);
  }, [busca, minimo, maximo]);

  const logado = sessao.fase === "pronto";
  useEffect(() => {
    if (!logado) return;
    let cancelado = false;
    setTaticas((atual) => (atual.fase === "pronto" ? atual : { fase: "carregando" }));
    listarTaticas(filtros)
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
  }, [logado, filtros]);

  function alternar(chave: (typeof CATEGORIAS)[number]["chave"], id: number) {
    setFiltros((atual) => {
      const lista = atual[chave] ?? [];
      return { ...atual, [chave]: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] };
    });
  }

  function limpar() {
    setFiltros({});
    setBusca("");
    setMinimo("");
    setMaximo("");
  }

  const algumFiltro =
    Boolean(filtros.mapa_id || filtros.lado || busca || minimo || maximo) ||
    CATEGORIAS.some(({ chave }) => (filtros[chave]?.length ?? 0) > 0);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-8">
      <Cabecalho usuario={sessao.fase === "pronto" ? sessao.usuario : null} ativa="biblioteca" />

      {sessao.fase === "carregando" && <p className="opacity-70">Carregando...</p>}
      {sessao.fase === "erro" && (
        <p role="alert" className="text-red-400">
          {sessao.mensagem}
        </p>
      )}

      {sessao.fase === "pronto" && (
        <>
          <section aria-labelledby="titulo-biblioteca" className="flex flex-col gap-4 rounded-lg bg-painel p-6">
            <div className="flex items-center justify-between gap-4">
              <h1 id="titulo-biblioteca" className="text-2xl font-bold">
                Biblioteca
              </h1>
              <Link
                para="/editor"
                className="rounded-md bg-destaque px-3 py-1.5 text-sm font-bold text-fundo transition hover:brightness-110"
              >
                Nova tática
              </Link>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="opacity-70">Buscar pelo nome</span>
                <input
                  type="search"
                  value={busca}
                  maxLength={60}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Ex.: Retake B"
                  className="rounded-md border border-white/10 bg-fundo px-3 py-1.5 focus:border-destaque focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="opacity-70">Mapa</span>
                <select
                  value={filtros.mapa_id ?? ""}
                  onChange={(e) => setFiltros((a) => ({ ...a, mapa_id: e.target.value || undefined }))}
                  className="rounded-md border border-white/10 bg-fundo px-2 py-1.5"
                >
                  <option value="">Todos os mapas</option>
                  {MAPAS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1 text-sm">
                <span className="opacity-70">Lado</span>
                <div role="group" aria-label="Lado" className="flex overflow-hidden rounded-md border border-white/10">
                  {([undefined, "T", "CT"] as (Lado | undefined)[]).map((opcao) => (
                    <button
                      key={opcao ?? "todos"}
                      type="button"
                      aria-pressed={filtros.lado === opcao}
                      onClick={() => setFiltros((a) => ({ ...a, lado: opcao }))}
                      className={
                        "px-3 py-1.5 font-bold transition " +
                        (filtros.lado === opcao ? "bg-destaque text-fundo" : "opacity-70 hover:opacity-100")
                      }
                    >
                      {opcao ?? "Todos"}
                    </button>
                  ))}
                </div>
              </div>
              <fieldset className="flex flex-col gap-1 text-sm">
                <legend className="mb-1 opacity-70">Jogadores</legend>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={JOGADORES_MAX}
                    value={minimo}
                    onChange={(e) => setMinimo(e.target.value)}
                    aria-label="Quantidade mínima de jogadores"
                    placeholder="mín."
                    className="w-16 rounded-md border border-white/10 bg-fundo px-2 py-1.5"
                  />
                  <span className="opacity-50">a</span>
                  <input
                    type="number"
                    min={0}
                    max={JOGADORES_MAX}
                    value={maximo}
                    onChange={(e) => setMaximo(e.target.value)}
                    aria-label="Quantidade máxima de jogadores"
                    placeholder="máx."
                    className="w-16 rounded-md border border-white/10 bg-fundo px-2 py-1.5"
                  />
                </div>
              </fieldset>
              <button
                type="button"
                onClick={limpar}
                disabled={!algumFiltro}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque disabled:opacity-40"
              >
                Limpar filtros
              </button>
            </div>

            {nomes && nomes !== "erro" && (
              <div className="flex flex-col gap-2">
                {CATEGORIAS.map(({ chave, rotulo }) => (
                  <div key={chave} role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-20 text-sm opacity-70">{rotulo}</span>
                    {nomes.referencias[chave].map((item) => {
                      const ativo = filtros[chave]?.includes(item.id) ?? false;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={ativo}
                          onClick={() => alternar(chave, item.id)}
                          className={`${CHIP} ${ativo ? CHIP_ATIVO : CHIP_INATIVO}`}
                        >
                          {item.nome}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <p className="text-xs opacity-50">
                  Na mesma categoria, basta uma das opções marcadas; entre categorias, valem todas.
                </p>
              </div>
            )}
          </section>

          {(taticas.fase === "carregando" || nomes === null) && <p className="opacity-70">Carregando táticas...</p>}
          {taticas.fase === "erro" && (
            <p role="alert" className="text-red-400">
              {taticas.mensagem}
            </p>
          )}
          {nomes === "erro" && (
            <p role="alert" className="text-red-400">
              Não foi possível carregar os filtros. Tente recarregar a página.
            </p>
          )}

          {taticas.fase === "pronto" && nomes && nomes !== "erro" && (
            <ListaPorMapa taticas={taticas.dados} algumFiltro={algumFiltro} nomes={nomes} />
          )}
        </>
      )}
    </main>
  );
}

function ListaPorMapa({
  taticas,
  algumFiltro,
  nomes,
}: {
  taticas: TaticaResumo[];
  algumFiltro: boolean;
  nomes: Exclude<ReturnType<typeof useNomesCartao>, "erro" | null>;
}) {
  if (taticas.length === 0) {
    return (
      <p className="rounded-lg bg-painel p-6 opacity-70">
        {algumFiltro ? (
          "Nenhuma tática encontrada com esses filtros."
        ) : (
          <>
            Você ainda não tem táticas.{" "}
            <Link para="/editor" className="font-semibold text-destaque underline">
              Crie a primeira
            </Link>
            .
          </>
        )}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {MAPAS.map((mapa) => {
        const doMapa = taticas.filter((t) => t.mapa_id === mapa.id);
        if (doMapa.length === 0) return null;
        return (
          <section key={mapa.id} aria-labelledby={`mapa-${mapa.id}`} data-mapa={mapa.id}>
            <h2 id={`mapa-${mapa.id}`} className="mb-3 text-xl font-bold">
              {mapa.nome} <span className="text-sm font-normal opacity-60">({doMapa.length})</span>
            </h2>
            <ul className="grid grid-cols-3 gap-4">
              {doMapa.map((tatica) => (
                <li key={tatica.id}>
                  <CartaoTatica tatica={tatica} nomes={nomes} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

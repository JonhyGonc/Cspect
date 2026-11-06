import { useCallback, useEffect, useState, type DragEvent } from "react";
import { listarJogadores, mensagemDoErro, statusDoErro, type Jogador } from "../api/jogadores";
import { Avatar } from "../componentes/Avatar";
import { Cabecalho } from "../componentes/Cabecalho";
import { MapaEditor, TIPO_ARRASTE_JOGADOR, type Lado } from "../componentes/MapaEditor";
import { useSessao } from "../componentes/useSessao";
import { proximaRotacao, type Ponto, type Rotacao } from "../editor/coordenadas";
import { mapaPorId } from "../editor/mapas";
import { Link, navegar } from "../roteamento";

type Carga<T> = { fase: "carregando" } | { fase: "pronto"; dados: T } | { fase: "erro"; mensagem: string };

const LARGURA_MINIMA = 1280; // RNF10

function useLarguraJanela(): number {
  const [largura, setLargura] = useState(() => window.innerWidth);
  useEffect(() => {
    const atualizar = () => setLargura(window.innerWidth);
    window.addEventListener("resize", atualizar);
    return () => window.removeEventListener("resize", atualizar);
  }, []);
  return largura;
}

function formatar(valor: number): string {
  return valor.toFixed(4);
}

// Editor de tática, plano fixo (T4.1): mapa ao centro e elenco à esquerda (seção 8).
// As posições ficam só no estado da tela nesta etapa; o salvamento vem depois (RNF01).
export function Editor({ mapaId }: { mapaId: string }) {
  const sessao = useSessao();
  const mapa = mapaPorId(mapaId);
  const larguraJanela = useLarguraJanela();

  const [jogadores, setJogadores] = useState<Carga<Jogador[]>>({ fase: "carregando" });
  // Coordenadas normalizadas (0 a 1) em relação à orientação original do PNG, por id do jogador.
  const [posicoes, setPosicoes] = useState<Record<number, Ponto>>({});
  const [rotacao, setRotacao] = useState<Rotacao>(0);
  const [lado, setLado] = useState<Lado>("T");

  const carregarJogadores = useCallback(async () => {
    setJogadores({ fase: "carregando" });
    try {
      const lista = await listarJogadores();
      setJogadores({ fase: "pronto", dados: lista });
    } catch (falha) {
      if (statusDoErro(falha) === 401) {
        navegar("/login", { substituir: true });
        return;
      }
      setJogadores({ fase: "erro", mensagem: mensagemDoErro(falha) });
    }
  }, []);

  const logado = sessao.fase === "pronto";
  useEffect(() => {
    if (logado) void carregarJogadores();
  }, [logado, carregarJogadores]);

  const posicionar = useCallback((jogadorId: number, ponto: Ponto) => {
    setPosicoes((atual) => ({ ...atual, [jogadorId]: ponto }));
  }, []);

  function tirarDoMapa(jogadorId: number) {
    setPosicoes((atual) => {
      const copia = { ...atual };
      delete copia[jogadorId];
      return copia;
    });
  }

  const usuario = sessao.fase === "pronto" ? sessao.usuario : null;
  const lista = jogadores.fase === "pronto" ? jogadores.dados : [];

  return (
    <main className="flex h-screen min-w-0 flex-col gap-4 p-4">
      <Cabecalho usuario={usuario} ativa="editor" />

      {larguraJanela < LARGURA_MINIMA && (
        <p role="status" className="rounded-md bg-painel px-4 py-2 text-sm text-destaque">
          O editor foi feito para telas a partir de 1280 px de largura. Em telas menores, a experiência pode ficar
          limitada.
        </p>
      )}

      {sessao.fase === "carregando" && <p className="opacity-70">Carregando...</p>}
      {sessao.fase === "erro" && (
        <p role="alert" className="text-red-400">
          {sessao.mensagem}
        </p>
      )}

      {usuario && mapa === null && (
        <section className="rounded-lg bg-painel p-8">
          <h1 className="mb-2 text-2xl font-bold">Mapa não encontrado</h1>
          <p className="opacity-70">
            Escolha um dos mapas disponíveis em{" "}
            <Link para="/editor" className="font-semibold text-destaque underline">
              Nova tática
            </Link>
            .
          </p>
        </section>
      )}

      {usuario && mapa !== null && (
        <div className="flex min-h-0 flex-1 gap-4">
          <aside aria-labelledby="titulo-elenco" className="flex w-64 shrink-0 flex-col gap-3 rounded-lg bg-painel p-4">
            <h2 id="titulo-elenco" className="text-lg font-bold">
              Elenco
            </h2>
            <p className="text-xs opacity-60">Arraste um jogador para o mapa.</p>

            {jogadores.fase === "carregando" && <p className="text-sm opacity-70">Carregando jogadores...</p>}
            {jogadores.fase === "erro" && (
              <div className="flex flex-col items-start gap-2">
                <p role="alert" className="text-sm text-red-400">
                  {jogadores.mensagem}
                </p>
                <button
                  type="button"
                  onClick={() => void carregarJogadores()}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque"
                >
                  Tentar de novo
                </button>
              </div>
            )}
            {jogadores.fase === "pronto" && lista.length === 0 && (
              <p className="text-sm opacity-70">
                Nenhum jogador cadastrado.{" "}
                <Link para="/jogadores" className="font-semibold text-destaque underline">
                  Cadastre o elenco
                </Link>
                .
              </p>
            )}
            {lista.length > 0 && (
              <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" aria-label="Jogadores do elenco">
                {lista.map((jogador) => (
                  <ItemElenco
                    key={jogador.id}
                    jogador={jogador}
                    posicao={posicoes[jogador.id] ?? null}
                    aoTirar={() => tirarDoMapa(jogador.id)}
                  />
                ))}
              </ul>
            )}
          </aside>

          <section aria-label={`Mapa ${mapa.nome}`} className="flex min-w-0 flex-1 flex-col rounded-lg bg-painel">
            <div className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-3">
              <div className="flex items-baseline gap-3">
                <h1 className="text-xl font-bold">{mapa.nome}</h1>
                <Link para="/editor" className="text-sm opacity-70 underline hover:opacity-100">
                  Trocar mapa
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <div role="group" aria-label="Lado" className="flex overflow-hidden rounded-md border border-white/10">
                  {(["T", "CT"] as const).map((opcao) => (
                    <button
                      key={opcao}
                      type="button"
                      aria-pressed={lado === opcao}
                      onClick={() => setLado(opcao)}
                      className={
                        "px-3 py-1.5 text-sm font-bold transition " +
                        (lado === opcao
                          ? opcao === "T"
                            ? "bg-time_t text-fundo"
                            : "bg-time_ct text-fundo"
                          : "opacity-70 hover:opacity-100")
                      }
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRotacao(proximaRotacao)}
                  className="rounded-md bg-destaque px-3 py-1.5 text-sm font-bold text-fundo transition hover:brightness-110"
                >
                  Girar mapa <span data-testid="rotacao">({rotacao}°)</span>
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-2">
              <MapaEditor
                mapa={mapa}
                rotacao={rotacao}
                lado={lado}
                jogadores={lista}
                posicoes={posicoes}
                aoPosicionar={posicionar}
              />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

type ItemElencoProps = {
  jogador: Jogador;
  posicao: Ponto | null;
  aoTirar: () => void;
};

function ItemElenco({ jogador, posicao, aoTirar }: ItemElencoProps) {
  function aoComecarArraste(evento: DragEvent<HTMLLIElement>) {
    evento.dataTransfer.setData(TIPO_ARRASTE_JOGADOR, String(jogador.id));
    evento.dataTransfer.effectAllowed = "move";
  }

  return (
    <li
      draggable
      onDragStart={aoComecarArraste}
      aria-label={jogador.nickname}
      data-jogador-id={jogador.id}
      data-x={posicao ? formatar(posicao.x) : undefined}
      data-y={posicao ? formatar(posicao.y) : undefined}
      className="flex cursor-grab items-center gap-3 rounded-md border border-white/5 bg-fundo p-2 active:cursor-grabbing"
    >
      <Avatar iniciais={jogador.avatar} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold" title={jogador.nickname}>
          {jogador.nickname}
        </p>
        <p className="truncate text-xs opacity-60">{jogador.funcao_principal.nome}</p>
      </div>
      {posicao && (
        <button
          type="button"
          onClick={aoTirar}
          aria-label={`Tirar ${jogador.nickname} do mapa`}
          title="Tirar do mapa"
          className="shrink-0 rounded px-1.5 text-sm opacity-60 transition hover:text-red-400 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </li>
  );
}

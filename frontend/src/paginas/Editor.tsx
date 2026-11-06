import { useCallback, useEffect, useState, type DragEvent } from "react";
import {
  listarFuncoes,
  listarJogadores,
  mensagemDoErro,
  statusDoErro,
  type Funcao,
  type Jogador,
} from "../api/jogadores";
import { Avatar } from "../componentes/Avatar";
import { Cabecalho } from "../componentes/Cabecalho";
import { MapaEditor, TIPO_ARRASTE_JOGADOR, type Lado } from "../componentes/MapaEditor";
import { useSessao } from "../componentes/useSessao";
import { proximaRotacao, type Ponto, type Rotacao } from "../editor/coordenadas";
import { mapaPorId } from "../editor/mapas";
import { funcoesRepetidas, sugerirFuncoes, type Posicao } from "../editor/sugestao";
import { useHistorico } from "../editor/useHistorico";
import { Link, navegar } from "../roteamento";

type CargaElenco =
  | { fase: "carregando" }
  | { fase: "pronto"; dados: { jogadores: Jogador[]; funcoes: Funcao[] } }
  | { fase: "erro"; mensagem: string };

type Aviso = { tipo: "sucesso" | "atencao"; linhas: string[] };

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

// Atalhos de desfazer e refazer (RF16): Ctrl+Z desfaz; Ctrl+Y ou Ctrl+Shift+Z refaz
// (Cmd no macOS). Em campo de texto ou select, o atalho fica com o navegador.
function useAtalhosHistorico(desfazer: () => void, refazer: () => void) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!(evento.ctrlKey || evento.metaKey) || evento.altKey) return;
      const alvo = evento.target;
      if (
        alvo instanceof HTMLElement &&
        (alvo.isContentEditable || alvo.closest("input, textarea, select, [contenteditable]") !== null)
      ) {
        return;
      }
      const tecla = evento.key.toLowerCase();
      if (tecla === "z" && !evento.shiftKey) {
        evento.preventDefault();
        desfazer();
      } else if ((tecla === "y" && !evento.shiftKey) || (tecla === "z" && evento.shiftKey)) {
        evento.preventDefault();
        refazer();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [desfazer, refazer]);
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

  const [elenco, setElenco] = useState<CargaElenco>({ fase: "carregando" });
  // Por id do jogador: coordenadas normalizadas (0 a 1) em relação à orientação original
  // do PNG e a função usada nesta tática (RF08). Só no estado da tela nesta etapa.
  // Toda alteração passa pelo histórico (RF16): cada chamada de `alterar` é uma ação.
  const historico = useHistorico<Record<number, Posicao>>({});
  const { estado: posicoes, alterar } = historico;
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // Rotação e lado são só de visualização: ficam fora do histórico.
  const [rotacao, setRotacao] = useState<Rotacao>(0);
  const [lado, setLado] = useState<Lado>("T");

  // O aviso da sugestão descreve o estado em que foi dado; ao desfazer ou refazer, ele sai.
  const desfazer = useCallback(() => {
    setAviso(null);
    historico.desfazer();
  }, [historico.desfazer]);
  const refazer = useCallback(() => {
    setAviso(null);
    historico.refazer();
  }, [historico.refazer]);
  useAtalhosHistorico(desfazer, refazer);

  const carregarElenco = useCallback(async () => {
    setElenco({ fase: "carregando" });
    try {
      const [jogadores, funcoes] = await Promise.all([listarJogadores(), listarFuncoes()]);
      setElenco({ fase: "pronto", dados: { jogadores, funcoes } });
    } catch (falha) {
      if (statusDoErro(falha) === 401) {
        navegar("/login", { substituir: true });
        return;
      }
      setElenco({ fase: "erro", mensagem: mensagemDoErro(falha) });
    }
  }, []);

  const logado = sessao.fase === "pronto";
  useEffect(() => {
    if (logado) void carregarElenco();
  }, [logado, carregarElenco]);

  // Mover um jogador mantém a função dele na tática; quem entra no mapa chega sem função.
  // É chamado só no fim do arraste (drop do elenco ou dragEnd no mapa): um arraste = uma ação.
  const posicionar = useCallback(
    (jogadorId: number, ponto: Ponto) => {
      alterar((atual) => ({ ...atual, [jogadorId]: { ...ponto, funcaoId: atual[jogadorId]?.funcaoId ?? null } }));
    },
    [alterar],
  );

  // Tirar do mapa libera a função para uma nova sugestão.
  function tirarDoMapa(jogadorId: number) {
    setAviso(null);
    alterar((atual) => {
      if (!atual[jogadorId]) return atual;
      const copia = { ...atual };
      delete copia[jogadorId];
      return copia;
    });
  }

  // Troca a função só nesta tática; o cadastro do jogador não muda.
  function trocarFuncao(jogadorId: number, funcaoId: number | null) {
    setAviso(null);
    alterar((atual) =>
      atual[jogadorId] && atual[jogadorId].funcaoId !== funcaoId
        ? { ...atual, [jogadorId]: { ...atual[jogadorId], funcaoId } }
        : atual,
    );
  }

  const usuario = sessao.fase === "pronto" ? sessao.usuario : null;
  const lista = elenco.fase === "pronto" ? elenco.dados.jogadores : [];
  const funcoes = elenco.fase === "pronto" ? elenco.dados.funcoes : [];
  const nomesFuncoes = Object.fromEntries(funcoes.map((f) => [f.id, f.nome])) as Record<number, string>;
  const nickPorId = Object.fromEntries(lista.map((j) => [j.id, j.nickname])) as Record<number, string>;
  const repetidas = funcoesRepetidas(posicoes);
  const vazias = lista.filter((j) => posicoes[j.id]?.funcaoId === null).length;

  function sugerir() {
    const resultado = sugerirFuncoes(lista, posicoes);
    // O lote inteiro é uma ação só; sem nenhuma função sugerida, nada entra no histórico.
    if (resultado.sugeridas.length > 0) alterar(() => resultado.posicoes);
    const linhas: string[] = [];
    const n = resultado.sugeridas.length;
    linhas.push(n === 0 ? "Nenhuma função sugerida." : n === 1 ? "1 função sugerida." : `${n} funções sugeridas.`);
    for (const item of resultado.semSugestao) {
      linhas.push(
        `${nickPorId[item.jogadorId]} ficou sem função: ${nomesFuncoes[item.funcaoId] ?? "a função principal"} já está com ${nickPorId[item.ocupadaPor]}.`,
      );
    }
    setAviso({ tipo: resultado.semSugestao.length > 0 ? "atencao" : "sucesso", linhas });
  }

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

            {elenco.fase === "carregando" && <p className="text-sm opacity-70">Carregando jogadores...</p>}
            {elenco.fase === "erro" && (
              <div className="flex flex-col items-start gap-2">
                <p role="alert" className="text-sm text-red-400">
                  {elenco.mensagem}
                </p>
                <button
                  type="button"
                  onClick={() => void carregarElenco()}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque"
                >
                  Tentar de novo
                </button>
              </div>
            )}
            {elenco.fase === "pronto" && lista.length === 0 && (
              <p className="text-sm opacity-70">
                Nenhum jogador cadastrado.{" "}
                <Link para="/jogadores" className="font-semibold text-destaque underline">
                  Cadastre o elenco
                </Link>
                .
              </p>
            )}
            {lista.length > 0 && (
              <button
                type="button"
                onClick={sugerir}
                disabled={vazias === 0}
                title={
                  vazias === 0 ? "Coloque jogadores no mapa; a sugestão preenche quem está sem função." : undefined
                }
                className="rounded-md border border-destaque px-3 py-1.5 text-sm font-bold text-destaque transition hover:bg-destaque hover:text-fundo disabled:cursor-not-allowed disabled:border-white/10 disabled:text-texto disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Sugerir funções
              </button>
            )}
            {aviso && (
              <div
                role="status"
                className={
                  "rounded-md px-3 py-2 text-xs " +
                  (aviso.tipo === "atencao" ? "border border-destaque/40 bg-destaque/10" : "bg-fundo text-destaque")
                }
              >
                {aviso.linhas.map((linha) => (
                  <p key={linha}>{linha}</p>
                ))}
              </div>
            )}
            {lista.length > 0 && (
              <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" aria-label="Jogadores do elenco">
                {lista.map((jogador) => (
                  <ItemElenco
                    key={jogador.id}
                    jogador={jogador}
                    posicao={posicoes[jogador.id] ?? null}
                    funcoes={funcoes}
                    repetida={posicoes[jogador.id]?.funcaoId != null && repetidas.has(posicoes[jogador.id].funcaoId!)}
                    aoTrocarFuncao={(funcaoId) => trocarFuncao(jogador.id, funcaoId)}
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
                <div role="group" aria-label="Histórico" className="flex gap-1">
                  <button
                    type="button"
                    onClick={desfazer}
                    disabled={!historico.podeDesfazer}
                    title="Desfazer (Ctrl+Z)"
                    className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10"
                  >
                    Desfazer
                  </button>
                  <button
                    type="button"
                    onClick={refazer}
                    disabled={!historico.podeRefazer}
                    title="Refazer (Ctrl+Y ou Ctrl+Shift+Z)"
                    className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10"
                  >
                    Refazer
                  </button>
                </div>
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
                nomesFuncoes={nomesFuncoes}
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
  posicao: Posicao | null;
  funcoes: Funcao[];
  repetida: boolean;
  aoTrocarFuncao: (funcaoId: number | null) => void;
  aoTirar: () => void;
};

function ItemElenco({ jogador, posicao, funcoes, repetida, aoTrocarFuncao, aoTirar }: ItemElencoProps) {
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
      data-funcao-id={posicao?.funcaoId ?? undefined}
      className="flex cursor-grab flex-col gap-2 rounded-md border border-white/5 bg-fundo p-2 active:cursor-grabbing"
    >
      <div className="flex items-center gap-3">
        <Avatar iniciais={jogador.avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold" title={jogador.nickname}>
            {jogador.nickname}
          </p>
          <p className="truncate text-xs opacity-60" title={`Função principal: ${jogador.funcao_principal.nome}`}>
            Principal: {jogador.funcao_principal.nome}
          </p>
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
      </div>
      {posicao && (
        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-60">Função nesta tática</span>
          <select
            value={posicao.funcaoId ?? ""}
            onChange={(e) => aoTrocarFuncao(e.target.value === "" ? null : Number(e.target.value))}
            aria-label={`Função de ${jogador.nickname} nesta tática`}
            className={
              "rounded-md border bg-painel px-2 py-1 text-sm " +
              (posicao.funcaoId === null ? "border-white/10 opacity-70" : "border-destaque/60 text-destaque")
            }
          >
            <option value="">Sem função</option>
            {funcoes.map((funcao) => (
              <option key={funcao.id} value={funcao.id}>
                {funcao.nome}
              </option>
            ))}
          </select>
          {repetida && <span className="text-destaque">Outro jogador no mapa está com esta função.</span>}
        </label>
      )}
    </li>
  );
}

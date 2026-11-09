import { useCallback, useEffect, useState } from "react";
import {
  listarFuncoes,
  listarJogadores,
  mensagemDoErro,
  statusDoErro,
  type Funcao,
  type Jogador,
} from "../api/jogadores";
import {
  mensagemDoErroTatica,
  obterTatica,
  statusDoErroTatica,
  type DadosTatica,
  type Tatica,
  type Visibilidade,
} from "../api/taticas";
import { BarraUtilitarios } from "../componentes/BarraUtilitarios";
import { Cabecalho } from "../componentes/Cabecalho";
import { CamadaCaptura, CamadaPlano, MenuCaminho } from "../componentes/CamadaDesenho";
import { IndicadorSalvamento } from "../componentes/IndicadorSalvamento";
import { ItemElenco, ItemSemJogador } from "../componentes/ItensElenco";
import { COR_LADO, MapaEditor, type Lado } from "../componentes/MapaEditor";
import { useSessao } from "../componentes/useSessao";
import { proximaRotacao, type Ponto, type Rotacao } from "../editor/coordenadas";
import { mapaPorId, type Mapa } from "../editor/mapas";
import { PLANO_VAZIO, planoDaApi, planoParaApi, type Plano } from "../editor/plano";
import { funcoesRepetidas, sugerirFuncoes, type Posicao } from "../editor/sugestao";
import { useFerramentas, type Ferramentas } from "../editor/useFerramentas";
import { useHistorico } from "../editor/useHistorico";
import { useSalvamento } from "../editor/useSalvamento";
import { Link, navegar } from "../roteamento";

type Carga =
  | { fase: "carregando" }
  | { fase: "pronto"; jogadores: Jogador[]; funcoes: Funcao[]; tatica: Tatica | null }
  | { fase: "nao-encontrada" }
  | { fase: "erro"; mensagem: string };

type Aviso = { tipo: "sucesso" | "atencao"; linhas: string[] };

const LARGURA_MINIMA = 1280; // RNF10
const NOME_PADRAO = "Nova tática";
const NOME_MAX = 60;

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
function campoDeTexto(alvo: EventTarget | null): boolean {
  return (
    alvo instanceof HTMLElement &&
    (alvo.isContentEditable || alvo.closest("input, textarea, select, [contenteditable]") !== null)
  );
}

// Atalhos das ferramentas (fora de campos de texto e select):
// Delete ou Backspace apaga o item selecionado; Esc fecha o menu, sai do modo ou tira a
// seleção; Enter, no modo de caminho, grava o rascunho com "definir caminho" (RF09).
function useAtalhosFerramentas(f: Ferramentas) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.ctrlKey || evento.metaKey || evento.altKey || campoDeTexto(evento.target)) return;
      if (evento.key === "Delete" || evento.key === "Backspace") {
        if (!f.selecao) return;
        evento.preventDefault();
        f.apagar();
      } else if (evento.key === "Escape") {
        if (f.menu) f.setMenu(null);
        else if (f.modo.tipo !== "normal") f.sair();
        else f.setSelecao(null);
      } else if (evento.key === "Enter" && f.modo.tipo === "caminho") {
        const indice = f.tracoAtual();
        if (indice === null) return;
        evento.preventDefault();
        f.definirCaminho(indice);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [f]);
}

function useAtalhosHistorico(desfazer: () => void, refazer: () => void) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!(evento.ctrlKey || evento.metaKey) || evento.altKey) return;
      if (campoDeTexto(evento.target)) return;
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

// Página do editor (plano fixo). Duas entradas:
// - /editor/<mapa>: rascunho de tática nova, criada no banco só no primeiro salvamento;
// - /taticas/<id>: tática salva, reaberta com o plano fixo.
// Carrega a sessão, o elenco, as funções e, se for o caso, a tática; depois monta o editor.
export function Editor({ mapaId, taticaId }: { mapaId?: string; taticaId?: number }) {
  const sessao = useSessao();
  const larguraJanela = useLarguraJanela();
  const [carga, setCarga] = useState<Carga>({ fase: "carregando" });

  const carregar = useCallback(async () => {
    setCarga({ fase: "carregando" });
    if (taticaId !== undefined && !(taticaId > 0)) {
      setCarga({ fase: "nao-encontrada" });
      return;
    }
    try {
      const [jogadores, funcoes, tatica] = await Promise.all([
        listarJogadores(),
        listarFuncoes(),
        taticaId === undefined ? Promise.resolve(null) : obterTatica(taticaId),
      ]);
      setCarga({ fase: "pronto", jogadores, funcoes, tatica });
    } catch (falha) {
      if (statusDoErro(falha) === 401 || statusDoErroTatica(falha) === 401) {
        navegar("/login", { substituir: true });
        return;
      }
      if (statusDoErroTatica(falha) === 404) {
        setCarga({ fase: "nao-encontrada" });
        return;
      }
      const mensagem = statusDoErro(falha) !== null ? mensagemDoErro(falha) : mensagemDoErroTatica(falha);
      setCarga({ fase: "erro", mensagem });
    }
  }, [taticaId]);

  const logado = sessao.fase === "pronto";
  useEffect(() => {
    if (logado) void carregar();
  }, [logado, carregar]);

  const usuario = sessao.fase === "pronto" ? sessao.usuario : null;
  const mapa = carga.fase === "pronto" ? mapaPorId(carga.tatica ? carga.tatica.mapa_id : (mapaId ?? "")) : null;

  return (
    <main className="flex h-screen min-w-0 flex-col gap-4 p-4">
      <Cabecalho usuario={usuario} ativa="editor" />

      {larguraJanela < LARGURA_MINIMA && (
        <p role="status" className="rounded-md bg-painel px-4 py-2 text-sm text-destaque">
          O editor foi feito para telas a partir de 1280 px de largura. Em telas menores, a experiência pode ficar
          limitada.
        </p>
      )}

      {(sessao.fase === "carregando" || (usuario && carga.fase === "carregando")) && (
        <p className="opacity-70">Carregando...</p>
      )}
      {sessao.fase === "erro" && (
        <p role="alert" className="text-red-400">
          {sessao.mensagem}
        </p>
      )}

      {usuario && carga.fase === "erro" && (
        <section className="flex flex-col items-start gap-3 rounded-lg bg-painel p-8">
          <p role="alert" className="text-red-400">
            {carga.mensagem}
          </p>
          <button
            type="button"
            onClick={() => void carregar()}
            className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque"
          >
            Tentar de novo
          </button>
        </section>
      )}

      {usuario && (carga.fase === "nao-encontrada" || (carga.fase === "pronto" && mapa === null)) && (
        <section className="rounded-lg bg-painel p-8">
          <h1 className="mb-2 text-2xl font-bold">
            {carga.fase === "nao-encontrada" ? "Tática não encontrada" : "Mapa não encontrado"}
          </h1>
          <p className="opacity-70">
            Abra uma das suas táticas ou comece outra em{" "}
            <Link para="/editor" className="font-semibold text-destaque underline">
              Nova tática
            </Link>
            .
          </p>
        </section>
      )}

      {usuario && carga.fase === "pronto" && mapa !== null && (
        <AreaEditor mapa={mapa} jogadores={carga.jogadores} funcoes={carga.funcoes} tatica={carga.tatica} />
      )}
    </main>
  );
}

type AreaEditorProps = {
  mapa: Mapa;
  jogadores: Jogador[];
  funcoes: Funcao[];
  tatica: Tatica | null; // null = rascunho
};

// Editor de tática, plano fixo: mapa ao centro e elenco à esquerda (seção 8).
function AreaEditor({ mapa, jogadores: lista, funcoes, tatica }: AreaEditorProps) {
  // Plano fixo: posições por jogador e sem jogador (RF08, RF08A), utilitários (RF10) e
  // traços (RF09). Toda alteração passa pelo histórico (RF16): cada `alterar` é uma ação.
  const historico = useHistorico<Plano>(
    tatica
      ? planoDaApi(
          { posicoes: tatica.posicoes, utilitarios: tatica.utilitarios ?? [], tracos: tatica.tracos ?? [] },
          new Set(lista.map((j) => j.id)),
        )
      : PLANO_VAZIO,
  );
  const { estado: plano, alterar } = historico;
  const posicoes = plano.jogadores;
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // Nome, lado e visibilidade vão ao banco, mas ficam fora do histórico (como na T4.3).
  const [nome, setNome] = useState(tatica?.nome ?? NOME_PADRAO);
  const [lado, setLado] = useState<Lado>(tatica?.lado ?? "T");
  const [visibilidade, setVisibilidade] = useState<Visibilidade>(tatica?.visibilidade ?? "privada");
  // Rotação é só de visualização: fica fora do histórico e do banco.
  const [rotacao, setRotacao] = useState<Rotacao>(0);

  // Salvamento em segundo plano (RNF01). O histórico não vai ao banco, só o estado atual.
  const dados: DadosTatica = { nome: nome.trim(), lado, visibilidade, ...planoParaApi(plano) };
  const salvamento = useSalvamento({
    taticaId: tatica?.id ?? null,
    mapaId: mapa.id,
    dados,
    salvoEm: tatica ? new Date(tatica.alterada_em) : null,
    // Depois do primeiro salvamento, a URL passa a apontar para a tática salva. Sem
    // avisar o roteamento, para o editor não ser recriado (e o histórico, perdido).
    aoCriar: (id) => window.history.replaceState(null, "", `/taticas/${id}`),
  });

  // Utilitários e caminhos. O caminho é do jogador escolhido na barra; por padrão, o
  // primeiro do elenco que está no mapa.
  const jogadorPadrao = (lista.find((j) => plano.jogadores[j.id]) ?? lista[0])?.id ?? null;
  const ferramentas = useFerramentas({ plano, alterar, jogadorPadrao });
  useAtalhosFerramentas(ferramentas);
  const { limpar: limparFerramentas } = ferramentas;

  // O aviso da sugestão descreve o estado em que foi dado; ao desfazer ou refazer, ele sai,
  // junto com a seleção e o menu das ferramentas.
  const desfazer = useCallback(() => {
    setAviso(null);
    limparFerramentas();
    historico.desfazer();
  }, [historico.desfazer, limparFerramentas]);
  const refazer = useCallback(() => {
    setAviso(null);
    limparFerramentas();
    historico.refazer();
  }, [historico.refazer, limparFerramentas]);
  useAtalhosHistorico(desfazer, refazer);

  // Mover um jogador mantém a função dele na tática; quem entra no mapa chega sem função.
  // É chamado só no fim do arraste (drop do elenco ou dragEnd no mapa): um arraste = uma ação.
  const posicionar = useCallback(
    (jogadorId: number, ponto: Ponto) => {
      alterar((atual) => ({
        ...atual,
        jogadores: {
          ...atual.jogadores,
          [jogadorId]: { ...ponto, funcaoId: atual.jogadores[jogadorId]?.funcaoId ?? null },
        },
      }));
    },
    [alterar],
  );

  const moverSemJogador = useCallback(
    (indice: number, ponto: Ponto) => {
      alterar((atual) =>
        atual.semJogador[indice]
          ? {
              ...atual,
              semJogador: atual.semJogador.map((p, i) => (i === indice ? { ...p, ...ponto } : p)),
            }
          : atual,
      );
    },
    [alterar],
  );

  // Tirar do mapa libera a função para uma nova sugestão.
  function tirarDoMapa(jogadorId: number) {
    setAviso(null);
    alterar((atual) => {
      if (!atual.jogadores[jogadorId]) return atual;
      const copia = { ...atual.jogadores };
      delete copia[jogadorId];
      return { ...atual, jogadores: copia };
    });
  }

  // Troca a função só nesta tática; o cadastro do jogador não muda.
  function trocarFuncao(jogadorId: number, funcaoId: number | null) {
    setAviso(null);
    alterar((atual) =>
      atual.jogadores[jogadorId] && atual.jogadores[jogadorId].funcaoId !== funcaoId
        ? { ...atual, jogadores: { ...atual.jogadores, [jogadorId]: { ...atual.jogadores[jogadorId], funcaoId } } }
        : atual,
    );
  }

  function trocarFuncaoSemJogador(indice: number, funcaoId: number | null) {
    setAviso(null);
    alterar((atual) =>
      atual.semJogador[indice] && atual.semJogador[indice].funcaoId !== funcaoId
        ? { ...atual, semJogador: atual.semJogador.map((p, i) => (i === indice ? { ...p, funcaoId } : p)) }
        : atual,
    );
  }

  function tirarSemJogador(indice: number) {
    setAviso(null);
    alterar((atual) =>
      atual.semJogador[indice] ? { ...atual, semJogador: atual.semJogador.filter((_, i) => i !== indice) } : atual,
    );
  }

  const nomesFuncoes = Object.fromEntries(funcoes.map((f) => [f.id, f.nome])) as Record<number, string>;
  const nickPorId = Object.fromEntries(lista.map((j) => [j.id, j.nickname])) as Record<number, string>;
  const nomeDoJogador = (id: number | null) => (id !== null && nickPorId[id]) || "Sem jogador";
  // Posições sem jogador também contam para o aviso de função repetida (chaves negativas).
  const repetidas = funcoesRepetidas({
    ...posicoes,
    ...Object.fromEntries(plano.semJogador.map((p, i) => [-(i + 1), p])),
  });
  const vazias = lista.filter((j) => posicoes[j.id]?.funcaoId === null).length;

  function sugerir() {
    const resultado = sugerirFuncoes(lista, posicoes);
    // O lote inteiro é uma ação só; sem nenhuma função sugerida, nada entra no histórico.
    if (resultado.sugeridas.length > 0) alterar((atual) => ({ ...atual, jogadores: resultado.posicoes }));
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

  const ehRepetida = (posicao: Posicao | undefined) =>
    posicao !== undefined && posicao.funcaoId !== null && repetidas.has(posicao.funcaoId);

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <aside aria-labelledby="titulo-elenco" className="flex w-64 shrink-0 flex-col gap-3 rounded-lg bg-painel p-4">
        <h2 id="titulo-elenco" className="text-lg font-bold">
          Elenco
        </h2>
        <p className="text-xs opacity-60">Arraste um jogador para o mapa.</p>

        {lista.length === 0 && (
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
            title={vazias === 0 ? "Coloque jogadores no mapa; a sugestão preenche quem está sem função." : undefined}
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
        {(lista.length > 0 || plano.semJogador.length > 0) && (
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" aria-label="Jogadores do elenco">
            {lista.map((jogador) => (
              <ItemElenco
                key={jogador.id}
                jogador={jogador}
                posicao={posicoes[jogador.id] ?? null}
                funcoes={funcoes}
                repetida={ehRepetida(posicoes[jogador.id])}
                aoTrocarFuncao={(funcaoId) => trocarFuncao(jogador.id, funcaoId)}
                aoTirar={() => tirarDoMapa(jogador.id)}
              />
            ))}
            {plano.semJogador.map((posicao, indice) => (
              <ItemSemJogador
                key={`sem-jogador-${indice}`}
                numero={indice + 1}
                posicao={posicao}
                funcoes={funcoes}
                repetida={ehRepetida(posicao)}
                aoTrocarFuncao={(funcaoId) => trocarFuncaoSemJogador(indice, funcaoId)}
                aoTirar={() => tirarSemJogador(indice)}
              />
            ))}
          </ul>
        )}
      </aside>

      <section aria-label={`Mapa ${mapa.nome}`} className="flex min-w-0 flex-1 flex-col rounded-lg bg-painel">
        <div className="flex flex-col gap-2 border-b border-white/5 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <input
                type="text"
                value={nome}
                maxLength={NOME_MAX}
                onChange={(e) => setNome(e.target.value)}
                aria-label="Nome da tática"
                placeholder="Nome da tática"
                className="w-72 rounded-md border border-white/10 bg-fundo px-2 py-1 text-lg font-bold focus:border-destaque focus:outline-none"
              />
              <h1 className="shrink-0 text-sm font-semibold opacity-70">{mapa.nome}</h1>
              {tatica === null && (
                <Link para="/editor" className="shrink-0 text-sm opacity-70 underline hover:opacity-100">
                  Trocar mapa
                </Link>
              )}
            </div>
            <IndicadorSalvamento estado={salvamento.estado} aoTentarDeNovo={salvamento.tentarDeNovo} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="opacity-70">Visibilidade</span>
              <select
                value={visibilidade}
                onChange={(e) => setVisibilidade(e.target.value as Visibilidade)}
                aria-label="Visibilidade"
                className="rounded-md border border-white/10 bg-fundo px-2 py-1"
              >
                <option value="privada">Privada</option>
                <option value="publica" disabled>
                  Pública (em breve)
                </option>
              </select>
              <span className="text-xs opacity-50">A publicação chega numa fase seguinte.</span>
            </label>
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
        </div>
        <BarraUtilitarios ferramentas={ferramentas} plano={plano} jogadores={lista} nomeDoJogador={nomeDoJogador} />
        <div className="min-h-0 flex-1 p-2">
          <MapaEditor
            mapa={mapa}
            rotacao={rotacao}
            lado={lado}
            jogadores={lista}
            posicoes={posicoes}
            semJogador={plano.semJogador}
            nomesFuncoes={nomesFuncoes}
            aoPosicionar={posicionar}
            aoMoverSemJogador={moverSemJogador}
            interativo={ferramentas.modo.tipo === "normal"}
            aoClicarFundo={() => {
              ferramentas.setSelecao(null);
              ferramentas.setMenu(null);
            }}
            camadasAbaixo={(contexto) => (
              <CamadaPlano
                contexto={contexto}
                utilitarios={plano.utilitarios}
                tracos={plano.tracos}
                selecao={ferramentas.selecao}
                interativo={ferramentas.modo.tipo === "normal"}
                corTraco={COR_LADO[lado]}
                nomeDoJogador={nomeDoJogador}
                aoSelecionar={ferramentas.setSelecao}
                aoMoverUtilitario={ferramentas.moverUtilitario}
                aoMenuTraco={ferramentas.abrirMenu}
              />
            )}
            camadasAcima={(contexto) =>
              ferramentas.modo.tipo !== "normal" ? (
                <CamadaCaptura
                  contexto={contexto}
                  modo={ferramentas.modo}
                  cor={COR_LADO[lado]}
                  aoColocar={ferramentas.colocar}
                  aoFinalizarDesenho={(pontos) => {
                    const modo = ferramentas.modo;
                    if (modo.tipo === "caminho") ferramentas.finalizarTraco(pontos);
                    else if (modo.tipo === "trajetoria") ferramentas.definirTrajetoria(modo.indice, pontos);
                  }}
                  aoMenuFundo={(tela) => {
                    if (ferramentas.modo.tipo === "caminho") ferramentas.abrirMenu(ferramentas.tracoAtual(), tela);
                  }}
                />
              ) : null
            }
            sobreposicao={
              ferramentas.menu && plano.tracos[ferramentas.menu.indice] ? (
                <MenuCaminho
                  tela={ferramentas.menu.tela}
                  traco={plano.tracos[ferramentas.menu.indice]}
                  aoDefinir={() => ferramentas.definirCaminho(ferramentas.menu!.indice)}
                  aoApagar={() => ferramentas.apagar({ tipo: "traco", indice: ferramentas.menu!.indice })}
                  aoFechar={() => ferramentas.setMenu(null)}
                />
              ) : null
            }
          />
        </div>
      </section>
    </div>
  );
}

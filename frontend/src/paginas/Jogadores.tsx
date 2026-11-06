import { useCallback, useEffect, useState } from "react";
import { mensagemDeErro, usuarioAtual, type Usuario } from "../api/auth";
import {
  atualizarJogador,
  criarJogador,
  listarFuncoes,
  listarJogadores,
  mensagemDoErro,
  removerJogador,
  statusDoErro,
  type DadosJogador,
  type Funcao,
  type Jogador,
} from "../api/jogadores";
import { Avatar } from "../componentes/Avatar";
import { Cabecalho } from "../componentes/Cabecalho";
import { DialogoConfirmacao } from "../componentes/DialogoConfirmacao";
import { FormularioJogador } from "../componentes/FormularioJogador";
import { navegar } from "../roteamento";

type Carga<T> = { fase: "carregando" } | { fase: "pronto"; dados: T } | { fase: "erro"; mensagem: string };

type Aviso = { tipo: "sucesso" | "erro"; texto: string };

// Mesma ordem do backend (lower(nickname), id), para a lista não pular ao recarregar.
function ordenar(lista: Jogador[]): Jogador[] {
  return [...lista].sort((a, b) => {
    const pa = a.nickname.toLowerCase();
    const pb = b.nickname.toLowerCase();
    if (pa !== pb) return pa < pb ? -1 : 1;
    return a.id - b.id;
  });
}

function voltarAoLogin() {
  navegar("/login", { substituir: true });
}

// Área de jogadores (RF04, Fluxo 2): lista do elenco e formulário de cadastro e edição.
export function Jogadores() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [erroSessao, setErroSessao] = useState<string | null>(null);
  const [funcoes, setFuncoes] = useState<Carga<Funcao[]>>({ fase: "carregando" });
  const [jogadores, setJogadores] = useState<Carga<Jogador[]>>({ fase: "carregando" });

  const [emEdicao, setEmEdicao] = useState<Jogador | null>(null);
  // Muda a cada envio bem-sucedido ou cancelamento, para o formulário recomeçar limpo.
  const [versaoFormulario, setVersaoFormulario] = useState(0);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const [paraRemover, setParaRemover] = useState<Jogador | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [erroRemocao, setErroRemocao] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setFuncoes({ fase: "carregando" });
    setJogadores({ fase: "carregando" });

    const [resFuncoes, resJogadores] = await Promise.allSettled([listarFuncoes(), listarJogadores()]);

    if (resJogadores.status === "rejected" && statusDoErro(resJogadores.reason) === 401) {
      voltarAoLogin();
      return;
    }
    setFuncoes(
      resFuncoes.status === "fulfilled"
        ? { fase: "pronto", dados: resFuncoes.value }
        : { fase: "erro", mensagem: mensagemDoErro(resFuncoes.reason) },
    );
    setJogadores(
      resJogadores.status === "fulfilled"
        ? { fase: "pronto", dados: ordenar(resJogadores.value) }
        : { fase: "erro", mensagem: mensagemDoErro(resJogadores.reason) },
    );
  }, []);

  useEffect(() => {
    let cancelado = false;

    usuarioAtual()
      .then((atual) => {
        if (cancelado) return;
        if (atual === null) {
          // Sem sessão válida: volta para o login sem deixar /jogadores no histórico.
          voltarAoLogin();
          return;
        }
        setUsuario(atual);
        void carregarDados();
      })
      .catch((falha) => {
        if (!cancelado) setErroSessao(mensagemDeErro(falha));
      });

    return () => {
      cancelado = true;
    };
  }, [carregarDados]);

  function recomecarFormulario() {
    setEmEdicao(null);
    setVersaoFormulario((v) => v + 1);
  }

  function atualizarLista(transformar: (lista: Jogador[]) => Jogador[]) {
    setJogadores((atual) => (atual.fase === "pronto" ? { fase: "pronto", dados: ordenar(transformar(atual.dados)) } : atual));
  }

  // Chamado pelo formulário. Erros 409, 422 e 503 voltam para o formulário mostrar;
  // 401 e 404 são tratados aqui, porque mudam a tela inteira.
  async function salvar(dados: DadosJogador) {
    const alvo = emEdicao;
    try {
      if (alvo === null) {
        const criado = await criarJogador(dados);
        atualizarLista((lista) => [...lista, criado]);
        setAviso({ tipo: "sucesso", texto: `Jogador ${criado.nickname} cadastrado.` });
      } else {
        const atualizado = await atualizarJogador(alvo.id, dados);
        atualizarLista((lista) => lista.map((j) => (j.id === atualizado.id ? atualizado : j)));
        setAviso({ tipo: "sucesso", texto: `Alterações em ${atualizado.nickname} salvas.` });
      }
      recomecarFormulario();
    } catch (falha) {
      const status = statusDoErro(falha);
      if (status === 401) {
        voltarAoLogin();
        return;
      }
      if (status === 404 && alvo !== null) {
        atualizarLista((lista) => lista.filter((j) => j.id !== alvo.id));
        setAviso({ tipo: "erro", texto: mensagemDoErro(falha) });
        recomecarFormulario();
        return;
      }
      throw falha;
    }
  }

  function iniciarEdicao(jogador: Jogador) {
    setAviso(null);
    setEmEdicao(jogador);
    setVersaoFormulario((v) => v + 1);
  }

  function pedirRemocao(jogador: Jogador) {
    setErroRemocao(null);
    setParaRemover(jogador);
  }

  const cancelarRemocao = useCallback(() => {
    setParaRemover(null);
    setErroRemocao(null);
  }, []);

  async function confirmarRemocao() {
    if (paraRemover === null || removendo) return;
    const alvo = paraRemover;
    setRemovendo(true);
    setErroRemocao(null);
    try {
      await removerJogador(alvo.id);
      concluirRemocao(alvo, `Jogador ${alvo.nickname} removido.`, "sucesso");
    } catch (falha) {
      const status = statusDoErro(falha);
      if (status === 401) {
        voltarAoLogin();
        return;
      }
      if (status === 404) {
        // Já não existe: some da lista do mesmo jeito.
        concluirRemocao(alvo, mensagemDoErro(falha), "erro");
        return;
      }
      setErroRemocao(mensagemDoErro(falha));
    } finally {
      setRemovendo(false);
    }
  }

  function concluirRemocao(alvo: Jogador, texto: string, tipo: Aviso["tipo"]) {
    atualizarLista((lista) => lista.filter((j) => j.id !== alvo.id));
    if (emEdicao?.id === alvo.id) recomecarFormulario();
    setParaRemover(null);
    setAviso({ tipo, texto });
  }

  const quantidade = jogadores.fase === "pronto" ? jogadores.dados.length : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-8">
      <Cabecalho usuario={usuario} ativa="jogadores" />

      {usuario === null && erroSessao === null && <p className="opacity-70">Carregando...</p>}

      {erroSessao && (
        <p role="alert" className="text-red-400">
          {erroSessao}
        </p>
      )}

      {usuario && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <section aria-labelledby="titulo-lista" className="flex flex-col gap-4 rounded-lg bg-painel p-6">
            <div className="flex items-baseline justify-between">
              <h1 id="titulo-lista" className="text-2xl font-bold">
                Jogadores
              </h1>
              {quantidade !== null && (
                <span className="text-sm opacity-70">
                  {quantidade} {quantidade === 1 ? "jogador" : "jogadores"}
                </span>
              )}
            </div>

            {aviso && (
              <p
                role={aviso.tipo === "erro" ? "alert" : "status"}
                className={
                  "rounded-md px-4 py-3 text-sm " +
                  (aviso.tipo === "erro" ? "border border-red-400/40 bg-red-400/10 text-red-400" : "bg-fundo text-destaque")
                }
              >
                {aviso.texto}
              </p>
            )}

            {jogadores.fase === "carregando" && <p className="opacity-70">Carregando jogadores...</p>}

            {jogadores.fase === "erro" && (
              <div className="flex flex-col items-start gap-3">
                <p role="alert" className="text-red-400">
                  {jogadores.mensagem}
                </p>
                <BotaoTentarDeNovo aoClicar={() => void carregarDados()} />
              </div>
            )}

            {jogadores.fase === "pronto" && jogadores.dados.length === 0 && (
              <p className="rounded-md border border-dashed border-white/10 px-4 py-8 text-center opacity-70">
                Nenhum jogador cadastrado ainda. Use o formulário para cadastrar o primeiro.
              </p>
            )}

            {jogadores.fase === "pronto" && jogadores.dados.length > 0 && (
              <ul className="grid gap-4 md:grid-cols-2" aria-label="Lista de jogadores">
                {jogadores.dados.map((jogador) => (
                  <CartaoJogador
                    key={jogador.id}
                    jogador={jogador}
                    emEdicao={emEdicao?.id === jogador.id}
                    aoEditar={() => iniciarEdicao(jogador)}
                    aoRemover={() => pedirRemocao(jogador)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Formulário de jogador" className="rounded-lg bg-painel p-6 xl:sticky xl:top-8">
            {funcoes.fase === "carregando" && <p className="opacity-70">Carregando funções...</p>}
            {funcoes.fase === "erro" && (
              <div className="flex flex-col items-start gap-3">
                <p role="alert" className="text-red-400">
                  Não foi possível carregar as funções. {funcoes.mensagem}
                </p>
                <BotaoTentarDeNovo aoClicar={() => void carregarDados()} />
              </div>
            )}
            {funcoes.fase === "pronto" && (
              <FormularioJogador
                key={`${emEdicao?.id ?? "novo"}-${versaoFormulario}`}
                funcoes={funcoes.dados}
                jogador={emEdicao}
                aoEnviar={salvar}
                aoCancelar={recomecarFormulario}
              />
            )}
          </section>
        </div>
      )}

      {paraRemover && (
        <DialogoConfirmacao
          titulo={`Remover ${paraRemover.nickname}?`}
          rotuloConfirmar="Remover jogador"
          rotuloConfirmando="Removendo..."
          confirmando={removendo}
          erro={erroRemocao}
          aoConfirmar={() => void confirmarRemocao()}
          aoCancelar={cancelarRemocao}
        >
          <p>O jogador sai do seu elenco. Esta ação não pode ser desfeita.</p>
          <p className="opacity-80">As táticas que usam este jogador são mantidas: a posição fica com a função, sem jogador.</p>
        </DialogoConfirmacao>
      )}
    </main>
  );
}

function BotaoTentarDeNovo({ aoClicar }: { aoClicar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque"
    >
      Tentar de novo
    </button>
  );
}

type CartaoJogadorProps = {
  jogador: Jogador;
  emEdicao: boolean;
  aoEditar: () => void;
  aoRemover: () => void;
};

function CartaoJogador({ jogador, emEdicao, aoEditar, aoRemover }: CartaoJogadorProps) {
  return (
    <li
      aria-label={jogador.nickname}
      className={
        "flex flex-col gap-3 rounded-lg border bg-fundo p-4 transition " +
        (emEdicao ? "border-destaque" : "border-white/5")
      }
    >
      <div className="flex items-start gap-3">
        <Avatar iniciais={jogador.avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold" title={jogador.nickname}>
            {jogador.nickname}
          </p>
          <p className="text-sm">
            <span className="opacity-60">Principal: </span>
            <span className="font-semibold text-destaque">{jogador.funcao_principal.nome}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="opacity-60">Secundárias:</span>
        {jogador.funcoes_secundarias.length === 0 ? (
          <span className="opacity-60">nenhuma</span>
        ) : (
          jogador.funcoes_secundarias.map((funcao) => (
            <span key={funcao.id} className="rounded-full border border-white/10 bg-painel px-2 py-0.5">
              {funcao.nome}
            </span>
          ))
        )}
      </div>

      {jogador.observacoes && (
        <p className="line-clamp-2 whitespace-pre-line text-sm opacity-70" title={jogador.observacoes}>
          {jogador.observacoes}
        </p>
      )}

      <div className="mt-auto flex gap-2 pt-1">
        <button
          type="button"
          onClick={aoEditar}
          aria-label={`Editar ${jogador.nickname}`}
          className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque"
        >
          {emEdicao ? "Editando" : "Editar"}
        </button>
        <button
          type="button"
          onClick={aoRemover}
          aria-label={`Remover ${jogador.nickname}`}
          className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold text-red-400 transition hover:border-red-400"
        >
          Remover
        </button>
      </div>
    </li>
  );
}

import { useCallback, useEffect, useState } from "react";
import type { Ponto } from "./coordenadas";
import type { Plano } from "./plano";
import {
  criarUtilitario,
  PONTOS_TRACO_MAX,
  PONTOS_TRAJETORIA_MAX,
  simplificar,
  TRACOS_MAX,
  trocarTipo,
  UTILITARIOS_MAX,
  type TipoUtilitario,
} from "./utilitarios";

// Ferramentas do editor para utilitários (RF10) e caminhos (RF09).
//
// Modos: normal (arrastar e selecionar), colocar um utilitário, desenhar caminho ou
// desenhar a trajetória do utilitário selecionado. Seleção, modo e menu são estado da
// tela, fora do histórico. Cada alteração do plano passa por `alterar` e é uma ação do
// histórico (RF16); o traço em andamento só vira ação quando o botão do mouse é solto.

export type Modo =
  | { tipo: "normal" }
  | { tipo: "colocar"; utilitario: TipoUtilitario }
  | { tipo: "caminho" }
  | { tipo: "trajetoria"; indice: number };

export type Selecao = { tipo: "utilitario"; indice: number } | { tipo: "traco"; indice: number } | null;

export type Menu = { tela: Ponto; indice: number } | null;

type Opcoes = {
  plano: Plano;
  alterar: (transformar: (atual: Plano) => Plano) => void;
  jogadorPadrao: number | null; // jogador sugerido para o caminho
};

export function useFerramentas({ plano, alterar, jogadorPadrao }: Opcoes) {
  const [modo, setModo] = useState<Modo>({ tipo: "normal" });
  const [selecao, setSelecao] = useState<Selecao>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [jogadorEscolhido, setJogadorCaminho] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const jogadorCaminho = jogadorEscolhido ?? jogadorPadrao;

  // Seleção ou modo que apontam para um item que deixou de existir (ex.: depois de
  // desfazer) são descartados.
  useEffect(() => {
    if (selecao?.tipo === "utilitario" && !plano.utilitarios[selecao.indice]) setSelecao(null);
    if (selecao?.tipo === "traco" && !plano.tracos[selecao.indice]) setSelecao(null);
    if (modo.tipo === "trajetoria" && !plano.utilitarios[modo.indice]) setModo({ tipo: "normal" });
    if (menu && !plano.tracos[menu.indice]) setMenu(null);
  }, [plano, selecao, modo, menu]);

  const trocarModo = useCallback((novo: Modo) => {
    setMenu(null);
    setAviso(null);
    setModo((atual) =>
      // Clicar de novo na ferramenta ativa desliga.
      JSON.stringify(atual) === JSON.stringify(novo) ? { tipo: "normal" } : novo,
    );
  }, []);

  const sair = useCallback(() => {
    setMenu(null);
    setAviso(null);
    setModo({ tipo: "normal" });
  }, []);

  // Desfazer e refazer: a seleção e o menu saem, para não apontar para outro item.
  const limpar = useCallback(() => {
    setSelecao(null);
    setMenu(null);
    setModo((atual) => (atual.tipo === "trajetoria" ? { tipo: "normal" } : atual));
  }, []);

  // --- Utilitários -------------------------------------------------------------------

  function colocar(ponto: Ponto) {
    if (modo.tipo !== "colocar") return;
    if (plano.utilitarios.length >= UTILITARIOS_MAX) {
      setAviso(`Limite de ${UTILITARIOS_MAX} utilitários por tática.`);
      return;
    }
    const tipo = modo.utilitario;
    const indice = plano.utilitarios.length;
    alterar((atual) => ({ ...atual, utilitarios: [...atual.utilitarios, criarUtilitario(tipo, ponto)] }));
    setSelecao({ tipo: "utilitario", indice });
  }

  function moverUtilitario(indice: number, ponto: Ponto) {
    alterar((atual) =>
      atual.utilitarios[indice]
        ? { ...atual, utilitarios: atual.utilitarios.map((u, i) => (i === indice ? { ...u, ...ponto } : u)) }
        : atual,
    );
  }

  function trocarTipoUtilitario(indice: number, tipo: TipoUtilitario) {
    alterar((atual) =>
      atual.utilitarios[indice] && atual.utilitarios[indice].tipo !== tipo
        ? { ...atual, utilitarios: atual.utilitarios.map((u, i) => (i === indice ? trocarTipo(u, tipo) : u)) }
        : atual,
    );
  }

  function definirTrajetoria(indice: number, pontos: Ponto[]) {
    const trajetoria = simplificar(pontos, PONTOS_TRAJETORIA_MAX);
    alterar((atual) =>
      atual.utilitarios[indice]
        ? { ...atual, utilitarios: atual.utilitarios.map((u, i) => (i === indice ? { ...u, trajetoria } : u)) }
        : atual,
    );
    setModo({ tipo: "normal" });
    setSelecao({ tipo: "utilitario", indice });
  }

  function removerTrajetoria(indice: number) {
    alterar((atual) =>
      atual.utilitarios[indice]?.trajetoria
        ? {
            ...atual,
            utilitarios: atual.utilitarios.map((u, i) => (i === indice ? { ...u, trajetoria: null } : u)),
          }
        : atual,
    );
  }

  // --- Caminhos ----------------------------------------------------------------------

  // O traço solto vira um rascunho (salvo no banco) e fica selecionado: o botão direito
  // ou Enter grava com "definir caminho".
  function finalizarTraco(pontos: Ponto[]) {
    if (plano.tracos.length >= TRACOS_MAX) {
      setAviso(`Limite de ${TRACOS_MAX} caminhos por tática.`);
      return;
    }
    const indice = plano.tracos.length;
    const traco = {
      jogadorId: jogadorCaminho,
      pontos: simplificar(pontos, PONTOS_TRACO_MAX),
      status: "rascunho" as const,
    };
    alterar((atual) => ({ ...atual, tracos: [...atual.tracos, traco] }));
    setSelecao({ tipo: "traco", indice });
  }

  function definirCaminho(indice: number) {
    setMenu(null);
    alterar((atual) =>
      atual.tracos[indice]?.status === "rascunho"
        ? { ...atual, tracos: atual.tracos.map((t, i) => (i === indice ? { ...t, status: "confirmado" } : t)) }
        : atual,
    );
  }

  // Traço alvo do botão direito ou do Enter fora de um traço: o selecionado, se for
  // rascunho, ou o último rascunho.
  function tracoAtual(): number | null {
    if (selecao?.tipo === "traco" && plano.tracos[selecao.indice]?.status === "rascunho") return selecao.indice;
    for (let i = plano.tracos.length - 1; i >= 0; i--) if (plano.tracos[i].status === "rascunho") return i;
    return null;
  }

  function abrirMenu(indice: number | null, tela: Ponto) {
    if (indice === null) {
      setAviso('Trace um caminho antes de usar "definir caminho".');
      return;
    }
    setSelecao({ tipo: "traco", indice });
    setMenu({ tela, indice });
  }

  // --- Seleção -----------------------------------------------------------------------

  function apagar(alvo: Selecao = selecao) {
    if (!alvo) return;
    setMenu(null);
    setSelecao(null);
    if (alvo.tipo === "utilitario") {
      alterar((atual) =>
        atual.utilitarios[alvo.indice]
          ? { ...atual, utilitarios: atual.utilitarios.filter((_, i) => i !== alvo.indice) }
          : atual,
      );
    } else {
      alterar((atual) =>
        atual.tracos[alvo.indice] ? { ...atual, tracos: atual.tracos.filter((_, i) => i !== alvo.indice) } : atual,
      );
    }
  }

  return {
    modo,
    selecao,
    menu,
    aviso,
    jogadorCaminho,
    setJogadorCaminho,
    setSelecao,
    setMenu,
    trocarModo,
    sair,
    limpar,
    colocar,
    moverUtilitario,
    trocarTipoUtilitario,
    definirTrajetoria,
    removerTrajetoria,
    finalizarTraco,
    definirCaminho,
    tracoAtual,
    abrirMenu,
    apagar,
  };
}

export type Ferramentas = ReturnType<typeof useFerramentas>;

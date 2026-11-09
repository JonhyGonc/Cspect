import type { DragEvent } from "react";
import type { Funcao, Jogador } from "../api/jogadores";
import type { Posicao } from "../editor/sugestao";
import { Avatar } from "./Avatar";
import { TIPO_ARRASTE_JOGADOR } from "./MapaEditor";

// Itens do elenco no editor: jogador (arrastável para o mapa) e posição sem jogador (RF08A).

function formatar(valor: number): string {
  return valor.toFixed(4);
}

function SeletorFuncao({
  rotulo,
  posicao,
  funcoes,
  repetida,
  aoTrocarFuncao,
}: {
  rotulo: string;
  posicao: Posicao;
  funcoes: Funcao[];
  repetida: boolean;
  aoTrocarFuncao: (funcaoId: number | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="opacity-60">Função nesta tática</span>
      <select
        value={posicao.funcaoId ?? ""}
        onChange={(e) => aoTrocarFuncao(e.target.value === "" ? null : Number(e.target.value))}
        aria-label={rotulo}
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

export function ItemElenco({ jogador, posicao, funcoes, repetida, aoTrocarFuncao, aoTirar }: ItemElencoProps) {
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
        <SeletorFuncao
          rotulo={`Função de ${jogador.nickname} nesta tática`}
          posicao={posicao}
          funcoes={funcoes}
          repetida={repetida}
          aoTrocarFuncao={aoTrocarFuncao}
        />
      )}
    </li>
  );
}

type ItemSemJogadorProps = {
  numero: number;
  posicao: Posicao;
  funcoes: Funcao[];
  repetida: boolean;
  aoTrocarFuncao: (funcaoId: number | null) => void;
  aoTirar: () => void;
};

// Posição cujo jogador foi removido do elenco (RF08A): mantém a função, sem jogador.
export function ItemSemJogador({ numero, posicao, funcoes, repetida, aoTrocarFuncao, aoTirar }: ItemSemJogadorProps) {
  const rotulo = `Posição sem jogador ${numero}`;
  return (
    <li
      aria-label={rotulo}
      data-sem-jogador={numero}
      data-x={formatar(posicao.x)}
      data-y={formatar(posicao.y)}
      data-funcao-id={posicao.funcaoId ?? undefined}
      className="flex flex-col gap-2 rounded-md border border-dashed border-white/15 bg-fundo p-2"
    >
      <div className="flex items-center gap-3">
        <Avatar iniciais="?" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold opacity-80">Sem jogador</p>
          <p className="truncate text-xs opacity-60">O jogador foi removido do elenco.</p>
        </div>
        <button
          type="button"
          onClick={aoTirar}
          aria-label={`Tirar ${rotulo.toLowerCase()} do mapa`}
          title="Tirar do mapa"
          className="shrink-0 rounded px-1.5 text-sm opacity-60 transition hover:text-red-400 hover:opacity-100"
        >
          ✕
        </button>
      </div>
      <SeletorFuncao
        rotulo={`Função da ${rotulo.toLowerCase()}`}
        posicao={posicao}
        funcoes={funcoes}
        repetida={repetida}
        aoTrocarFuncao={aoTrocarFuncao}
      />
    </li>
  );
}

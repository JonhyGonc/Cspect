import type { Jogador } from "../api/jogadores";
import type { Plano } from "../editor/plano";
import type { Ferramentas } from "../editor/useFerramentas";
import { descreverDuracao, ORDEM_TIPOS, TIPOS_UTILITARIO, type TipoUtilitario } from "../editor/utilitarios";

const BOTAO =
  "rounded-md border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
const ATIVO = "border-destaque bg-destaque text-fundo";
const INATIVO = "border-white/10 hover:border-destaque";
const PEQUENO = "rounded-md border border-white/10 px-2 py-1 text-xs font-semibold transition hover:border-destaque";

type Props = {
  ferramentas: Ferramentas;
  plano: Plano;
  jogadores: Jogador[];
  nomeDoJogador: (id: number | null) => string;
};

// Barra de ferramentas do editor (RF09, RF10): os quatro utilitários, o modo de desenho
// de caminho e as opções do item selecionado.
export function BarraUtilitarios({ ferramentas: f, plano, jogadores, nomeDoJogador }: Props) {
  const { modo, selecao } = f;
  const utilitario = selecao?.tipo === "utilitario" ? plano.utilitarios[selecao.indice] : undefined;
  const traco = selecao?.tipo === "traco" ? plano.tracos[selecao.indice] : undefined;

  return (
    <div className="flex flex-col gap-2 border-b border-white/5 px-4 py-2">
      <div className="flex items-center gap-2">
        <div role="group" aria-label="Utilitários" className="flex gap-1">
          {ORDEM_TIPOS.map((tipo) => {
            const ativo = modo.tipo === "colocar" && modo.utilitario === tipo;
            return (
              <button
                key={tipo}
                type="button"
                aria-pressed={ativo}
                onClick={() => f.trocarModo({ tipo: "colocar", utilitario: tipo })}
                title={`Colocar ${TIPOS_UTILITARIO[tipo].nome}: clique no mapa no ponto de impacto`}
                className={`${BOTAO} ${ativo ? ATIVO : INATIVO}`}
              >
                {TIPOS_UTILITARIO[tipo].nome}
              </button>
            );
          })}
        </div>
        <span className="mx-1 h-6 w-px bg-white/10" aria-hidden="true" />
        <button
          type="button"
          aria-pressed={modo.tipo === "caminho"}
          onClick={() => f.trocarModo({ tipo: "caminho" })}
          disabled={jogadores.length === 0}
          title={jogadores.length === 0 ? "Cadastre jogadores para desenhar caminhos." : undefined}
          className={`${BOTAO} ${modo.tipo === "caminho" ? ATIVO : INATIVO}`}
        >
          Desenhar caminho
        </button>
        {modo.tipo === "caminho" && (
          <label className="flex items-center gap-2 text-sm">
            <span className="opacity-70">Jogador</span>
            <select
              value={f.jogadorCaminho ?? ""}
              onChange={(e) => f.setJogadorCaminho(Number(e.target.value))}
              aria-label="Jogador do caminho"
              className="rounded-md border border-white/10 bg-fundo px-2 py-1"
            >
              {jogadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nickname}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Linha sempre presente e com altura fixa, para o mapa não mudar de tamanho: mostra as
          opções do item selecionado ou a dica do modo. */}
      <div className="flex h-7 items-center gap-3 overflow-hidden">
        {utilitario && selecao && (
          <div className="flex items-center gap-2 text-sm" aria-label="Utilitário selecionado">
            <select
              value={utilitario.tipo}
              onChange={(e) => f.trocarTipoUtilitario(selecao.indice, e.target.value as TipoUtilitario)}
              aria-label="Tipo do utilitário"
              className="rounded-md border border-destaque/60 bg-fundo px-2 py-1 text-destaque"
            >
              {ORDEM_TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPOS_UTILITARIO[tipo].nome}
                </option>
              ))}
            </select>
            <span className="text-xs opacity-60" title="Duração padrão do jogo (RF11)">
              Duração: {descreverDuracao(utilitario)}
            </span>
            <button
              type="button"
              className={PEQUENO}
              onClick={() => f.trocarModo({ tipo: "trajetoria", indice: selecao.indice })}
            >
              {utilitario.trajetoria ? "Redesenhar trajetória" : "Desenhar trajetória"}
            </button>
            {utilitario.trajetoria && (
              <button type="button" className={PEQUENO} onClick={() => f.removerTrajetoria(selecao.indice)}>
                Remover trajetória
              </button>
            )}
            <button type="button" className={`${PEQUENO} text-red-400`} onClick={() => f.apagar()}>
              Apagar
            </button>
          </div>
        )}

        {traco && selecao && (
          <div className="flex items-center gap-2 text-sm" aria-label="Caminho selecionado">
            <span className="opacity-70">
              Caminho de <strong>{nomeDoJogador(traco.jogadorId)}</strong> (
              {traco.status === "rascunho" ? "rascunho" : "definido"})
            </span>
            {traco.status === "rascunho" && (
              <button
                type="button"
                className={`${PEQUENO} border-destaque/60 text-destaque`}
                onClick={() => f.definirCaminho(selecao.indice)}
              >
                Definir caminho
              </button>
            )}
            <button type="button" className={`${PEQUENO} text-red-400`} onClick={() => f.apagar()}>
              Apagar
            </button>
          </div>
        )}
        {(!selecao || modo.tipo !== "normal") && (
          <p role="status" className="min-w-0 truncate text-xs">
            {f.aviso && <span className="mr-2 text-destaque">{f.aviso}</span>}
            <span className="opacity-60">{dica(f.modo)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function dica(modo: Ferramentas["modo"]): string {
  switch (modo.tipo) {
    case "colocar":
      return `Clique no mapa para colocar ${TIPOS_UTILITARIO[modo.utilitario].nome} no ponto de impacto. Esc sai do modo.`;
    case "caminho":
      return "Arraste no mapa para traçar o caminho. Botão direito ou Enter: definir caminho. Esc sai do modo; o rascunho fica salvo.";
    case "trajetoria":
      return "Arraste do ponto de lançamento até perto do impacto; a linha termina no utilitário. Esc cancela.";
    default:
      return 'Escolha um utilitário ou "Desenhar caminho". Clique num item do mapa para ver as opções; Delete apaga.';
  }
}

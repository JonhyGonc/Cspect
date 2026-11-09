import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { faixasDeDuracao, marcacaoNoInstante, type Marcacao } from "../editor/interpolacao";
import { MARCACOES_MAX, SEQUENCIAS_MAX } from "../editor/sequencias";
import { VELOCIDADES, type Velocidade } from "../editor/useReproducao";
import type { Sequencias } from "../editor/useSequencias";
import { TIPOS_UTILITARIO } from "../editor/utilitarios";

const BOTAO =
  "whitespace-nowrap rounded-md border border-white/10 px-2.5 py-1 text-xs font-semibold transition hover:border-destaque disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10";
const LINHAS_FAIXAS = 3;
const ENCAIXE_PX = 8; // clicar perto de uma marcação leva exatamente ao instante dela

export function segundos(ms: number): string {
  return `${(ms / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
}

type Reproducao = {
  instante: number;
  setInstante: (ms: number) => void;
  tocando: boolean;
  tocar: () => void;
  pausar: () => void;
  reiniciar: () => void;
  velocidade: Velocidade;
  setVelocidade: (v: Velocidade) => void;
};

type Props = {
  sequencias: Sequencias;
  marcacoes: Marcacao[] | null; // null: plano fixo aberto
  reproducao: Reproducao;
  fim: number; // fim da reprodução (última marcação ou fim da última faixa), em ms
  comprimento: number; // tamanho da régua, em ms
  aoTrocarSequencia: (id: number | null) => void;
  aoAdicionarMarcacao: () => void;
  aoApagarMarcacao: () => void;
};

// Linha do tempo na parte inferior do editor (RF13 a RF15, Fluxo 4): escolha e criação de
// sequências, marcações, faixas de duração de smoke e molotov (RF11) e reprodução.
export function LinhaDoTempo({
  sequencias: s,
  marcacoes,
  reproducao: r,
  fim,
  comprimento,
  aoTrocarSequencia,
  aoAdicionarMarcacao,
  aoApagarMarcacao,
}: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const atual = s.info.find((info) => info.id === s.aberta);
  const naMarcacao = marcacoes ? marcacaoNoInstante(marcacoes, r.instante) : undefined;

  return (
    <div className="flex flex-col gap-2 border-t border-white/5 px-4 py-2" aria-label="Linha do tempo">
      <div className="flex h-8 items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="opacity-70">Sequência</span>
          <select
            value={s.aberta ?? ""}
            onChange={(e) => {
              setConfirmando(false);
              aoTrocarSequencia(e.target.value === "" ? null : Number(e.target.value));
            }}
            aria-label="Sequência aberta"
            className="max-w-48 rounded-md border border-white/10 bg-fundo px-2 py-1"
          >
            <option value="">Plano fixo</option>
            {s.info.map((info) => (
              <option key={info.id} value={info.id}>
                {info.nome || "Sem nome"}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={BOTAO}
          disabled={s.ocupado || s.info.length >= SEQUENCIAS_MAX}
          onClick={() => void s.criar("zero")}
          title="Nova sequência vazia, com uma marcação em 0 s"
        >
          + Do zero
        </button>
        <button
          type="button"
          className={BOTAO}
          disabled={s.ocupado || s.info.length >= SEQUENCIAS_MAX}
          onClick={() => void s.criar("plano")}
          title="Nova sequência começando com jogadores, funções, utilitários e caminhos definidos do plano fixo"
        >
          + Do plano
        </button>

        {atual && (
          <>
            <input
              type="text"
              value={atual.nome}
              maxLength={60}
              onChange={(e) => s.renomear(atual.id, e.target.value)}
              aria-label="Nome da sequência"
              className="w-40 rounded-md border border-white/10 bg-fundo px-2 py-1 focus:border-destaque focus:outline-none"
            />
            {confirmando ? (
              <span className="flex items-center gap-1 text-xs">
                Apagar a sequência?
                <button
                  type="button"
                  className={`${BOTAO} text-red-400`}
                  onClick={() => {
                    setConfirmando(false);
                    void s.apagar(atual.id);
                  }}
                >
                  Apagar
                </button>
                <button type="button" className={BOTAO} onClick={() => setConfirmando(false)}>
                  Cancelar
                </button>
              </span>
            ) : (
              <button type="button" className={`${BOTAO} text-red-400`} onClick={() => setConfirmando(true)}>
                Apagar sequência
              </button>
            )}
          </>
        )}
        {s.erro && (
          <span role="alert" className="min-w-0 truncate text-xs text-red-400">
            {s.erro}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={BOTAO}
            onClick={aoAdicionarMarcacao}
            disabled={!marcacoes || r.tocando || !!naMarcacao || marcacoes.length >= MARCACOES_MAX}
            title="Marcação manual no instante atual"
          >
            + Marcação
          </button>
          <button
            type="button"
            className={`${BOTAO} text-red-400`}
            onClick={aoApagarMarcacao}
            disabled={!marcacoes || r.tocando || !naMarcacao || marcacoes.length <= 1}
            title="Apaga a marcação do instante atual"
          >
            Apagar marcação
          </button>
        </div>
      </div>

      {/* Linha 2, sempre com a mesma altura (o mapa não muda de tamanho ao abrir uma
          sequência): controles de reprodução à esquerda e a régua. */}
      <div className="flex h-16 gap-3">
        <div className="flex w-36 shrink-0 flex-col justify-between">
          <div className="flex gap-1">
            <button
              type="button"
              className={BOTAO}
              onClick={r.reiniciar}
              disabled={!marcacoes}
              title="Voltar ao início"
            >
              Reiniciar
            </button>
            <button
              type="button"
              className={`${BOTAO} flex-1 border-destaque/60 text-destaque`}
              onClick={r.tocando ? r.pausar : r.tocar}
              disabled={!marcacoes || fim <= 0}
            >
              {r.tocando ? "Pausar" : "Tocar"}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={r.velocidade}
              onChange={(e) => r.setVelocidade(Number(e.target.value) as Velocidade)}
              aria-label="Velocidade"
              disabled={!marcacoes}
              className="rounded-md border border-white/10 bg-fundo px-1 py-0.5 text-xs disabled:opacity-40"
            >
              {VELOCIDADES.map((v) => (
                <option key={v} value={v}>
                  {v.toLocaleString("pt-BR")}×
                </option>
              ))}
            </select>
            <span data-testid="instante" className="flex-1 text-right font-mono text-xs tabular-nums">
              {marcacoes ? segundos(r.instante) : "–"}
            </span>
          </div>
        </div>
        {marcacoes ? (
          <Regua marcacoes={marcacoes} reproducao={r} comprimento={comprimento} naMarcacao={naMarcacao} />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-white/10 text-xs opacity-60">
            Plano fixo aberto. Crie uma sequência do zero ou do plano para montar a animação.
          </div>
        )}
      </div>
    </div>
  );
}

function Regua({
  marcacoes,
  reproducao: r,
  comprimento,
  naMarcacao,
}: {
  marcacoes: Marcacao[];
  reproducao: Reproducao;
  comprimento: number;
  naMarcacao: Marcacao | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);
  const faixas = faixasDeDuracao(marcacoes);
  const pct = (ms: number) => `${Math.min(100, (ms / comprimento) * 100)}%`;
  const passoRotulo = comprimento <= 15_000 ? 1000 : comprimento <= 60_000 ? 5000 : 10_000;

  function instanteDoPonteiro(evento: PointerEvent<HTMLDivElement>): number {
    const caixa = ref.current!.getBoundingClientRect();
    const x = Math.min(caixa.width, Math.max(0, evento.clientX - caixa.left));
    const perto = marcacoes.find((m) => Math.abs((m.instante / comprimento) * caixa.width - x) <= ENCAIXE_PX);
    if (perto) return perto.instante;
    return Math.round(((x / caixa.width) * comprimento) / 100) * 100;
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const passo = evento.shiftKey ? 1000 : 100;
    if (evento.key === "ArrowLeft") r.setInstante(Math.max(0, r.instante - passo));
    else if (evento.key === "ArrowRight") r.setInstante(Math.min(comprimento, r.instante + passo));
    else if (evento.key === "Home") r.setInstante(0);
    else return;
    evento.preventDefault();
  }

  const rotulos = [];
  for (let ms = 0; ms <= comprimento; ms += passoRotulo) rotulos.push(ms);

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Instante atual"
      aria-valuemin={0}
      aria-valuemax={comprimento}
      aria-valuenow={Math.round(r.instante)}
      aria-valuetext={segundos(r.instante)}
      data-testid="regua"
      className="relative h-16 min-w-0 flex-1 cursor-pointer select-none rounded-md bg-fundo focus:outline-none focus-visible:ring-1 focus-visible:ring-destaque"
      onPointerDown={(e) => {
        if (r.tocando) r.pausar();
        arrastando.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        r.setInstante(instanteDoPonteiro(e));
      }}
      onPointerMove={(e) => {
        if (arrastando.current) r.setInstante(instanteDoPonteiro(e));
      }}
      onPointerUp={() => {
        arrastando.current = false;
      }}
      onKeyDown={aoTeclar}
    >
      {/* Régua de segundos */}
      {rotulos.map((ms) => (
        <span key={ms} className="pointer-events-none absolute top-0 h-full" style={{ left: pct(ms) }}>
          <span className="absolute top-0 h-2 w-px bg-white/20" />
          <span className="absolute left-1 top-0 text-[10px] leading-3 opacity-50">{ms / 1000}s</span>
        </span>
      ))}

      {/* Marcações: cheias as manuais, vazadas as automáticas */}
      {marcacoes.map((m) => {
        const atual = naMarcacao === m;
        return (
          <span
            key={m.instante}
            data-marcacao={m.instante}
            data-tipo={m.tipo}
            title={`Marcação ${m.tipo === "manual" ? "manual" : "automática"} em ${segundos(m.instante)}`}
            className={
              "pointer-events-none absolute top-[14px] h-3 w-3 -translate-x-1/2 rotate-45 border-2 border-destaque " +
              (m.tipo === "manual" ? "bg-destaque " : "bg-fundo ") +
              (atual ? "ring-2 ring-texto" : "")
            }
            style={{ left: pct(m.instante) }}
          />
        );
      })}

      {/* Faixas de duração (RF11): smoke e molotov ocupam a duração; flash e HE são um momento */}
      {faixas.map((f, i) => {
        const topo = 32 + (i % LINHAS_FAIXAS) * 10;
        const rotulo = TIPOS_UTILITARIO[f.tipo].rotulo;
        if (f.duracao === null) {
          return (
            <span
              key={f.ref}
              data-faixa={f.ref}
              title={`${TIPOS_UTILITARIO[f.tipo].nome} em ${segundos(f.inicio)} (momento)`}
              className="pointer-events-none absolute flex h-[9px] items-center"
              style={{ left: pct(f.inicio), top: topo }}
            >
              <span className="h-full w-0.5 bg-texto" />
              <span className="ml-0.5 text-[9px] font-bold leading-none">{rotulo}</span>
            </span>
          );
        }
        return (
          <span
            key={f.ref}
            data-faixa={f.ref}
            title={`${TIPOS_UTILITARIO[f.tipo].nome}: ${segundos(f.inicio)} a ${segundos(f.inicio + f.duracao)}`}
            className={
              "pointer-events-none absolute h-[9px] overflow-hidden rounded-sm px-1 text-[9px] font-bold leading-[9px] text-fundo " +
              (f.tipo === "smoke" ? "bg-texto/70" : "bg-destaque/80")
            }
            style={{ left: pct(f.inicio), width: pct(f.duracao), top: topo }}
          >
            {rotulo} {f.duracao / 1000}s
          </span>
        );
      })}

      {/* Instante atual */}
      <span
        className="pointer-events-none absolute top-0 h-full w-0.5 -translate-x-1/2 bg-destaque"
        style={{ left: pct(r.instante) }}
      />
    </div>
  );
}

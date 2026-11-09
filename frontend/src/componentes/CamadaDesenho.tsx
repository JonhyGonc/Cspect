import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Arrow, Circle, Group, Layer, Line, Rect, Text } from "react-konva";
import { normalizadoParaTela, telaParaNormalizado, type Ponto } from "../editor/coordenadas";
import type { Modo, Selecao } from "../editor/useFerramentas";
import { TIPOS_UTILITARIO, type Traco, type Utilitario } from "../editor/utilitarios";
import type { ContextoMapa } from "./MapaEditor";

// Cores da paleta da seção 9. Utilitários usam o texto e o destaque, sem cores novas.
const COR_FUNDO = "#14161A";
const COR_TEXTO = "#E8EAED";
const COR_DESTAQUE = "#F5A623";
const DISTANCIA_MINIMA_PX = 4; // entre pontos do traço, para não guardar ruído do mouse

function planificar(pontos: Ponto[]): number[] {
  return pontos.flatMap((p) => [p.x, p.y]);
}

function cursor(e: Konva.KonvaEventObject<Event>, valor: string) {
  const stage = e.target.getStage();
  if (stage) stage.container().style.cursor = valor;
}

// --- Camada do plano: traços, trajetórias e utilitários -----------------------------

type CamadaPlanoProps = {
  contexto: ContextoMapa;
  utilitarios: Utilitario[];
  tracos: Traco[];
  selecao: Selecao;
  interativo: boolean;
  corTraco: string;
  nomeDoJogador: (id: number | null) => string;
  aoSelecionar: (selecao: Selecao) => void;
  aoMoverUtilitario: (indice: number, ponto: Ponto) => void;
  aoMenuTraco: (indice: number, tela: Ponto) => void;
};

export function CamadaPlano({
  contexto,
  utilitarios,
  tracos,
  selecao,
  interativo,
  corTraco,
  nomeDoJogador,
  aoSelecionar,
  aoMoverUtilitario,
  aoMenuTraco,
}: CamadaPlanoProps) {
  const { quadro, rotacao } = contexto;
  const naTela = (p: Ponto) => normalizadoParaTela(p, rotacao, quadro);

  return (
    <Layer listening={interativo}>
      {tracos.map((traco, indice) => {
        const pontos = traco.pontos.map(naTela);
        const selecionado = selecao?.tipo === "traco" && selecao.indice === indice;
        const cor = selecionado ? COR_DESTAQUE : corTraco;
        const comum = {
          points: planificar(pontos),
          stroke: cor,
          strokeWidth: selecionado ? 4 : 3,
          lineCap: "round" as const,
          lineJoin: "round" as const,
          hitStrokeWidth: 14,
          onClick: () => aoSelecionar({ tipo: "traco", indice }),
          onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => {
            e.evt.preventDefault();
            e.cancelBubble = true;
            const ponteiro = e.target.getStage()?.getPointerPosition();
            if (ponteiro) aoMenuTraco(indice, ponteiro);
          },
          onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => cursor(e, "pointer"),
          onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => cursor(e, ""),
        };
        return (
          <Group key={`traco-${indice}`} name="traco" id={`traco-${indice}`}>
            {traco.status === "confirmado" ? (
              <Arrow {...comum} fill={cor} pointerLength={10} pointerWidth={10} />
            ) : (
              // Rascunho: tracejado e mais apagado, até "definir caminho".
              <Line {...comum} dash={[10, 6]} opacity={0.8} />
            )}
            <Text
              x={pontos[0].x + 6}
              y={pontos[0].y - 16}
              text={nomeDoJogador(traco.jogadorId) + (traco.status === "rascunho" ? " (rascunho)" : "")}
              fontSize={10}
              fontStyle="bold"
              fill={COR_TEXTO}
              shadowColor={COR_FUNDO}
              shadowBlur={3}
              shadowOpacity={1}
              listening={false}
            />
          </Group>
        );
      })}

      {utilitarios.map((utilitario, indice) =>
        utilitario.trajetoria ? (
          <Group key={`trajetoria-${indice}`} listening={false}>
            <Line
              points={planificar([...utilitario.trajetoria, utilitario].map(naTela))}
              stroke={COR_TEXTO}
              strokeWidth={2}
              dash={[6, 5]}
              opacity={0.8}
              lineCap="round"
              lineJoin="round"
            />
            <Circle {...naTela(utilitario.trajetoria[0])} radius={3} fill={COR_TEXTO} opacity={0.9} />
          </Group>
        ) : null,
      )}

      {utilitarios.map((utilitario, indice) => (
        <MarcadorUtilitario
          key={`utilitario-${indice}`}
          indice={indice}
          utilitario={utilitario}
          posicao={naTela(utilitario)}
          contexto={contexto}
          selecionado={selecao?.tipo === "utilitario" && selecao.indice === indice}
          aoSelecionar={() => aoSelecionar({ tipo: "utilitario", indice })}
          aoMover={(tela) => aoMoverUtilitario(indice, telaParaNormalizado(tela, rotacao, quadro))}
        />
      ))}
    </Layer>
  );
}

type MarcadorUtilitarioProps = {
  indice: number;
  utilitario: Utilitario;
  posicao: Ponto;
  contexto: ContextoMapa;
  selecionado: boolean;
  aoSelecionar: () => void;
  aoMover: (tela: Ponto) => void;
};

function MarcadorUtilitario({
  indice,
  utilitario,
  posicao,
  contexto,
  selecionado,
  aoSelecionar,
  aoMover,
}: MarcadorUtilitarioProps) {
  const { quadro } = contexto;
  return (
    <Group
      x={posicao.x}
      y={posicao.y}
      draggable
      name="utilitario"
      id={`utilitario-${indice}`}
      dragBoundFunc={(p) => ({
        x: Math.min(quadro.x + quadro.largura, Math.max(quadro.x, p.x)),
        y: Math.min(quadro.y + quadro.altura, Math.max(quadro.y, p.y)),
      })}
      onMouseDown={aoSelecionar}
      // O arraste completo é uma ação só: grava no fim (RF16).
      onDragEnd={(e) => aoMover({ x: e.target.x(), y: e.target.y() })}
      onMouseEnter={(e) => cursor(e, "grab")}
      onMouseLeave={(e) => cursor(e, "")}
    >
      {/* Área de efeito aproximada: smoke maior, molotov menor. */}
      {utilitario.tipo === "smoke" && <Circle radius={20} fill={COR_TEXTO} opacity={0.22} />}
      {utilitario.tipo === "molotov" && <Circle radius={15} fill={COR_DESTAQUE} opacity={0.28} />}
      <Circle
        radius={11}
        fill={COR_FUNDO}
        stroke={selecionado ? COR_DESTAQUE : COR_TEXTO}
        strokeWidth={selecionado ? 3 : 1.5}
      />
      <Text
        text={TIPOS_UTILITARIO[utilitario.tipo].rotulo}
        width={22}
        height={22}
        offsetX={11}
        offsetY={11}
        align="center"
        verticalAlign="middle"
        fontSize={utilitario.tipo === "he" ? 9 : 11}
        fontStyle="bold"
        fill={COR_TEXTO}
      />
    </Group>
  );
}

// --- Camada de captura: colocar utilitário e desenhar (só nos modos) ------------------

type CamadaCapturaProps = {
  contexto: ContextoMapa;
  modo: Modo;
  cor: string;
  aoColocar: (ponto: Ponto) => void;
  aoFinalizarDesenho: (pontos: Ponto[]) => void;
  aoMenuFundo: (tela: Ponto) => void;
};

// Fica por cima de tudo enquanto um modo está ativo. O traço em andamento fica só aqui,
// fora do histórico, até o botão do mouse ser solto (RF16).
export function CamadaCaptura({ contexto, modo, cor, aoColocar, aoFinalizarDesenho, aoMenuFundo }: CamadaCapturaProps) {
  const { quadro, rotacao } = contexto;
  const [emAndamento, setEmAndamento] = useState<Ponto[] | null>(null);
  const emAndamentoRef = useRef<Ponto[] | null>(null);
  emAndamentoRef.current = emAndamento;
  const desenhando = modo.tipo === "caminho" || modo.tipo === "trajetoria";

  // Esc durante o traço cancela só o traço em andamento (antes dos outros atalhos).
  useEffect(() => {
    if (!emAndamento) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      evento.stopPropagation();
      setEmAndamento(null);
    }
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [emAndamento]);

  function ponteiro(e: Konva.KonvaEventObject<MouseEvent>): Ponto | null {
    return e.target.getStage()?.getPointerPosition() ?? null;
  }

  function finalizar() {
    const pontos = emAndamentoRef.current;
    setEmAndamento(null);
    if (pontos && pontos.length >= 2) aoFinalizarDesenho(pontos.map((p) => telaParaNormalizado(p, rotacao, quadro)));
  }

  return (
    <Layer>
      <Rect
        name="captura"
        x={quadro.x}
        y={quadro.y}
        width={quadro.largura}
        height={quadro.altura}
        fill="rgba(0,0,0,0.01)"
        onMouseEnter={(e) => cursor(e, "crosshair")}
        onMouseLeave={(e) => {
          cursor(e, "");
          if (emAndamentoRef.current) finalizar();
        }}
        onMouseDown={(e) => {
          if (e.evt.button !== 0) return;
          const p = ponteiro(e);
          if (!p) return;
          if (modo.tipo === "colocar") aoColocar(telaParaNormalizado(p, rotacao, quadro));
          else if (desenhando) setEmAndamento([p]);
        }}
        onMouseMove={(e) => {
          const atual = emAndamentoRef.current;
          const p = ponteiro(e);
          if (!atual || !p) return;
          const ultimo = atual[atual.length - 1];
          if (Math.hypot(p.x - ultimo.x, p.y - ultimo.y) >= DISTANCIA_MINIMA_PX) setEmAndamento([...atual, p]);
        }}
        onMouseUp={(e) => {
          if (e.evt.button === 0 && emAndamentoRef.current) finalizar();
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          const p = ponteiro(e);
          if (p && !emAndamentoRef.current) aoMenuFundo(p);
        }}
      />
      {emAndamento && (
        <Line
          points={planificar(emAndamento)}
          stroke={modo.tipo === "trajetoria" ? COR_TEXTO : cor}
          strokeWidth={3}
          dash={[10, 6]}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
    </Layer>
  );
}

// --- Menu do botão direito ------------------------------------------------------------

type MenuCaminhoProps = {
  tela: Ponto;
  traco: Traco;
  aoDefinir: () => void;
  aoApagar: () => void;
  aoFechar: () => void;
};

// RF09: o caminho é gravado com "definir caminho" no botão direito.
export function MenuCaminho({ tela, traco, aoDefinir, aoApagar, aoFechar }: MenuCaminhoProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector("button")?.focus();
    function fora(evento: MouseEvent) {
      if (ref.current && !ref.current.contains(evento.target as Node)) aoFechar();
    }
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [aoFechar]);

  const item =
    "block w-full px-3 py-1.5 text-left text-sm transition hover:bg-white/10 focus:bg-white/10 focus:outline-none";
  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Caminho"
      style={{ left: tela.x, top: tela.y }}
      className="absolute z-10 min-w-40 overflow-hidden rounded-md border border-white/10 bg-painel py-1 shadow-lg"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          aoFechar();
        }
      }}
    >
      {traco.status === "rascunho" && (
        <button type="button" role="menuitem" className={`${item} font-bold text-destaque`} onClick={aoDefinir}>
          Definir caminho
        </button>
      )}
      <button type="button" role="menuitem" className={`${item} text-red-400`} onClick={aoApagar}>
        {traco.status === "rascunho" ? "Descartar rascunho" : "Apagar caminho"}
      </button>
    </div>
  );
}

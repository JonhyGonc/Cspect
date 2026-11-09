import type Konva from "konva";
import { useEffect, useRef, useState, type DragEvent, type ReactNode, type RefObject } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Stage, Text } from "react-konva";
import type { Jogador } from "../api/jogadores";
import {
  dentroDoQuadro,
  enquadrar,
  normalizadoParaTela,
  telaParaNormalizado,
  type Enquadramento,
  type Ponto,
  type Rotacao,
} from "../editor/coordenadas";
import type { Mapa } from "../editor/mapas";
import type { Posicao } from "../editor/sugestao";

// Tipo usado no arrastar e soltar do elenco (HTML) para o mapa (canvas).
export const TIPO_ARRASTE_JOGADOR = "application/x-cspect-jogador";

export type Lado = "T" | "CT";

export const COR_LADO: Record<Lado, string> = { T: "#E07B39", CT: "#4A90D9" };
const COR_FUNDO = "#14161A";
const COR_TEXTO = "#E8EAED";
const COR_DESTAQUE = "#F5A623";
const RAIO_JOGADOR = 16;

type EstadoImagem = { fase: "carregando" } | { fase: "pronto"; imagem: HTMLImageElement } | { fase: "erro" };

function useImagem(src: string): EstadoImagem {
  const [estado, setEstado] = useState<EstadoImagem>({ fase: "carregando" });

  useEffect(() => {
    let cancelado = false;
    setEstado({ fase: "carregando" });
    const imagem = new window.Image();
    imagem.onload = () => {
      if (!cancelado) setEstado({ fase: "pronto", imagem });
    };
    imagem.onerror = () => {
      if (!cancelado) setEstado({ fase: "erro" });
    };
    imagem.src = src;
    return () => {
      cancelado = true;
    };
  }, [src]);

  return estado;
}

// Acompanha o tamanho do elemento para o Stage ocupar toda a área disponível.
function useTamanho(ref: RefObject<HTMLElement>): { largura: number; altura: number } {
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      setTamanho({ largura: Math.floor(width), altura: Math.floor(height) });
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref]);

  return tamanho;
}

// O que as camadas extras (traços e utilitários) precisam para converter coordenadas.
export type ContextoMapa = { quadro: Enquadramento; rotacao: Rotacao };

type Props = {
  mapa: Mapa;
  rotacao: Rotacao;
  lado: Lado;
  jogadores: Jogador[];
  posicoes: Record<number, Posicao>;
  // Posições cujo jogador foi removido do elenco (RF08A): continuam no mapa com a função.
  semJogador: Posicao[];
  // Nome de cada função por id (GET /api/funcoes), para o rótulo no mapa.
  nomesFuncoes: Record<number, string>;
  aoPosicionar: (jogadorId: number, ponto: Ponto) => void;
  aoMoverSemJogador: (indice: number, ponto: Ponto) => void;
  // false nos modos de colocar ou desenhar: os jogadores não respondem ao mouse.
  interativo?: boolean;
  // Camadas extras: abaixo dos jogadores (traços e utilitários) e acima (captura do desenho).
  camadasAbaixo?: (contexto: ContextoMapa) => ReactNode;
  camadasAcima?: (contexto: ContextoMapa) => ReactNode;
  // HTML por cima do mapa (ex.: menu do botão direito), em px da área do mapa.
  sobreposicao?: ReactNode;
  aoClicarFundo?: () => void;
};

// Mapa do editor com Konva (seção 10): imagem de fundo na proporção original, girada
// só na tela, e os jogadores posicionados em coordenadas normalizadas (RF08).
export function MapaEditor({
  mapa,
  rotacao,
  lado,
  jogadores,
  posicoes,
  semJogador,
  nomesFuncoes,
  aoPosicionar,
  aoMoverSemJogador,
  interativo = true,
  camadasAbaixo,
  camadasAcima,
  sobreposicao,
  aoClicarFundo,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const { largura, altura } = useTamanho(areaRef);
  const imagem = useImagem(mapa.arquivo);

  const quadro: Enquadramento | null =
    imagem.fase === "pronto" && largura > 0 && altura > 0
      ? enquadrar(imagem.imagem.naturalWidth, imagem.imagem.naturalHeight, rotacao, largura, altura)
      : null;

  function aoArrastarSobre(evento: DragEvent<HTMLDivElement>) {
    if (quadro && evento.dataTransfer.types.includes(TIPO_ARRASTE_JOGADOR)) {
      evento.preventDefault();
      evento.dataTransfer.dropEffect = "move";
    }
  }

  function aoSoltar(evento: DragEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    const id = Number(evento.dataTransfer.getData(TIPO_ARRASTE_JOGADOR));
    if (!stage || !quadro || !Number.isInteger(id) || id <= 0) return;
    evento.preventDefault();
    stage.setPointersPositions(evento.nativeEvent);
    const ponteiro = stage.getPointerPosition();
    if (!ponteiro || !dentroDoQuadro(ponteiro, quadro)) return;
    aoPosicionar(id, telaParaNormalizado(ponteiro, rotacao, quadro));
  }

  return (
    <div
      ref={areaRef}
      className="relative h-full w-full overflow-hidden"
      onDragOver={aoArrastarSobre}
      onDrop={aoSoltar}
      data-testid="area-mapa"
    >
      {imagem.fase === "carregando" && (
        <p className="absolute inset-0 flex items-center justify-center opacity-70">Carregando mapa...</p>
      )}
      {imagem.fase === "erro" && (
        <p role="alert" className="absolute inset-0 flex items-center justify-center text-red-400">
          Não foi possível carregar a imagem do mapa. Tente recarregar a página.
        </p>
      )}
      {quadro && imagem.fase === "pronto" && (
        <Stage
          ref={stageRef}
          width={largura}
          height={altura}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) aoClicarFundo?.();
          }}
          onContextMenu={(e) => e.evt.preventDefault()}
        >
          <Layer listening={false}>
            {/* A imagem gira em torno do próprio centro; o centro do quadro não muda com a rotação. */}
            <KonvaImage
              image={imagem.imagem}
              width={imagem.imagem.naturalWidth * quadro.escala}
              height={imagem.imagem.naturalHeight * quadro.escala}
              offsetX={(imagem.imagem.naturalWidth * quadro.escala) / 2}
              offsetY={(imagem.imagem.naturalHeight * quadro.escala) / 2}
              x={quadro.x + quadro.largura / 2}
              y={quadro.y + quadro.altura / 2}
              rotation={rotacao}
            />
          </Layer>
          {camadasAbaixo?.({ quadro, rotacao })}
          <Layer listening={interativo}>
            {jogadores.map((jogador) => {
              const ponto = posicoes[jogador.id];
              if (!ponto) return null;
              const funcao = ponto.funcaoId === null ? null : (nomesFuncoes[ponto.funcaoId] ?? null);
              return (
                <MarcadorJogador
                  key={jogador.id}
                  id={`jogador-${jogador.id}`}
                  iniciais={jogador.avatar || "?"}
                  nome={jogador.nickname}
                  cor={COR_LADO[lado]}
                  funcao={funcao}
                  posicao={normalizadoParaTela(ponto, rotacao, quadro)}
                  quadro={quadro}
                  aoSoltar={(tela) => aoPosicionar(jogador.id, telaParaNormalizado(tela, rotacao, quadro))}
                  areaRef={areaRef}
                />
              );
            })}
            {semJogador.map((ponto, indice) => (
              <MarcadorJogador
                key={`sem-jogador-${indice}`}
                id={`sem-jogador-${indice}`}
                iniciais="?"
                nome="Sem jogador"
                cor={COR_LADO[lado]}
                opacidade={0.6}
                funcao={ponto.funcaoId === null ? null : (nomesFuncoes[ponto.funcaoId] ?? null)}
                posicao={normalizadoParaTela(ponto, rotacao, quadro)}
                quadro={quadro}
                aoSoltar={(tela) => aoMoverSemJogador(indice, telaParaNormalizado(tela, rotacao, quadro))}
                areaRef={areaRef}
              />
            ))}
          </Layer>
          {camadasAcima?.({ quadro, rotacao })}
        </Stage>
      )}
      {quadro && sobreposicao}
    </div>
  );
}

type MarcadorProps = {
  id: string;
  iniciais: string;
  nome: string;
  cor: string;
  opacidade?: number;
  funcao: string | null;
  posicao: Ponto;
  quadro: Enquadramento;
  aoSoltar: (tela: Ponto) => void;
  areaRef: RefObject<HTMLDivElement>;
};

function MarcadorJogador({
  id,
  iniciais,
  nome,
  cor,
  opacidade = 1,
  funcao,
  posicao,
  quadro,
  aoSoltar,
  areaRef,
}: MarcadorProps) {
  function cursor(valor: string) {
    if (areaRef.current) areaRef.current.style.cursor = valor;
  }

  return (
    <Group
      x={posicao.x}
      y={posicao.y}
      draggable
      name="jogador"
      id={id}
      // O marcador não sai de cima do mapa.
      dragBoundFunc={(p) => ({
        x: Math.min(quadro.x + quadro.largura, Math.max(quadro.x, p.x)),
        y: Math.min(quadro.y + quadro.altura, Math.max(quadro.y, p.y)),
      })}
      onDragEnd={(e) => aoSoltar({ x: e.target.x(), y: e.target.y() })}
      onMouseEnter={() => cursor("grab")}
      onMouseLeave={() => cursor("")}
      onDragStart={() => cursor("grabbing")}
    >
      <Circle radius={RAIO_JOGADOR} fill={cor} opacity={opacidade} stroke={COR_FUNDO} strokeWidth={2} />
      <Text
        text={iniciais}
        width={RAIO_JOGADOR * 2}
        height={RAIO_JOGADOR * 2}
        offsetX={RAIO_JOGADOR}
        offsetY={RAIO_JOGADOR}
        align="center"
        verticalAlign="middle"
        fontStyle="bold"
        fontSize={12}
        fill={COR_FUNDO}
      />
      <Text
        text={nome}
        width={120}
        offsetX={60}
        y={RAIO_JOGADOR + 3}
        align="center"
        fontSize={11}
        fontStyle="bold"
        fill={COR_TEXTO}
        shadowColor={COR_FUNDO}
        shadowBlur={3}
        shadowOpacity={1}
        wrap="none"
        ellipsis
      />
      {/* Função usada nesta tática (RF08); sem função, a posição mostra só o nickname. */}
      {funcao && (
        <Text
          text={funcao}
          width={120}
          offsetX={60}
          y={RAIO_JOGADOR + 16}
          align="center"
          fontSize={10}
          fontStyle="bold"
          fill={COR_DESTAQUE}
          shadowColor={COR_FUNDO}
          shadowBlur={3}
          shadowOpacity={1}
          wrap="none"
          ellipsis
        />
      )}
    </Group>
  );
}

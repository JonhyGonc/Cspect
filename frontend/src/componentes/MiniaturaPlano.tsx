import type { Lado, PosicaoApi } from "../api/taticas";
import type { Mapa } from "../editor/mapas";

// Miniatura do plano fixo (RF19), desenhada em SVG a partir dos dados: o PNG do mapa na
// orientação original (rotação 0°) e as posições com a função. Nada é salvo como imagem.

const COR_LADO: Record<Lado, string> = { T: "#E07B39", CT: "#4A90D9" };
const COR_FUNDO = "#14161A";
const COR_TEXTO = "#E8EAED";
const LARGURA = 1000; // unidades do viewBox; a altura segue a proporção do PNG

// Sigla curta da função, para caber na miniatura.
const SIGLAS: Record<string, string> = {
  "Entry Fragger": "EF",
  AWPer: "AWP",
  Lurker: "LRK",
  Support: "SUP",
  IGL: "IGL",
  Anchor: "ANC",
};

export function siglaDaFuncao(nome: string): string {
  return SIGLAS[nome] ?? nome.slice(0, 3).toUpperCase();
}

type Props = {
  mapa: Mapa;
  lado: Lado;
  posicoes: PosicaoApi[];
  nomesFuncoes: Record<number, string>;
};

export function MiniaturaPlano({ mapa, lado, posicoes, nomesFuncoes }: Props) {
  const altura = (LARGURA * mapa.altura) / mapa.largura;
  const raio = 34;
  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${altura}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Miniatura do plano fixo em ${mapa.nome}, com ${posicoes.length} posições`}
      className="h-40 w-full"
    >
      <image href={mapa.arquivo} width={LARGURA} height={altura} />
      {posicoes.map((p, i) => {
        const x = p.x * LARGURA;
        const y = p.y * altura;
        const funcao = p.funcao_id !== null ? nomesFuncoes[p.funcao_id] : undefined;
        const semJogador = p.jogador_id === null;
        return (
          <g key={i} data-posicao={i}>
            <circle
              cx={x}
              cy={y}
              r={raio}
              fill={COR_LADO[lado]}
              fillOpacity={semJogador ? 0.5 : 1}
              stroke={COR_FUNDO}
              strokeWidth={5}
            />
            {funcao && (
              <text
                x={x}
                y={y + raio + 46}
                textAnchor="middle"
                fontSize={46}
                fontWeight={700}
                fill={COR_TEXTO}
                stroke={COR_FUNDO}
                strokeWidth={10}
                paintOrder="stroke"
              >
                {siglaDaFuncao(funcao)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

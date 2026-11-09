import { useEffect, useState } from "react";
import { listarFuncoes } from "../api/jogadores";
import { CATEGORIAS, listarReferencias, type Referencias } from "../api/referencias";
import type { TaticaResumo } from "../api/taticas";
import { mapaPorId } from "../editor/mapas";
import { Link } from "../roteamento";
import { MiniaturaPlano } from "./MiniaturaPlano";

// Nomes que o cartão precisa: classificações (GET /api/referencias) e funções (GET /api/funcoes).
export type NomesCartao = {
  referencias: Referencias;
  funcoes: Record<number, string>;
};

export async function carregarNomesCartao(): Promise<NomesCartao> {
  const [referencias, funcoes] = await Promise.all([listarReferencias(), listarFuncoes()]);
  return { referencias, funcoes: Object.fromEntries(funcoes.map((f) => [f.id, f.nome])) };
}

export function dataEHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Cartão de tática (RF19): miniatura do plano fixo, nome, mapa, lado, filtros, quantidade
// de jogadores e data da última alteração. O cartão inteiro abre a tática no editor.
export function CartaoTatica({ tatica, nomes }: { tatica: TaticaResumo; nomes: NomesCartao }) {
  const mapa = mapaPorId(tatica.mapa_id);
  const filtros = CATEGORIAS.flatMap(({ chave }) =>
    tatica[chave].map((id) => nomes.referencias[chave].find((r) => r.id === id)?.nome ?? `#${id}`),
  );
  const jogadores = tatica.jogadores === 1 ? "1 jogador" : `${tatica.jogadores} jogadores`;

  return (
    <article data-tatica={tatica.id} className="h-full">
      <Link
        para={`/taticas/${tatica.id}`}
        className="flex h-full flex-col overflow-hidden rounded-lg border border-white/5 bg-painel transition hover:border-destaque"
      >
        <div className="bg-fundo">
          {mapa ? (
            <MiniaturaPlano mapa={mapa} lado={tatica.lado} posicoes={tatica.posicoes} nomesFuncoes={nomes.funcoes} />
          ) : (
            <div className="h-40" />
          )}
        </div>
        <div className="flex flex-col gap-2 p-3">
          <p className="truncate font-bold" title={tatica.nome}>
            {tatica.nome}
          </p>
          <p className="flex items-center gap-2 text-sm">
            <span>{mapa?.nome ?? tatica.mapa_id}</span>
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
            <span className={`font-bold ${tatica.lado === "T" ? "text-time_t" : "text-time_ct"}`}>{tatica.lado}</span>
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
            <span data-testid="jogadores">{jogadores}</span>
          </p>
          <ul className="flex min-h-5 flex-wrap gap-1" aria-label="Filtros">
            {filtros.length === 0 && <li className="text-xs opacity-50">Sem classificação</li>}
            {filtros.map((nome) => (
              <li key={nome} className="rounded border border-white/10 px-1.5 py-0.5 text-xs">
                {nome}
              </li>
            ))}
          </ul>
          <p className="text-xs opacity-60">Alterada em {dataEHora(tatica.alterada_em)}</p>
        </div>
      </Link>
    </article>
  );
}

// Carrega os nomes do cartão uma vez por tela.
export function useNomesCartao() {
  const [estado, setEstado] = useState<NomesCartao | "erro" | null>(null);
  useEffect(() => {
    let cancelado = false;
    carregarNomesCartao()
      .then((nomes) => !cancelado && setEstado(nomes))
      .catch(() => !cancelado && setEstado("erro"));
    return () => {
      cancelado = true;
    };
  }, []);
  return estado;
}

import { useEffect, useRef, useState } from "react";
import { CATEGORIAS, type Referencias } from "../api/referencias";
import type { Classificacao } from "../api/taticas";

const CHIP = "rounded-full border px-2.5 py-1 text-xs font-semibold transition";

type Props = {
  referencias: Referencias;
  valor: Classificacao;
  aoMudar: (valor: Classificacao) => void;
};

// Classificação da tática no editor (RF18): execução, economia e objetivo, com mais de uma
// opção por categoria. Abre por cima do mapa, sem mudar o tamanho dele, e é salva com a
// tática (useSalvamento). Como nome e lado, fica fora do histórico de desfazer.
export function PainelClassificacao({ referencias, valor, aoMudar }: Props) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = valor.execucoes.length + valor.economias.length + valor.objetivos.length;

  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent) {
      if (ref.current && !ref.current.contains(evento.target as Node)) setAberto(false);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    window.addEventListener("mousedown", fora);
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("mousedown", fora);
      window.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  function alternar(chave: keyof Classificacao, id: number) {
    const lista = valor[chave];
    aoMudar({
      ...valor,
      [chave]: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id].sort((a, b) => a - b),
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className="whitespace-nowrap rounded-md border border-white/10 px-3 py-1 text-sm font-semibold transition hover:border-destaque"
      >
        Classificação{total > 0 ? ` (${total})` : ""}
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label="Classificação da tática"
          className="absolute left-0 top-full z-20 mt-1 flex w-[26rem] flex-col gap-3 rounded-md border border-white/10 bg-painel p-4 shadow-lg"
        >
          {CATEGORIAS.map(({ chave, rotulo }) => (
            <div key={chave} role="group" aria-label={rotulo} className="flex flex-col gap-1.5">
              <span className="text-xs opacity-70">{rotulo}</span>
              <div className="flex flex-wrap gap-1.5">
                {referencias[chave].map((item) => {
                  const ativo = valor[chave].includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => alternar(chave, item.id)}
                      className={`${CHIP} ${ativo ? "border-destaque bg-destaque text-fundo" : "border-white/10 hover:border-destaque"}`}
                    >
                      {item.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs opacity-50">Pode marcar mais de uma opção em cada categoria.</p>
        </div>
      )}
    </div>
  );
}

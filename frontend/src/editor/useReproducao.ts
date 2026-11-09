import { useCallback, useEffect, useRef, useState } from "react";

// Reprodução da sequência (RF15): tocar, pausar, reiniciar e velocidade.
// O instante avança com o relógio do navegador (requestAnimationFrame), multiplicado pela
// velocidade, e para no fim da sequência.

export const VELOCIDADES = [0.25, 0.5, 1, 1.5, 2] as const;
export type Velocidade = (typeof VELOCIDADES)[number];

export function useReproducao(fim: number) {
  const [instante, setInstanteBruto] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState<Velocidade>(1);
  const fimRef = useRef(fim);
  fimRef.current = fim;
  const velocidadeRef = useRef(velocidade);
  velocidadeRef.current = velocidade;

  // O instante corrente fica também numa ref: o laço da reprodução lê e escreve nela.
  const instanteRef = useRef(0);
  const atualizar = useCallback((ms: number) => {
    instanteRef.current = ms;
    setInstanteBruto(ms);
  }, []);

  useEffect(() => {
    if (!tocando) return;
    let anterior = performance.now();
    let quadro = requestAnimationFrame(function passo(agora) {
      const proximo = instanteRef.current + (agora - anterior) * velocidadeRef.current;
      anterior = agora;
      if (proximo >= fimRef.current) {
        atualizar(fimRef.current);
        setTocando(false);
        return;
      }
      atualizar(proximo);
      quadro = requestAnimationFrame(passo);
    });
    return () => cancelAnimationFrame(quadro);
  }, [tocando, atualizar]);

  // Fora da reprodução, o instante é sempre um número inteiro de milissegundos.
  const setInstante = useCallback((ms: number) => atualizar(Math.max(0, Math.round(ms))), [atualizar]);

  const tocar = useCallback(() => {
    if (fimRef.current <= 0) return;
    // No fim, tocar de novo começa do início.
    if (instanteRef.current >= fimRef.current) atualizar(0);
    setTocando(true);
  }, [atualizar]);

  const pausar = useCallback(() => {
    setTocando(false);
    atualizar(Math.round(instanteRef.current));
  }, [atualizar]);

  const reiniciar = useCallback(() => atualizar(0), [atualizar]);

  return {
    instante: tocando ? instante : Math.round(instante),
    setInstante,
    tocando,
    tocar,
    pausar,
    reiniciar,
    velocidade,
    setVelocidade,
  };
}

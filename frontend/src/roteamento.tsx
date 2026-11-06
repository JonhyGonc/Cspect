import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

// Roteamento mínimo com a History API do navegador.
// Não usa react-router-dom: a instalação de pacotes não estava disponível no ambiente
// em que esta tela foi feita (ver o relatório da T2.3).

export function caminhoAtual(): string {
  return window.location.pathname;
}

export function navegar(destino: string, opcoes: { substituir?: boolean } = {}): void {
  if (opcoes.substituir) {
    window.history.replaceState(null, "", destino);
  } else {
    window.history.pushState(null, "", destino);
  }
  // pushState e replaceState não disparam popstate: avisamos os ouvintes manualmente.
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useCaminho(): string {
  const [caminho, setCaminho] = useState(caminhoAtual);

  useEffect(() => {
    const atualizar = () => setCaminho(caminhoAtual());
    window.addEventListener("popstate", atualizar);
    return () => window.removeEventListener("popstate", atualizar);
  }, []);

  return caminho;
}

type LinkProps = {
  para: string;
  children: ReactNode;
  className?: string;
  "aria-current"?: "page";
};

// Link que navega sem recarregar a página. Cliques com Ctrl, Shift ou botão do meio
// seguem o comportamento padrão (abrir em nova aba).
export function Link({ para, children, className, "aria-current": ariaCurrent }: LinkProps) {
  function aoClicar(evento: MouseEvent<HTMLAnchorElement>) {
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return;
    evento.preventDefault();
    navegar(para);
  }

  return (
    <a href={para} onClick={aoClicar} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  );
}

export function Redirecionar({ para }: { para: string }) {
  useEffect(() => {
    navegar(para, { substituir: true });
  }, [para]);

  return null;
}

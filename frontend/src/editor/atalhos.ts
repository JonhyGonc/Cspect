import { useEffect } from "react";
import type { Ferramentas } from "./useFerramentas";

// Atalhos de desfazer e refazer (RF16): Ctrl+Z desfaz; Ctrl+Y ou Ctrl+Shift+Z refaz
// (Cmd no macOS). Em campo de texto ou select, o atalho fica com o navegador.
function campoDeTexto(alvo: EventTarget | null): boolean {
  return (
    alvo instanceof HTMLElement &&
    (alvo.isContentEditable || alvo.closest("input, textarea, select, [contenteditable]") !== null)
  );
}

// Atalhos das ferramentas (fora de campos de texto e select):
// Delete ou Backspace apaga o item selecionado; Esc fecha o menu, sai do modo ou tira a
// seleção; Enter, no modo de caminho, grava o rascunho com "definir caminho" (RF09).
export function useAtalhosFerramentas(f: Ferramentas) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.ctrlKey || evento.metaKey || evento.altKey || campoDeTexto(evento.target)) return;
      if (evento.key === "Delete" || evento.key === "Backspace") {
        if (!f.selecao) return;
        evento.preventDefault();
        f.apagar();
      } else if (evento.key === "Escape") {
        if (f.menu) f.setMenu(null);
        else if (f.modo.tipo !== "normal") f.sair();
        else f.setSelecao(null);
      } else if (evento.key === "Enter" && f.modo.tipo === "caminho") {
        const indice = f.tracoAtual();
        if (indice === null) return;
        evento.preventDefault();
        f.definirCaminho(indice);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [f]);
}

export function useAtalhosHistorico(desfazer: () => void, refazer: () => void) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!(evento.ctrlKey || evento.metaKey) || evento.altKey) return;
      if (campoDeTexto(evento.target)) return;
      const tecla = evento.key.toLowerCase();
      if (tecla === "z" && !evento.shiftKey) {
        evento.preventDefault();
        desfazer();
      } else if ((tecla === "y" && !evento.shiftKey) || (tecla === "z" && evento.shiftKey)) {
        evento.preventDefault();
        refazer();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [desfazer, refazer]);
}

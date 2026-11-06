import { useEffect, useState } from "react";
import { mensagemDeErro, usuarioAtual, type Usuario } from "../api/auth";
import { navegar } from "../roteamento";

export type EstadoSessao =
  | { fase: "carregando" }
  | { fase: "pronto"; usuario: Usuario }
  | { fase: "erro"; mensagem: string };

// Confere a sessão ao abrir uma tela logada. Sem sessão válida, volta para o login
// sem deixar a tela atual no histórico (mesmo comportamento de Biblioteca e Jogadores).
export function useSessao(): EstadoSessao {
  const [estado, setEstado] = useState<EstadoSessao>({ fase: "carregando" });

  useEffect(() => {
    let cancelado = false;
    usuarioAtual()
      .then((usuario) => {
        if (cancelado) return;
        if (usuario === null) {
          navegar("/login", { substituir: true });
          return;
        }
        setEstado({ fase: "pronto", usuario });
      })
      .catch((falha) => {
        if (!cancelado) setEstado({ fase: "erro", mensagem: mensagemDeErro(falha) });
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return estado;
}

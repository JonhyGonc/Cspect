import { useCallback, useEffect, useRef, useState } from "react";
import { mensagemDoErroTatica } from "../api/taticas";

// Gravação em segundo plano (RNF01), usada pela tática (useSalvamento) e pelas sequências.
//
// - Grava cerca de 1,5 s depois da última mudança e também ao sair da tela.
// - Só o estado atual vai ao banco; se ele voltar ao que já está gravado, nada é enviado.
// - Uma gravação por vez: mudança feita durante uma gravação é gravada logo depois dela.
// - Se falhar, o estado da tela fica como está, e dá para tentar de novo.

export const ATRASO_SALVAMENTO_MS = 1500;

export type EstadoSalvamento =
  | { fase: "rascunho" }
  | { fase: "pendente" }
  | { fase: "salvando" }
  | { fase: "salvo"; em: Date }
  | { fase: "invalido"; mensagem: string }
  | { fase: "erro"; mensagem: string };

type Opcoes<T> = {
  dados: T;
  // Grava os dados. keepalive: chamada ao sair da página, que pode estar fechando.
  gravar: (dados: T, opcoes: { keepalive: boolean }) => Promise<void>;
  // Mensagem quando os dados não podem ser enviados (validação também existe no servidor).
  validar?: (dados: T) => string | null;
  salvoEm: Date | null; // null: nada gravado ainda (rascunho)
  // Ao sair com uma gravação ainda a caminho, pode ser preciso não enviar de novo
  // (ex.: a criação da tática, que duplicaria a tática).
  podeGravarNaSaida?: (gravacaoEmAndamento: boolean) => boolean;
};

export function useGravacaoAdiada<T>({ dados, gravar, validar, salvoEm, podeGravarNaSaida }: Opcoes<T>) {
  const texto = JSON.stringify(dados);

  const salvoRef = useRef(texto); // o que está no banco
  const salvoEmRef = useRef(salvoEm);
  const atualRef = useRef({ dados, texto });
  atualRef.current = { dados, texto };
  const emVooRef = useRef<{ texto: string; promessa: Promise<void> } | null>(null);
  const deNovoRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const opcoesRef = useRef({ gravar, validar, podeGravarNaSaida });
  opcoesRef.current = { gravar, validar, podeGravarNaSaida };

  const estadoSalvo = useCallback(
    (): EstadoSalvamento => (salvoEmRef.current ? { fase: "salvo", em: salvoEmRef.current } : { fase: "rascunho" }),
    [],
  );
  const [estado, setEstado] = useState<EstadoSalvamento>(estadoSalvo);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  const limparTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const salvarRef = useRef<() => Promise<void>>(async () => {});
  salvarRef.current = async () => {
    limparTimer();
    if (emVooRef.current !== null) {
      deNovoRef.current = true;
      return;
    }
    const { dados: enviar, texto: textoEnviado } = atualRef.current;
    if (textoEnviado === salvoRef.current) {
      setEstado(estadoSalvo());
      return;
    }
    const invalido = opcoesRef.current.validar?.(enviar) ?? null;
    if (invalido) {
      setEstado({ fase: "invalido", mensagem: invalido });
      return;
    }
    setEstado({ fase: "salvando" });
    let sucesso = false;
    const promessa = (async () => {
      try {
        await opcoesRef.current.gravar(enviar, { keepalive: false });
        salvoRef.current = textoEnviado;
        salvoEmRef.current = new Date();
        sucesso = true;
      } catch (falha) {
        setEstado({ fase: "erro", mensagem: mensagemDoErroTatica(falha) });
      }
    })();
    emVooRef.current = { texto: textoEnviado, promessa };
    await promessa;
    emVooRef.current = null;
    const mudouDuranteGravacao = deNovoRef.current || atualRef.current.texto !== salvoRef.current;
    deNovoRef.current = false;
    if (!sucesso) return;
    if (mudouDuranteGravacao && atualRef.current.texto !== salvoRef.current) await salvarRef.current();
    else setEstado(estadoSalvo());
  };

  // Cada mudança no que vai ao banco reinicia a espera de 1,5 s.
  useEffect(() => {
    if (texto === salvoRef.current) {
      limparTimer();
      if (emVooRef.current === null && estadoRef.current.fase !== "salvando") setEstado(estadoSalvo());
      return;
    }
    if (emVooRef.current === null) setEstado({ fase: "pendente" });
    limparTimer();
    timerRef.current = window.setTimeout(() => void salvarRef.current(), ATRASO_SALVAMENTO_MS);
  }, [texto, estadoSalvo]);

  // Ao sair (fechar a aba, recarregar ou trocar de tela), envia o que ainda não foi gravado.
  const salvarAoSairRef = useRef(() => {});
  salvarAoSairRef.current = () => {
    limparTimer();
    const { dados: enviar, texto: textoAtual } = atualRef.current;
    if (textoAtual === salvoRef.current || textoAtual === emVooRef.current?.texto) return;
    if (opcoesRef.current.validar?.(enviar)) return;
    if (opcoesRef.current.podeGravarNaSaida && !opcoesRef.current.podeGravarNaSaida(emVooRef.current !== null)) return;
    void opcoesRef.current.gravar(enviar, { keepalive: true }).catch(() => {});
    salvoRef.current = textoAtual; // não envia de novo se pagehide e a saída da tela acontecerem juntos
  };

  useEffect(() => {
    const aoEsconder = () => salvarAoSairRef.current();
    // Com a gravação falhando, avisa antes de fechar a aba para não perder o trabalho.
    const aoDescarregar = (evento: BeforeUnloadEvent) => {
      if (estadoRef.current.fase === "erro" && atualRef.current.texto !== salvoRef.current) {
        evento.preventDefault();
        evento.returnValue = "";
      }
    };
    window.addEventListener("pagehide", aoEsconder);
    window.addEventListener("beforeunload", aoDescarregar);
    return () => {
      window.removeEventListener("pagehide", aoEsconder);
      window.removeEventListener("beforeunload", aoDescarregar);
      salvarAoSairRef.current();
    };
  }, []);

  const tentarDeNovo = useCallback(() => void salvarRef.current(), []);

  // Grava agora, sem esperar o atraso (e espera a gravação em andamento). Devolve se o
  // estado atual ficou gravado.
  const salvarAgora = useCallback(async (): Promise<boolean> => {
    if (emVooRef.current) await emVooRef.current.promessa;
    await salvarRef.current();
    if (emVooRef.current) await emVooRef.current.promessa;
    return atualRef.current.texto === salvoRef.current;
  }, []);

  return { estado, tentarDeNovo, salvarAgora };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { atualizarTatica, criarTatica, mensagemDoErroTatica, type DadosTatica } from "../api/taticas";

// Salvamento em segundo plano (RNF01).
//
// - Salva cerca de 1,5 s depois da última alteração e também ao sair da tática.
// - Só o estado atual vai ao banco: o histórico de desfazer fica no navegador. Desfazer e
//   refazer não pedem nada ao servidor; se mudarem o estado, ele entra no mesmo salvamento
//   adiado de qualquer alteração, e se voltarem ao que já está salvo, nada é enviado.
// - Rascunho: a tática só é criada (POST) no primeiro salvamento; depois, PUT.
// - Uma gravação por vez: alteração feita durante uma gravação é salva logo depois dela.
// - Se falhar, o estado da tela fica como está, e o usuário pode tentar de novo.

export const ATRASO_SALVAMENTO_MS = 1500;

export type EstadoSalvamento =
  | { fase: "rascunho" }
  | { fase: "pendente" }
  | { fase: "salvando" }
  | { fase: "salvo"; em: Date }
  | { fase: "invalido"; mensagem: string }
  | { fase: "erro"; mensagem: string };

type Opcoes = {
  taticaId: number | null; // null = rascunho, ainda não existe no banco
  mapaId: string;
  dados: DadosTatica;
  salvoEm: Date | null;
  aoCriar: (id: number) => void;
};

export function useSalvamento({ taticaId, mapaId, dados, salvoEm, aoCriar }: Opcoes) {
  const texto = JSON.stringify(dados);

  const idRef = useRef(taticaId);
  const salvoRef = useRef(texto); // o que está no banco (no rascunho, o estado inicial vazio)
  const salvoEmRef = useRef(salvoEm);
  const atualRef = useRef({ dados, texto });
  atualRef.current = { dados, texto };
  const emVooRef = useRef<string | null>(null); // texto sendo gravado agora
  const deNovoRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const aoCriarRef = useRef(aoCriar);
  aoCriarRef.current = aoCriar;

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
    if (!enviar.nome) {
      setEstado({ fase: "invalido", mensagem: "Dê um nome à tática para salvar." });
      return;
    }
    emVooRef.current = textoEnviado;
    setEstado({ fase: "salvando" });
    let sucesso = false;
    try {
      if (idRef.current === null) {
        const criada = await criarTatica(mapaId, enviar);
        idRef.current = criada.id;
        aoCriarRef.current(criada.id);
      } else {
        await atualizarTatica(idRef.current, enviar);
      }
      salvoRef.current = textoEnviado;
      salvoEmRef.current = new Date();
      sucesso = true;
    } catch (falha) {
      setEstado({ fase: "erro", mensagem: mensagemDoErroTatica(falha) });
    } finally {
      emVooRef.current = null;
    }
    const mudouDuranteGravacao = deNovoRef.current || atualRef.current.texto !== salvoRef.current;
    deNovoRef.current = false;
    if (!sucesso) return;
    if (mudouDuranteGravacao && atualRef.current.texto !== salvoRef.current) {
      void salvarRef.current();
    } else {
      setEstado(estadoSalvo());
    }
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

  // Ao sair (fechar a aba, recarregar ou trocar de tela), envia o que ainda não foi salvo.
  // keepalive deixa a requisição terminar mesmo com a página fechando.
  const salvarAoSairRef = useRef(() => {});
  salvarAoSairRef.current = () => {
    limparTimer();
    const { dados: enviar, texto: textoAtual } = atualRef.current;
    if (textoAtual === salvoRef.current || textoAtual === emVooRef.current || !enviar.nome) return;
    if (idRef.current === null) {
      if (emVooRef.current !== null) return; // a criação já está a caminho; não duplica a tática
      void criarTatica(mapaId, enviar, true).catch(() => {});
    } else {
      void atualizarTatica(idRef.current, enviar, true).catch(() => {});
    }
    salvoRef.current = textoAtual; // não envia de novo se pagehide e a saída da tela acontecerem juntos
  };

  useEffect(() => {
    const aoEsconder = () => salvarAoSairRef.current();
    // Com o salvamento falhando, avisa antes de fechar a aba para não perder o trabalho.
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

  return { estado, tentarDeNovo };
}

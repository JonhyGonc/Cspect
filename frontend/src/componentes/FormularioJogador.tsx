import { useState, type FormEvent } from "react";
import { mensagemDoErro, statusDoErro, type DadosJogador, type Funcao, type Jogador } from "../api/jogadores";
import {
  NICKNAME_MAX,
  OBSERVACOES_MAX,
  SECUNDARIAS_MAX,
  contarCaracteres,
  previaAvatar,
  validarJogador,
  type ErrosJogador,
} from "../validacao";
import { Avatar } from "./Avatar";

type FormularioJogadorProps = {
  funcoes: Funcao[];
  // null: cadastro de um jogador novo. Com jogador: edição dele.
  jogador: Jogador | null;
  // Envia ao servidor. Lança ErroApi em caso de erro, que o formulário mostra.
  aoEnviar: (dados: DadosJogador) => Promise<void>;
  aoCancelar: () => void;
};

const ESTILO_CAMPO =
  "rounded-md border border-white/10 bg-fundo px-3 py-2 text-texto outline-none focus:border-destaque aria-[invalid=true]:border-red-400";

// Formulário de cadastro e edição (RF04). Quem usa troca a key para recomeçar do zero.
export function FormularioJogador({ funcoes, jogador, aoEnviar, aoCancelar }: FormularioJogadorProps) {
  const [nickname, setNickname] = useState(jogador?.nickname ?? "");
  const [principalId, setPrincipalId] = useState<number | null>(jogador?.funcao_principal.id ?? null);
  const [secundariasIds, setSecundariasIds] = useState<number[]>(
    jogador?.funcoes_secundarias.map((funcao) => funcao.id) ?? [],
  );
  const [observacoes, setObservacoes] = useState(jogador?.observacoes ?? "");
  const [erros, setErros] = useState<ErrosJogador>({});
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const editando = jogador !== null;
  const prefixo = editando ? `editar-${jogador.id}` : "novo";
  const limiteSecundarias = secundariasIds.length >= SECUNDARIAS_MAX;

  function alternarSecundaria(id: number, marcada: boolean) {
    setSecundariasIds((atuais) =>
      marcada ? (atuais.includes(id) ? atuais : [...atuais, id]) : atuais.filter((item) => item !== id),
    );
  }

  async function aoSubmeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const errosValidacao = validarJogador(nickname, principalId, secundariasIds, observacoes);
    setErros(errosValidacao);
    setErroServidor(null);
    if (Object.keys(errosValidacao).length > 0 || principalId === null) return;

    setEnviando(true);
    try {
      await aoEnviar({
        nickname: nickname.trim(),
        funcao_principal_id: principalId,
        // Mantém a ordem da lista de funções, independente da ordem dos cliques.
        funcoes_secundarias_ids: funcoes.map((f) => f.id).filter((id) => secundariasIds.includes(id)),
        observacoes,
      });
      // Em caso de sucesso, quem usa troca a key e este formulário é desmontado.
    } catch (falha) {
      if (statusDoErro(falha) === 409) {
        setErros({ nickname: mensagemDoErro(falha) });
      } else {
        setErroServidor(mensagemDoErro(falha));
      }
      setEnviando(false);
    }
  }

  const tamanhoNickname = contarCaracteres(nickname.trim());
  const tamanhoObservacoes = contarCaracteres(observacoes);

  return (
    <form onSubmit={aoSubmeter} noValidate className="flex flex-col gap-5" aria-label={editando ? "Editar jogador" : "Novo jogador"}>
      <div className="flex items-center gap-4">
        <Avatar iniciais={previaAvatar(nickname.trim())} tamanho="lg" />
        <div>
          <h2 className="text-xl font-bold">{editando ? "Editar jogador" : "Novo jogador"}</h2>
          <p className="text-sm opacity-70">O avatar usa as iniciais do nickname.</p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${prefixo}-nickname`} className="text-sm font-medium">
            Nickname
          </label>
          <span className={`text-xs ${tamanhoNickname > NICKNAME_MAX ? "text-red-400" : "opacity-60"}`}>
            {tamanhoNickname}/{NICKNAME_MAX}
          </span>
        </div>
        <input
          id={`${prefixo}-nickname`}
          type="text"
          value={nickname}
          onChange={(evento) => setNickname(evento.target.value)}
          autoComplete="off"
          required
          aria-invalid={erros.nickname ? true : undefined}
          aria-describedby={erros.nickname ? `${prefixo}-nickname-erro` : undefined}
          className={ESTILO_CAMPO}
        />
        {erros.nickname && (
          <span id={`${prefixo}-nickname-erro`} role="alert" className="text-sm text-red-400">
            {erros.nickname}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${prefixo}-principal`} className="text-sm font-medium">
          Função principal
        </label>
        <select
          id={`${prefixo}-principal`}
          value={principalId ?? ""}
          onChange={(evento) => setPrincipalId(evento.target.value ? Number(evento.target.value) : null)}
          required
          aria-invalid={erros.funcaoPrincipal ? true : undefined}
          aria-describedby={erros.funcaoPrincipal ? `${prefixo}-principal-erro` : undefined}
          className={ESTILO_CAMPO}
        >
          <option value="" disabled>
            Selecione a função
          </option>
          {funcoes.map((funcao) => {
            const ehSecundaria = secundariasIds.includes(funcao.id);
            return (
              <option key={funcao.id} value={funcao.id} disabled={ehSecundaria}>
                {funcao.nome}
                {ehSecundaria ? " (marcada como secundária)" : ""}
              </option>
            );
          })}
        </select>
        {erros.funcaoPrincipal && (
          <span id={`${prefixo}-principal-erro`} role="alert" className="text-sm text-red-400">
            {erros.funcaoPrincipal}
          </span>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 flex w-full items-baseline justify-between text-sm font-medium">
          <span>Funções secundárias</span>
          <span className="text-xs font-normal opacity-60">
            {secundariasIds.length}/{SECUNDARIAS_MAX}
          </span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {funcoes.map((funcao) => {
            const ehPrincipal = funcao.id === principalId;
            const marcada = secundariasIds.includes(funcao.id);
            const desabilitada = ehPrincipal || (!marcada && limiteSecundarias);
            const idCaixa = `${prefixo}-secundaria-${funcao.id}`;
            return (
              <label
                key={funcao.id}
                htmlFor={idCaixa}
                className={
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition " +
                  (marcada ? "border-destaque bg-fundo" : "border-white/10 bg-fundo/60") +
                  (desabilitada ? " cursor-not-allowed opacity-40" : " cursor-pointer hover:border-destaque")
                }
              >
                <input
                  id={idCaixa}
                  type="checkbox"
                  checked={marcada}
                  disabled={desabilitada}
                  onChange={(evento) => alternarSecundaria(funcao.id, evento.target.checked)}
                  className="h-4 w-4 accent-destaque"
                />
                <span>
                  {funcao.nome}
                  {ehPrincipal && <span className="block text-xs opacity-80">principal</span>}
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-xs opacity-60">
          A função principal não pode ser secundária. Para trocar, desmarque-a aqui antes de escolhê-la acima.
        </p>
        {erros.secundarias && (
          <span role="alert" className="text-sm text-red-400">
            {erros.secundarias}
          </span>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${prefixo}-observacoes`} className="text-sm font-medium">
            Observações <span className="font-normal opacity-60">(opcional)</span>
          </label>
          <span className={`text-xs ${tamanhoObservacoes > OBSERVACOES_MAX ? "text-red-400" : "opacity-60"}`}>
            {tamanhoObservacoes}/{OBSERVACOES_MAX}
          </span>
        </div>
        <textarea
          id={`${prefixo}-observacoes`}
          value={observacoes}
          onChange={(evento) => setObservacoes(evento.target.value)}
          rows={4}
          aria-invalid={erros.observacoes ? true : undefined}
          aria-describedby={erros.observacoes ? `${prefixo}-observacoes-erro` : undefined}
          className={`${ESTILO_CAMPO} resize-y`}
        />
        {erros.observacoes && (
          <span id={`${prefixo}-observacoes-erro`} role="alert" className="text-sm text-red-400">
            {erros.observacoes}
          </span>
        )}
      </div>

      {erroServidor && (
        <p role="alert" className="rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-400">
          {erroServidor}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="flex-1 rounded-md bg-destaque px-4 py-2 font-semibold text-fundo transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar jogador"}
        </button>
        {editando && (
          <button
            type="button"
            onClick={aoCancelar}
            disabled={enviando}
            className="rounded-md border border-white/10 px-4 py-2 font-semibold transition hover:border-destaque disabled:opacity-40"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

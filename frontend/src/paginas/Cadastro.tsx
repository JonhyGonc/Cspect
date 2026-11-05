import { useState, type FormEvent } from "react";
import { cadastrar, mensagemDeErro } from "../api/auth";
import { Campo } from "../componentes/Campo";
import { CaixaTermo } from "../componentes/CaixaTermo";
import { CartaoAuth } from "../componentes/CartaoAuth";
import { Link, navegar } from "../roteamento";
import { VERSAO_TERMO } from "../conteudo/termo_uso";
import { validarCadastro, type ErrosCadastro } from "../validacao";

export function Cadastro() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<ErrosCadastro>({});
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Sem o aceite do termo, o cadastro não acontece. O botão já fica desabilitado;
    // esta checagem cobre o envio por teclado em qualquer caso.
    if (!aceite || enviando) return;

    const errosValidacao = validarCadastro(email, senha, nome);
    setErros(errosValidacao);
    setErroServidor(null);
    if (Object.keys(errosValidacao).length > 0) return;

    setEnviando(true);
    try {
      await cadastrar({
        email: email.trim().toLowerCase(),
        senha,
        nome_exibicao: nome.trim(),
        aceite_termo: true,
        versao_termo: VERSAO_TERMO,
      });
      navegar("/login?msg=conta-criada");
    } catch (erro) {
      setErroServidor(mensagemDeErro(erro));
      setEnviando(false);
    }
  }

  return (
    <CartaoAuth titulo="Criar conta">
      <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
        <Campo
          id="email"
          rotulo="E-mail"
          tipo="email"
          valor={email}
          onChange={setEmail}
          autoComplete="email"
          erro={erros.email}
          obrigatorio
        />
        <Campo
          id="senha"
          rotulo="Senha (mínimo de 8 caracteres)"
          tipo="password"
          valor={senha}
          onChange={setSenha}
          autoComplete="new-password"
          erro={erros.senha}
          obrigatorio
        />
        <Campo
          id="nome"
          rotulo="Nome de exibição"
          valor={nome}
          onChange={setNome}
          autoComplete="nickname"
          erro={erros.nome}
          obrigatorio
        />

        <CaixaTermo />

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={aceite}
            onChange={(evento) => setAceite(evento.target.checked)}
            className="mt-1 h-4 w-4 accent-destaque"
          />
          <span>Li e aceito o termo de uso (versão {VERSAO_TERMO})</span>
        </label>

        {erroServidor && (
          <p role="alert" className="text-sm text-red-400">
            {erroServidor}
          </p>
        )}

        <button
          type="submit"
          disabled={!aceite || enviando}
          className="rounded-md bg-destaque px-4 py-2 font-semibold text-fundo transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="mt-6 text-sm opacity-80">
        Já tem conta? <Link para="/login" className="font-semibold text-destaque underline">Entrar</Link>
      </p>
    </CartaoAuth>
  );
}

import { useState, type FormEvent } from "react";
import { entrar, mensagemDeErro } from "../api/auth";
import { Campo } from "../componentes/Campo";
import { CartaoAuth } from "../componentes/CartaoAuth";
import { Link, navegar } from "../roteamento";

export function Login() {
  // A tela de cadastro envia o usuário para cá com ?msg=conta-criada.
  const [mensagemCriada] = useState(
    () => new URLSearchParams(window.location.search).get("msg") === "conta-criada",
  );
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    setErro(null);
    setEnviando(true);
    try {
      await entrar(email.trim().toLowerCase(), senha);
      navegar("/biblioteca");
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      setEnviando(false);
    }
  }

  return (
    <CartaoAuth titulo="Entrar">
      {mensagemCriada && (
        <p role="status" className="mb-4 rounded-md bg-fundo px-4 py-3 text-sm text-destaque">
          Conta criada. Agora entre.
        </p>
      )}

      <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
        <Campo
          id="email"
          rotulo="E-mail"
          tipo="email"
          valor={email}
          onChange={setEmail}
          autoComplete="email"
          obrigatorio
        />
        <Campo
          id="senha"
          rotulo="Senha"
          tipo="password"
          valor={senha}
          onChange={setSenha}
          autoComplete="current-password"
          obrigatorio
        />

        {erro && (
          <p role="alert" className="text-sm text-red-400">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-destaque px-4 py-2 font-semibold text-fundo transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-sm opacity-80">
        Ainda não tem conta?{" "}
        <Link para="/cadastro" className="font-semibold text-destaque underline">
          Criar conta
        </Link>
      </p>
    </CartaoAuth>
  );
}

import { useState } from "react";
import { mensagemDeErro, sair, type Usuario } from "../api/auth";
import { Link, navegar } from "../roteamento";

type Secao = "biblioteca" | "jogadores";

const LINKS: { secao: Secao; para: string; rotulo: string }[] = [
  { secao: "biblioteca", para: "/biblioteca", rotulo: "Biblioteca" },
  { secao: "jogadores", para: "/jogadores", rotulo: "Jogadores" },
];

// Cabeçalho das telas logadas: marca, navegação entre áreas, usuário e botão de sair.
// Sem usuário (sessão ainda carregando), mostra só a marca.
export function Cabecalho({ usuario, ativa }: { usuario: Usuario | null; ativa: Secao }) {
  const [saindo, setSaindo] = useState(false);
  const [erroSair, setErroSair] = useState<string | null>(null);

  async function aoSair() {
    if (saindo) return;
    setSaindo(true);
    setErroSair(null);
    try {
      await sair();
      navegar("/login");
    } catch (falha) {
      setErroSair(mensagemDeErro(falha));
      setSaindo(false);
    }
  }

  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-lg bg-painel px-6 py-4">
        <div className="flex items-center gap-8">
          <p className="text-lg font-bold text-destaque">Cspect</p>
          {usuario && (
            <nav aria-label="Navegação principal" className="flex items-center gap-1">
              {LINKS.map((link) => {
                const atual = link.secao === ativa;
                return (
                  <Link
                    key={link.secao}
                    para={link.para}
                    aria-current={atual ? "page" : undefined}
                    className={
                      "rounded-md px-3 py-1.5 text-sm font-semibold transition " +
                      (atual ? "bg-fundo text-destaque" : "opacity-80 hover:bg-fundo hover:opacity-100")
                    }
                  >
                    {link.rotulo}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        {usuario && (
          <div className="flex items-center gap-4">
            <span className="text-sm">
              Olá, <strong>{usuario.nome_exibicao}</strong>
            </span>
            <button
              type="button"
              onClick={aoSair}
              disabled={saindo}
              className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-semibold transition hover:border-destaque disabled:opacity-40"
            >
              {saindo ? "Saindo..." : "Sair"}
            </button>
          </div>
        )}
      </div>
      {erroSair && (
        <p role="alert" className="text-sm text-red-400">
          {erroSair}
        </p>
      )}
    </header>
  );
}

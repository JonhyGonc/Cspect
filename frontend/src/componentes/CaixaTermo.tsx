import { AVISO_RASCUNHO, TERMO_USO, TITULO_TERMO, VERSAO_TERMO } from "../conteudo/termo_uso";

// Termo de uso em caixa rolável (RF23). Fica focável para rolagem pelo teclado.
export function CaixaTermo() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-destaque">{AVISO_RASCUNHO}</p>
      <div
        role="region"
        aria-label={`${TITULO_TERMO}, versão ${VERSAO_TERMO}`}
        tabIndex={0}
        className="max-h-56 overflow-y-auto rounded-md border border-white/10 bg-fundo p-4 text-sm leading-relaxed"
      >
        <h2 className="mb-3 font-bold">
          {TITULO_TERMO} (versão {VERSAO_TERMO})
        </h2>
        {TERMO_USO.map((secao) => (
          <section key={secao.titulo} className="mb-4">
            <h3 className="mb-1 font-semibold">{secao.titulo}</h3>
            {secao.paragrafos.map((paragrafo) => (
              <p key={paragrafo} className="mb-2 opacity-90">
                {paragrafo}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

// Avatar com as iniciais do jogador (RF04). As iniciais vêm do servidor (campo avatar);
// no formulário, a prévia é calculada no navegador com a mesma regra.
export function Avatar({ iniciais, tamanho = "md" }: { iniciais: string; tamanho?: "md" | "lg" }) {
  const medidas = tamanho === "lg" ? "h-14 w-14 text-lg" : "h-12 w-12 text-base";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full border-2 border-destaque bg-fundo font-bold text-destaque ${medidas}`}
    >
      {iniciais || "?"}
    </span>
  );
}

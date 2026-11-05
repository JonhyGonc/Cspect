type CampoProps = {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  tipo?: string;
  autoComplete?: string;
  erro?: string;
  obrigatorio?: boolean;
};

export function Campo({
  id,
  rotulo,
  valor,
  onChange,
  tipo = "text",
  autoComplete,
  erro,
  obrigatorio = false,
}: CampoProps) {
  const idErro = `${id}-erro`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        autoComplete={autoComplete}
        required={obrigatorio}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className="rounded-md border border-white/10 bg-fundo px-3 py-2 text-texto outline-none focus:border-destaque"
      />
      {erro && (
        <span id={idErro} className="text-sm text-red-400">
          {erro}
        </span>
      )}
    </div>
  );
}

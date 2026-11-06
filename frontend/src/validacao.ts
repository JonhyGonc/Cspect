// Validação do cadastro no navegador. Espelha as regras de backend/app/schemas.py.
// O servidor valida de novo, então isto serve só para dar retorno antes do envio.

const PADRAO_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ErrosCadastro = {
  email?: string;
  senha?: string;
  nome?: string;
};

export function validarCadastro(email: string, senha: string, nome: string): ErrosCadastro {
  const erros: ErrosCadastro = {};

  const emailNormalizado = email.trim().toLowerCase();
  if (emailNormalizado.length > 254 || !PADRAO_EMAIL.test(emailNormalizado)) {
    erros.email = "Informe um e-mail válido.";
  }

  if (senha.length < 8) {
    erros.senha = "A senha precisa ter no mínimo 8 caracteres.";
  } else if (senha.length > 128) {
    erros.senha = "A senha pode ter no máximo 128 caracteres.";
  }

  const nomeLimpo = nome.trim();
  if (nomeLimpo.length < 1 || nomeLimpo.length > 40) {
    erros.nome = "O nome de exibição deve ter entre 1 e 40 caracteres.";
  }

  return erros;
}

// --- Jogadores (T3.2) ---------------------------------------------------------
// Espelha JogadorRequest em backend/app/schemas.py. Os limites contam caracteres
// como o Python (pontos de código), por isso usamos Array.from em vez de .length.

export const NICKNAME_MAX = 32;
export const OBSERVACOES_MAX = 500;
export const SECUNDARIAS_MAX = 5;

export function contarCaracteres(texto: string): number {
  return Array.from(texto).length;
}

export type ErrosJogador = {
  nickname?: string;
  funcaoPrincipal?: string;
  secundarias?: string;
  observacoes?: string;
};

export function validarJogador(
  nickname: string,
  funcaoPrincipalId: number | null,
  secundariasIds: number[],
  observacoes: string,
): ErrosJogador {
  const erros: ErrosJogador = {};

  const tamanhoNickname = contarCaracteres(nickname.trim());
  if (tamanhoNickname < 1 || tamanhoNickname > NICKNAME_MAX) {
    erros.nickname = `O nickname deve ter entre 1 e ${NICKNAME_MAX} caracteres.`;
  }

  if (funcaoPrincipalId === null) {
    erros.funcaoPrincipal = "Escolha a função principal.";
  }

  if (secundariasIds.length > SECUNDARIAS_MAX) {
    erros.secundarias = `Escolha no máximo ${SECUNDARIAS_MAX} funções secundárias.`;
  } else if (funcaoPrincipalId !== null && secundariasIds.includes(funcaoPrincipalId)) {
    erros.secundarias = "A função principal não pode ser também uma função secundária.";
  }

  if (contarCaracteres(observacoes) > OBSERVACOES_MAX) {
    erros.observacoes = `As observações podem ter no máximo ${OBSERVACOES_MAX} caracteres.`;
  }

  return erros;
}

// Prévia do avatar no formulário. Mesma regra de calcular_avatar em backend/app/jogadores.py:
// duas primeiras letras ou dígitos, em maiúsculas; sem nenhuma, os dois primeiros
// caracteres que não são espaço. O valor gravado é sempre o calculado pelo servidor.
export function previaAvatar(nickname: string): string {
  const caracteres = Array.from(nickname);
  const alfanumericos = caracteres.filter((c) => /[\p{L}\p{N}]/u.test(c));
  const base = alfanumericos.length > 0 ? alfanumericos : caracteres.filter((c) => !/\s/u.test(c));
  return Array.from(base.slice(0, 2).join("").toUpperCase()).slice(0, 2).join("");
}

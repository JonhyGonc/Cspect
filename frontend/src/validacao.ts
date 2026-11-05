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

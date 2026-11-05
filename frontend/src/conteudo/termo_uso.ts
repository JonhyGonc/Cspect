// Termo de uso exibido no cadastro (RF23).
// Ao alterar o texto, aumente VERSAO_TERMO: o aceite fica registrado com a versão.

export const VERSAO_TERMO = "0.1";

export const AVISO_RASCUNHO = "RASCUNHO — EM REVISÃO";

export const TITULO_TERMO = "Termo de uso";

export type SecaoTermo = {
  titulo: string;
  paragrafos: string[];
};

export const TERMO_USO: SecaoTermo[] = [
  {
    titulo: "1. Quem somos",
    paragrafos: [
      "O Cspect é uma plataforma independente, criada para montar, organizar e compartilhar táticas de Counter-Strike 2.",
      "A plataforma não tem vínculo oficial com a Valve Corporation.",
    ],
  },
  {
    titulo: "2. Propriedade do jogo",
    paragrafos: [
      "Counter-Strike 2 e seus elementos de propriedade intelectual pertencem aos respectivos titulares.",
    ],
  },
  {
    titulo: "3. Mapas",
    paragrafos: [
      "As representações gráficas dos mapas foram reconstruídas pela equipe do projeto.",
      "A reconstrução não transfere propriedade intelectual nem reivindica titularidade sobre os mapas.",
    ],
  },
  {
    titulo: "4. Nomes dos mapas",
    paragrafos: [
      "Os nomes dos mapas servem apenas para identificação e para mostrar compatibilidade com o jogo.",
    ],
  },
  {
    titulo: "5. Relação com a Valve",
    paragrafos: [
      "A plataforma não é patrocinada, aprovada ou endossada pela Valve.",
    ],
  },
  {
    titulo: "6. Dados que guardamos",
    paragrafos: [
      "Guardamos seu e-mail, um código derivado da sua senha (nunca a senha em si), o nome de exibição e a versão e a data do aceite deste termo.",
      "Suas táticas e jogadores ficam ligados à sua conta. Você pode excluir sua conta a qualquer momento.",
    ],
  },
  {
    titulo: "7. Contato",
    paragrafos: [
      "Para falar com o titular dos dados, escreva para contato.cspect@gmail.com.",
    ],
  },
];

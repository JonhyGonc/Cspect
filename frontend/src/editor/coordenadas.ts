// Conversão de coordenadas do editor.
//
// O dado (RF08) é sempre normalizado, de 0 a 1, em relação à orientação original do PNG:
// x cresce para a direita e y para baixo na imagem sem rotação.
// A rotação do mapa (0°, 90°, 180°, 270°, sentido horário) é só de visualização.
// Por isso, ao exibir, convertemos "original -> girado -> tela" e, ao arrastar,
// "tela -> girado -> original". Assim o ponto do mapa não muda quando o mapa gira.

export type Rotacao = 0 | 90 | 180 | 270;

export const ROTACOES: readonly Rotacao[] = [0, 90, 180, 270];

export type Ponto = { x: number; y: number };

// Retângulo em que o mapa (já girado) aparece na tela, em pixels do Stage.
export type Enquadramento = {
  x: number;
  y: number;
  largura: number;
  altura: number;
  // Fator entre pixels da imagem original e pixels da tela.
  escala: number;
};

export function proximaRotacao(atual: Rotacao): Rotacao {
  return ((atual + 90) % 360) as Rotacao;
}

export function limitar01(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

// Ponto normalizado da imagem original -> ponto normalizado da imagem girada.
export function originalParaGirado(p: Ponto, rotacao: Rotacao): Ponto {
  switch (rotacao) {
    case 0:
      return { x: p.x, y: p.y };
    case 90:
      return { x: 1 - p.y, y: p.x };
    case 180:
      return { x: 1 - p.x, y: 1 - p.y };
    case 270:
      return { x: p.y, y: 1 - p.x };
  }
}

// Inversa de originalParaGirado.
export function giradoParaOriginal(p: Ponto, rotacao: Rotacao): Ponto {
  switch (rotacao) {
    case 0:
      return { x: p.x, y: p.y };
    case 90:
      return { x: p.y, y: 1 - p.x };
    case 180:
      return { x: 1 - p.x, y: 1 - p.y };
    case 270:
      return { x: 1 - p.y, y: p.x };
  }
}

// Cabe o mapa girado na área disponível sem distorcer (como object-fit: contain),
// centralizado.
export function enquadrar(
  larguraImagem: number,
  alturaImagem: number,
  rotacao: Rotacao,
  larguraArea: number,
  alturaArea: number,
): Enquadramento {
  const deitado = rotacao === 90 || rotacao === 270;
  const larguraGirada = deitado ? alturaImagem : larguraImagem;
  const alturaGirada = deitado ? larguraImagem : alturaImagem;
  const escala = Math.max(0, Math.min(larguraArea / larguraGirada, alturaArea / alturaGirada));
  const largura = larguraGirada * escala;
  const altura = alturaGirada * escala;
  return {
    x: (larguraArea - largura) / 2,
    y: (alturaArea - altura) / 2,
    largura,
    altura,
    escala,
  };
}

// Ponto normalizado (orientação original) -> pixel do Stage.
export function normalizadoParaTela(p: Ponto, rotacao: Rotacao, quadro: Enquadramento): Ponto {
  const g = originalParaGirado(p, rotacao);
  return { x: quadro.x + g.x * quadro.largura, y: quadro.y + g.y * quadro.altura };
}

// Pixel do Stage -> ponto normalizado (orientação original), limitado ao mapa.
export function telaParaNormalizado(p: Ponto, rotacao: Rotacao, quadro: Enquadramento): Ponto {
  const g = {
    x: quadro.largura > 0 ? limitar01((p.x - quadro.x) / quadro.largura) : 0,
    y: quadro.altura > 0 ? limitar01((p.y - quadro.y) / quadro.altura) : 0,
  };
  return giradoParaOriginal(g, rotacao);
}

export function dentroDoQuadro(p: Ponto, quadro: Enquadramento): boolean {
  return p.x >= quadro.x && p.x <= quadro.x + quadro.largura && p.y >= quadro.y && p.y <= quadro.y + quadro.altura;
}

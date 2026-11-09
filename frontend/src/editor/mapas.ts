// Os sete mapas do MVP (RF07). As imagens são PNGs próprios da equipe (RNF13),
// servidos de frontend/public/mapas/ por caminho relativo.

export type Mapa = {
  id: string;
  nome: string;
  arquivo: string;
  // Tamanho do PNG em pixels (medido na T4.1). A miniatura do cartão usa a proporção sem
  // precisar carregar a imagem antes.
  largura: number;
  altura: number;
};

// Ordem alfabética do nome exibido.
export const MAPAS: readonly Mapa[] = [
  { id: "ancient", nome: "Ancient", arquivo: "/mapas/ancient.png", largura: 5176, altura: 4864 },
  { id: "anubis", nome: "Anubis", arquivo: "/mapas/anubis.png", largura: 4792, altura: 5252 },
  { id: "cache", nome: "Cache", arquivo: "/mapas/cache.png", largura: 5696, altura: 4416 },
  { id: "dust2", nome: "Dust II", arquivo: "/mapas/dust2.png", largura: 5016, altura: 5016 },
  { id: "inferno", nome: "Inferno", arquivo: "/mapas/inferno.png", largura: 5608, altura: 4488 },
  { id: "mirage", nome: "Mirage", arquivo: "/mapas/mirage.png", largura: 5412, altura: 4652 },
  { id: "nuke", nome: "Nuke", arquivo: "/mapas/nuke.png", largura: 8188, altura: 6060 },
];

export function mapaPorId(id: string): Mapa | null {
  return MAPAS.find((mapa) => mapa.id === id) ?? null;
}

// Os sete mapas do MVP (RF07). As imagens são PNGs próprios da equipe (RNF13),
// servidos de frontend/public/mapas/ por caminho relativo.

export type Mapa = {
  id: string;
  nome: string;
  arquivo: string;
};

// Ordem alfabética do nome exibido.
export const MAPAS: readonly Mapa[] = [
  { id: "ancient", nome: "Ancient", arquivo: "/mapas/ancient.png" },
  { id: "anubis", nome: "Anubis", arquivo: "/mapas/anubis.png" },
  { id: "cache", nome: "Cache", arquivo: "/mapas/cache.png" },
  { id: "dust2", nome: "Dust II", arquivo: "/mapas/dust2.png" },
  { id: "inferno", nome: "Inferno", arquivo: "/mapas/inferno.png" },
  { id: "mirage", nome: "Mirage", arquivo: "/mapas/mirage.png" },
  { id: "nuke", nome: "Nuke", arquivo: "/mapas/nuke.png" },
];

export function mapaPorId(id: string): Mapa | null {
  return MAPAS.find((mapa) => mapa.id === id) ?? null;
}

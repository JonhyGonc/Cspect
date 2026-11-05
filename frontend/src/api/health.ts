export type ServiceStatus = {
  status: "ok" | "error";
  message?: string;
};

export type HealthResponse = {
  api: ServiceStatus;
  database: ServiceStatus;
};

// Retorna o status da API e do banco.
// Se o backend estiver fora do ar, retorna null em vez de lançar erro.
export async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return null;
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}

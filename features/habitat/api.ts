export class HabitatApiError extends Error {
  constructor(public code: string, public status: number, message: string) {super(message);}
}
export async function habitatApi<T>(path: string, body?: unknown, method?: 'POST' | 'DELETE'): Promise<T> {
  const response = await fetch(`/api/habitat/${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: body === undefined ? {} : {'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store',
  });
  const data = await response.json() as {code?: string; detail?: string};
  if (!response.ok) throw new HabitatApiError(data.code ?? 'WORLD_UNAVAILABLE', response.status, data.detail ?? 'World unavailable');
  return data as T;
}

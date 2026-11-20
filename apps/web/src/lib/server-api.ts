import "server-only";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Server-side fetch to the API (Server Components / route handlers).
 * `authenticated` adds the dashboard API key; public endpoints (e.g. /public/landings) don't need it.
 */
export async function serverApi<T>(path: string, init: RequestInit & { authenticated?: boolean } = {}): Promise<T> {
  const { authenticated = true, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(authenticated ? { "x-api-key": process.env.WEB_API_KEY ?? "" } : {}),
      ...headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = new Error(`API ${res.status} on ${path}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

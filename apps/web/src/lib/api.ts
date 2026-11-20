/**
 * Browser-side API client. Every call goes through the Next.js route handler
 * /api/proxy/* which injects the server-side API key, so the key never reaches the browser.
 * Paths are relative to the API's /api/v1 prefix, e.g. api.get("/qrs").
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`/api/proxy${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: body !== undefined && !isForm ? { "content-type": "application/json" } : undefined,
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, data?.message ?? res.statusText, data?.details);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  /** Uploads an image (png/jpeg/webp/svg) and returns its public URL. */
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string; mime: string; width?: number; height?: number }>("POST", "/assets", form);
  },
};

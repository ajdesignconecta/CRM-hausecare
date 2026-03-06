const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

function normalizeApiBase(url: string): string {
  // Requests already use paths starting with /api, so avoid /api/api when env is misconfigured.
  return url.replace(/\/+$/, "").replace(/\/api$/, "");
}

export const API_URL = normalizeApiBase(rawApiUrl);

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(body?.message ?? "Erro na requisição", response.status);
  }

  return body as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const hasJsonBody = init?.body !== undefined && !(init.body instanceof FormData);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  return parseResponse<T>(response);
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: formData,
    credentials: "include",
    cache: "no-store"
  });

  return parseResponse<T>(response);
}

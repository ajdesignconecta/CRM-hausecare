const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

function normalizeApiBase(url: string): string {
  // Requests already use paths starting with /api, so avoid /api/api when env is misconfigured.
  return url.replace(/\/+$/, "").replace(/\/api$/, "");
}

export const API_URL = normalizeApiBase(rawApiUrl);

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

function defaultMessageByStatus(status: number): string {
  if (status === 400) return "Dados invalidos. Revise os campos e tente novamente.";
  if (status === 401) return "Credenciais invalidas ou sessao expirada.";
  if (status === 403) return "Voce nao tem permissao para esta acao.";
  if (status === 404) return "Recurso nao encontrado.";
  if (status === 409) return "Conflito de dados. Revise as informacoes.";
  if (status === 429) return "Muitas tentativas. Aguarde e tente novamente.";
  if (status >= 500) return "Erro interno do servidor. Tente novamente em instantes.";
  return "Erro na requisicao.";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(body?.message ?? defaultMessageByStatus(response.status), response.status, body?.code);
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

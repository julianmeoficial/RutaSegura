import { errorMessage, isUiErrorCode, type UiErrorCode } from "./error-messages";

export type ApiFailureCode = UiErrorCode;

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | {
      ok: false;
      status: number;
      code: ApiFailureCode;
      message: string;
      /** Segundos de `Retry-After` en un 429. */
      retryAfter?: number;
    };

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Ante un 401, intenta una sola vez renovar la sesión y repetir la petición. */
  refreshOnUnauthorized?: boolean;
  fetchImpl?: typeof fetch;
};

async function send(path: string, options: Options): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const hasBody = options.body !== undefined;
  return fetchImpl(path, {
    method: options.method ?? "GET",
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
}

async function toResult<T>(response: Response): Promise<ApiResult<T>> {
  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok) return { ok: true, status: response.status, data: data as T };

  const rawCode = (data as { error?: { code?: unknown } } | null)?.error?.code;
  const code: ApiFailureCode =
    isUiErrorCode(rawCode) && rawCode !== "network_error" ? rawCode : "internal_error";
  const retryAfterHeader = Number(response.headers.get("retry-after"));
  return {
    ok: false,
    status: response.status,
    code,
    message: errorMessage(code),
    retryAfter:
      response.status === 429 && Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader
        : undefined,
  };
}

/**
 * Llama a la API del mismo origen con rutas relativas (CSP `connect-src 'self'`).
 * Las cookies de sesión son HttpOnly: este módulo nunca las lee.
 */
export async function apiRequest<T>(path: string, options: Options = {}): Promise<ApiResult<T>> {
  try {
    let response = await send(path, options);
    if (response.status === 401 && options.refreshOnUnauthorized !== false) {
      const refreshed = await send("/api/v1/auth/refresh", {
        method: "POST",
        fetchImpl: options.fetchImpl,
      });
      if (refreshed.ok) response = await send(path, options);
    }
    return await toResult<T>(response);
  } catch {
    return { ok: false, status: 0, code: "network_error", message: errorMessage("network_error") };
  }
}

import "server-only";
import { API_ERRORS, type ApiError, type ApiErrorCode } from "@rutasegura/contracts";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Respuesta de error uniforme. El cuerpo depende solo del código, nunca de la
 * causa interna, para no distinguir casos que deben verse iguales.
 */
export function apiError(code: ApiErrorCode, init: { headers?: HeadersInit } = {}): Response {
  const { status, message } = API_ERRORS[code];
  const body: ApiError = { error: { code, message } };
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", NO_STORE["Cache-Control"]);
  return Response.json(body, { status, headers });
}

export function apiJson<T>(body: T, init: { status?: number } = {}): Response {
  return Response.json(body, { status: init.status ?? 200, headers: NO_STORE });
}

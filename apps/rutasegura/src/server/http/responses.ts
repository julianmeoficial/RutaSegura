import "server-only";
import { API_ERRORS, type ApiError, type ApiErrorCode } from "@rutasegura/contracts";

const NO_STORE = "no-store";

type ResponseInit = { status?: number; headers?: HeadersInit };

/**
 * Respuesta de error uniforme. El cuerpo depende solo del código, nunca de la
 * causa interna, para no distinguir casos que deben verse iguales.
 */
export function apiError(code: ApiErrorCode, init: { headers?: HeadersInit } = {}): Response {
  const { status, message } = API_ERRORS[code];
  const body: ApiError = { error: { code, message } };
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", NO_STORE);
  return Response.json(body, { status, headers });
}

export function apiJson<T>(body: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", NO_STORE);
  return Response.json(body, { status: init.status ?? 200, headers });
}

export function apiEmpty(init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", NO_STORE);
  return new Response(null, { status: init.status ?? 204, headers });
}

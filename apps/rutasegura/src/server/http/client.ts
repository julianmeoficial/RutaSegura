import "server-only";
import { getEnv } from "@/server/env";

const USER_AGENT_MAX_LENGTH = 200;

/** Clave de rate limit cuando no hay proxy de confianza (IP de socket no disponible en Request). */
export const DIRECT_CLIENT_IP = "direct";

export type ClientIpOptions = {
  /** Si se omite, usa `getEnv().TRUST_PROXY`. */
  trustProxy?: boolean;
};

/**
 * IP del cliente para rate limiting y auditoría.
 *
 * Sin proxy de confianza ignora `X-Forwarded-For` / `X-Real-IP` (falsificables) y
 * devuelve `direct`, de modo que dos peticiones con distinto XFF comparten la
 * misma clave `rl:login:ip`.
 *
 * Con proxy de confianza (Vercel, nginx, Caddy) toma el valor más a la derecha
 * de `X-Forwarded-For`, que es el que añade el proxy.
 */
export function clientIp(request: Request, options?: ClientIpOptions): string {
  const trustProxy = options?.trustProxy ?? getEnv().TRUST_PROXY;
  if (!trustProxy) return DIRECT_CLIENT_IP;

  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || request.headers.get("x-real-ip")?.trim() || DIRECT_CLIENT_IP;
}

export function userAgent(request: Request): string | null {
  const value = request.headers.get("user-agent");
  return value ? value.slice(0, USER_AGENT_MAX_LENGTH) : null;
}

const JSON_BODY_MAX_BYTES = 16 * 1024;

/**
 * Lee un cuerpo JSON de hasta 16 KiB sin lanzar: un cuerpo inválido, demasiado
 * grande o con otro tipo de contenido equivale a `undefined`.
 */
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return undefined;
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > JSON_BODY_MAX_BYTES) return undefined;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > JSON_BODY_MAX_BYTES) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

import "server-only";
import { keyedDigest } from "@/server/auth/digest";
import { getEnv } from "@/server/env";
import { clientIp } from "@/server/http/client";
import { logger } from "@/server/logger";

export type AuthFailureReason =
  "missing_token" | "invalid_token" | "session_inactive" | "user_not_found" | "refresh_invalid";

/** `ownership` cubre recurso ajeno o inexistente: al cliente siempre se le responde 404. */
export type AccessDeniedReason = "ownership";

/**
 * Campos comunes de un evento de seguridad: ruta lógica, método y la IP solo
 * como HMAC. Nunca el token, la cookie, el correo, la guía ni el cuerpo.
 */
function context(request: Request, route: string): Record<string, unknown> {
  return { route, method: request.method, ipHash: ipHashOf(request) };
}

function ipHashOf(request: Request): string | undefined {
  try {
    return keyedDigest(getEnv().HMAC_SECRET, "log-ip", clientIp(request));
  } catch {
    return undefined;
  }
}

export function logAuthFailure(request: Request, route: string, reason: AuthFailureReason) {
  logger.warn("security.auth_failure", { ...context(request, route), reason });
}

/** Fallo de sesión al renderizar una página del portal (Server Component). */
export function logPageAuthFailure(
  requestHeaders: Headers,
  route: string,
  reason: Exclude<AuthFailureReason, "missing_token" | "refresh_invalid">,
) {
  const ipHash = ipHashOf(new Request("http://page.internal/", { headers: requestHeaders }));
  logger.warn("security.auth_failure", { source: "page", route, method: "GET", ipHash, reason });
}

export function logAccessDenied(request: Request, route: string, reason: AccessDeniedReason) {
  logger.warn("security.access_denied", { ...context(request, route), reason });
}

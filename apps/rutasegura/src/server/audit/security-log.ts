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
  let ipHash: string | undefined;
  try {
    ipHash = keyedDigest(getEnv().HMAC_SECRET, "log-ip", clientIp(request));
  } catch {
    ipHash = undefined;
  }
  return { route, method: request.method, ipHash };
}

export function logAuthFailure(request: Request, route: string, reason: AuthFailureReason) {
  logger.warn("security.auth_failure", { ...context(request, route), reason });
}

export function logAccessDenied(request: Request, route: string, reason: AccessDeniedReason) {
  logger.warn("security.access_denied", { ...context(request, route), reason });
}

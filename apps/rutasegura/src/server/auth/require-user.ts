import "server-only";
import type { AuthUser } from "@rutasegura/contracts";
import { logAuthFailure, type AuthFailureReason } from "@/server/audit/security-log";
import { getEnv } from "@/server/env";
import { apiError } from "@/server/http/responses";
import { isSessionActive } from "@/server/repositories/sessions";
import { findUserById, toAuthUser } from "@/server/repositories/users";
import { cookieNames, isHttpsRequest, readCookie } from "./cookies";
import { verifyAccessToken, type TokenConfig } from "./tokens";

export function tokenConfig(): TokenConfig {
  const env = getEnv();
  return {
    secret: env.SESSION_SECRET,
    issuer: new URL(env.NEXT_PUBLIC_APP_URL).origin,
    ttlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  };
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: Exclude<AuthFailureReason, "refresh_invalid"> };

/**
 * Resuelve el usuario de la petición. Además de validar el JWT, comprueba que
 * su sesión siga vigente: el logout surte efecto de inmediato aunque el token
 * aún no haya vencido. El motivo del fallo es solo para el log de seguridad.
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const token = readCookie(request, cookieNames(isHttpsRequest(request)).access);
  if (!token) return { ok: false, reason: "missing_token" };

  const claims = await verifyAccessToken(token, tokenConfig());
  if (!claims) return { ok: false, reason: "invalid_token" };

  if (!(await isSessionActive(claims.sessionId))) return { ok: false, reason: "session_inactive" };

  const user = await findUserById(claims.userId);
  return user ? { ok: true, user: toAuthUser(user) } : { ok: false, reason: "user_not_found" };
}

/** Usuario autenticado de la petición, o `null`. */
export async function authenticate(request: Request): Promise<AuthUser | null> {
  const result = await authenticateRequest(request);
  return result.ok ? result.user : null;
}

/**
 * Usuario autenticado o la respuesta `401` lista. Cada fallo queda en el log
 * de seguridad con su motivo; al cliente siempre se le responde igual.
 */
export async function requireUser(request: Request, route: string): Promise<AuthUser | Response> {
  const result = await authenticateRequest(request);
  if (result.ok) return result.user;
  logAuthFailure(request, route, result.reason);
  return apiError("unauthorized");
}

import "server-only";
import type { AuthUser } from "@rutasegura/contracts";
import { getEnv } from "@/server/env";
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

/**
 * Usuario autenticado de la petición, o `null`. Además de validar el JWT,
 * comprueba que su sesión siga vigente: el logout surte efecto de inmediato
 * aunque el token aún no haya vencido.
 */
export async function authenticate(request: Request): Promise<AuthUser | null> {
  const token = readCookie(request, cookieNames(isHttpsRequest(request)).access);
  if (!token) return null;

  const claims = await verifyAccessToken(token, tokenConfig());
  if (!claims) return null;

  if (!(await isSessionActive(claims.sessionId))) return null;

  const user = await findUserById(claims.userId);
  return user ? toAuthUser(user) : null;
}

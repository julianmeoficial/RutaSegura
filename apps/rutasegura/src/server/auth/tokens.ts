import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { userRoleSchema, type UserRole } from "@rutasegura/contracts";

export const ACCESS_TOKEN_AUDIENCE = "rutasegura-api";
const ALGORITHM = "HS256";

export type TokenConfig = {
  secret: string;
  issuer: string;
  ttlSeconds: number;
};

export type AccessClaims = {
  userId: string;
  role: UserRole;
  sessionId: string;
};

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(claims: AccessClaims, config: TokenConfig): Promise<string> {
  return new SignJWT({ role: claims.role, sid: claims.sessionId })
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setSubject(claims.userId)
    .setIssuer(config.issuer)
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${config.ttlSeconds}s`)
    .sign(key(config.secret));
}

/**
 * Valida firma, algoritmo, emisor, audiencia y vencimiento. Devuelve `null`
 * ante cualquier fallo: quien llama no necesita saber por qué se rechazó.
 */
export async function verifyAccessToken(
  token: string,
  config: Pick<TokenConfig, "secret" | "issuer">,
): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(config.secret), {
      algorithms: [ALGORITHM],
      issuer: config.issuer,
      audience: ACCESS_TOKEN_AUDIENCE,
      requiredClaims: ["sub", "sid", "exp", "iat", "jti"],
      clockTolerance: 5,
    });
    const role = userRoleSchema.safeParse(payload.role);
    if (!payload.sub || typeof payload.sid !== "string" || !role.success) return null;
    return { userId: payload.sub, role: role.data, sessionId: payload.sid };
  } catch {
    return null;
  }
}

/** Refresh token opaco de 256 bits; en la base solo se guarda su HMAC. */
export function createRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

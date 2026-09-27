import "server-only";
import { randomUUID } from "node:crypto";
import type { AuthUser, LoginRequest, RegisterRequest } from "@rutasegura/contracts";
import { recordAuthEvent } from "@/server/audit/auth-events";
import type { SessionCookies } from "@/server/auth/cookies";
import { keyedDigest } from "@/server/auth/digest";
import {
  isLocked,
  lockDurationSeconds,
  shouldLock,
  type LockoutPolicy,
} from "@/server/auth/lockout";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { tokenConfig } from "@/server/auth/require-user";
import { createRefreshToken, signAccessToken, verifyAccessToken } from "@/server/auth/tokens";
import { getEnv } from "@/server/env";
import {
  findSessionByTokenHash,
  insertSession,
  revokeFamily,
  revokeSession,
  rotateSession,
} from "@/server/repositories/sessions";
import {
  clearLockout,
  findUserByEmail,
  findUserById,
  incrementFailedLogins,
  insertUser,
  lockAccount,
  toAuthUser,
} from "@/server/repositories/users";

export type RequestContext = { ip: string; userAgent: string | null };

export type AuthSuccess = { ok: true; user: AuthUser; cookies: SessionCookies };
export type AuthResult = AuthSuccess | { ok: false };

function lockoutPolicy(): LockoutPolicy {
  const env = getEnv();
  return {
    threshold: env.LOCKOUT_THRESHOLD,
    baseSeconds: env.LOCKOUT_BASE_SECONDS,
    maxSeconds: env.LOCKOUT_MAX_SECONDS,
  };
}

function refreshTokenHash(token: string): string {
  return keyedDigest(getEnv().HMAC_SECRET, "refresh-token", token);
}

function ipHash(ip: string): string {
  return keyedDigest(getEnv().HMAC_SECRET, "session-ip", ip);
}

async function issueCookies(user: AuthUser, sessionId: string, refreshToken: string) {
  const env = getEnv();
  const accessToken = await signAccessToken(
    { userId: user.id, role: user.role, sessionId },
    tokenConfig(),
  );
  return {
    accessToken,
    accessMaxAge: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshMaxAge: env.SESSION_TTL_SECONDS,
  } satisfies SessionCookies;
}

/**
 * Crea la cuenta si el correo no existía. Hashea siempre, también en el caso
 * duplicado, para que el tiempo de respuesta no delate cuentas existentes.
 */
export async function register(input: RegisterRequest, ctx: RequestContext): Promise<void> {
  const passwordHash = await hashPassword(input.password);
  const user = await insertUser({ email: input.email, fullName: input.fullName, passwordHash });
  await recordAuthEvent({
    type: user ? "register_success" : "register_duplicate",
    userId: user?.id ?? null,
    subject: input.email,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

export async function login(input: LoginRequest, ctx: RequestContext): Promise<AuthResult> {
  const env = getEnv();
  const policy = lockoutPolicy();
  const audit = { subject: input.email, ip: ctx.ip, userAgent: ctx.userAgent };

  const user = await findUserByEmail(input.email);
  const valid = await verifyPassword(user?.passwordHash ?? null, input.password);

  if (!user) {
    await recordAuthEvent({ type: "login_failure", ...audit });
    return { ok: false };
  }

  if (isLocked(user.lockedUntil, new Date())) {
    await recordAuthEvent({ type: "login_locked", userId: user.id, ...audit });
    return { ok: false };
  }

  if (!valid) {
    await recordAuthEvent({ type: "login_failure", userId: user.id, ...audit });
    const counter = await incrementFailedLogins(user.id);
    if (counter && shouldLock(counter.failedLoginCount, policy)) {
      const seconds = lockDurationSeconds(counter.lockoutLevel, policy);
      if (await lockAccount(user.id, policy.threshold, seconds)) {
        await recordAuthEvent({ type: "account_locked", userId: user.id, ...audit });
      }
    }
    return { ok: false };
  }

  if (user.failedLoginCount > 0 || user.lockoutLevel > 0 || user.lockedUntil) {
    await clearLockout(user.id);
  }

  const refreshToken = createRefreshToken();
  const session = await insertSession({
    userId: user.id,
    familyId: randomUUID(),
    tokenHash: refreshTokenHash(refreshToken),
    expiresAt: new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000),
    ipHash: ipHash(ctx.ip),
    userAgent: ctx.userAgent,
  });

  await recordAuthEvent({ type: "login_success", userId: user.id, ...audit });
  const authUser = toAuthUser(user);
  return {
    ok: true,
    user: authUser,
    cookies: await issueCookies(authUser, session.id, refreshToken),
  };
}

/**
 * Rota el refresh token. Presentar uno ya rotado indica que fue robado (o que
 * el legítimo lo usó después del atacante): se revoca toda la familia.
 */
export async function refresh(refreshToken: string, ctx: RequestContext): Promise<AuthResult> {
  const env = getEnv();
  const session = await findSessionByTokenHash(refreshTokenHash(refreshToken));
  if (!session) return { ok: false };

  if (session.revokedAt) {
    if (session.replacedBy) {
      await revokeFamily(session.familyId);
      await recordAuthEvent({
        type: "refresh_reuse",
        userId: session.userId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
    return { ok: false };
  }

  if (session.expiresAt.getTime() <= Date.now()) return { ok: false };

  const user = await findUserById(session.userId);
  if (!user) return { ok: false };

  const nextToken = createRefreshToken();
  const next = await rotateSession(session, {
    tokenHash: refreshTokenHash(nextToken),
    expiresAt: new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000),
    ipHash: ipHash(ctx.ip),
    userAgent: ctx.userAgent,
  });
  if (!next) return { ok: false };

  await recordAuthEvent({ type: "refresh", userId: user.id, ip: ctx.ip, userAgent: ctx.userAgent });
  const authUser = toAuthUser(user);
  return { ok: true, user: authUser, cookies: await issueCookies(authUser, next.id, nextToken) };
}

/** Revoca la sesión identificada por el refresh token o por el access token. */
export async function logout(
  tokens: { refreshToken?: string; accessToken?: string },
  ctx: RequestContext,
): Promise<void> {
  let sessionId: string | undefined;
  let userId: string | undefined;

  if (tokens.refreshToken) {
    const session = await findSessionByTokenHash(refreshTokenHash(tokens.refreshToken));
    sessionId = session?.id;
    userId = session?.userId;
  }
  if (!sessionId && tokens.accessToken) {
    const claims = await verifyAccessToken(tokens.accessToken, tokenConfig());
    sessionId = claims?.sessionId;
    userId = claims?.userId;
  }
  if (!sessionId) return;

  await revokeSession(sessionId);
  await recordAuthEvent({ type: "logout", userId, ip: ctx.ip, userAgent: ctx.userAgent });
}

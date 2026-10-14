import "server-only";
import { keyedDigest } from "@/server/auth/digest";
import { getEnv } from "@/server/env";
import { getConnectedRedis } from "@/server/redis";
import { consumeAll, type RateLimitResult, type RateLimitRule } from "./limiter";

/** Las claves nunca contienen la IP, el correo ni la guía en claro. */
function ruleKey(scope: string, dimension: string, value: string): string {
  const { HMAC_SECRET } = getEnv();
  return `rl:${scope}:${dimension}:${keyedDigest(HMAC_SECRET, `rl-${dimension}`, value)}`;
}

export function loginRules(ip: string, email: string): RateLimitRule[] {
  const env = getEnv();
  const windowSeconds = env.LOGIN_RATE_LIMIT_WINDOW_SECONDS;
  return [
    { key: ruleKey("login", "ip", ip), limit: env.LOGIN_RATE_LIMIT_IP_MAX, windowSeconds },
    { key: ruleKey("login", "email", email), limit: env.LOGIN_RATE_LIMIT_EMAIL_MAX, windowSeconds },
  ];
}

export function registerRules(ip: string): RateLimitRule[] {
  const env = getEnv();
  return [
    {
      key: ruleKey("register", "ip", ip),
      limit: env.REGISTER_RATE_LIMIT_MAX,
      windowSeconds: env.REGISTER_RATE_LIMIT_WINDOW_SECONDS,
    },
  ];
}

export function trackingRules(ip: string, trackingNumber: string): RateLimitRule[] {
  const env = getEnv();
  const limit = env.TRACKING_RATE_LIMIT_MAX;
  const windowSeconds = env.TRACKING_RATE_LIMIT_WINDOW_SECONDS;
  return [
    { key: ruleKey("tracking", "ip", ip), limit, windowSeconds },
    { key: ruleKey("tracking", "guide", trackingNumber), limit, windowSeconds },
  ];
}

/** Listar, consultar y agendar envíos: límite por usuario, con su id como HMAC. */
export function shipmentsRules(userId: string): RateLimitRule[] {
  const env = getEnv();
  return [
    {
      key: ruleKey("shipments", "user", userId),
      limit: env.SHIPMENTS_RATE_LIMIT_MAX,
      windowSeconds: env.SHIPMENTS_RATE_LIMIT_WINDOW_SECONDS,
    },
  ];
}

/** Consultar y marcar avisos: límite por usuario, con su id como HMAC. */
export function notificationsRules(userId: string): RateLimitRule[] {
  const env = getEnv();
  return [
    {
      key: ruleKey("notifications", "user", userId),
      limit: env.NOTIFICATIONS_RATE_LIMIT_MAX,
      windowSeconds: env.NOTIFICATIONS_RATE_LIMIT_WINDOW_SECONDS,
    },
  ];
}

/** Listar documentos y pedir URLs firmadas: límite por usuario, con su id como HMAC. */
export function documentsRules(userId: string): RateLimitRule[] {
  const env = getEnv();
  return [
    {
      key: ruleKey("documents", "user", userId),
      limit: env.DOCUMENTS_RATE_LIMIT_MAX,
      windowSeconds: env.DOCUMENTS_RATE_LIMIT_WINDOW_SECONDS,
    },
  ];
}

/**
 * Aplica las reglas en Redis. Si Redis no responde, lanza: los endpoints de
 * autenticación fallan cerrados (503) en lugar de quedar sin límite.
 */
export async function applyRateLimit(rules: RateLimitRule[]): Promise<RateLimitResult> {
  const redis = await getConnectedRedis(getEnv().REDIS_URL);
  return consumeAll(redis, rules);
}

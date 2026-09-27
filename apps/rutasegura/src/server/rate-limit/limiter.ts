import "server-only";

/**
 * Ventana fija atómica: incrementa el contador y, si es el primer golpe (o la
 * clave quedó sin vencimiento), fija la expiración. Devuelve cuenta y ms restantes.
 */
const FIXED_WINDOW_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

export type RateLimitStore = {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
};

export type RateLimitRule = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

export async function consume(
  store: RateLimitStore,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const reply = await store.eval(FIXED_WINDOW_SCRIPT, 1, rule.key, rule.windowSeconds * 1000);
  const [count, ttlMs] = reply as [number, number];
  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(rule.limit - count, 0),
    resetSeconds: Math.max(Math.ceil(ttlMs / 1000), 1),
  };
}

/**
 * Consume todas las reglas y devuelve la más restrictiva: la primera que se
 * excedió o, si ninguna, la de menor saldo.
 */
export async function consumeAll(
  store: RateLimitStore,
  rules: RateLimitRule[],
): Promise<RateLimitResult> {
  const results = await Promise.all(rules.map((rule) => consume(store, rule)));
  const blocked = results.filter((result) => !result.allowed);
  if (blocked.length > 0) {
    return blocked.reduce((a, b) => (a.resetSeconds >= b.resetSeconds ? a : b));
  }
  return results.reduce((a, b) => (a.remaining <= b.remaining ? a : b));
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.resetSeconds),
  };
  if (!result.allowed) headers["Retry-After"] = String(result.resetSeconds);
  return headers;
}

import { beforeAll } from "vitest";
import Redis from "ioredis";

/**
 * Sin TRUST_PROXY todas las peticiones comparten la clave IP `direct`.
 * Cada archivo smoke parte con contadores limpios para no heredar el cupo
 * agotado por rate-limit intencional del archivo anterior.
 */
beforeAll(async () => {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  try {
    await redis.connect();
    const keys = await redis.keys("rl:*");
    if (keys.length > 0) await redis.del(...keys);
  } finally {
    redis.disconnect();
  }
});

import "server-only";
import Redis from "ioredis";
import { errorKind, logger } from "./logger";

const globalForRedis = globalThis as unknown as { rutaseguraRedis?: Redis };

export function getRedis(redisUrl: string): Redis {
  if (!globalForRedis.rutaseguraRedis) {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      connectTimeout: 2_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on("error", (error) =>
      logger.debug("redis.connection_error", { kind: errorKind(error) }),
    );
    globalForRedis.rutaseguraRedis = client;
  }
  return globalForRedis.rutaseguraRedis;
}

export async function pingRedis(client: Redis): Promise<void> {
  if (client.status === "wait" || client.status === "end") {
    await client.connect();
  }
  await client.ping();
}

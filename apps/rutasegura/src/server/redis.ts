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

async function ensureConnected(client: Redis): Promise<void> {
  if (client.status === "wait" || client.status === "end") {
    await client.connect();
  }
}

export async function pingRedis(client: Redis): Promise<void> {
  await ensureConnected(client);
  await client.ping();
}

/** Cliente listo para comandos; lanza si Redis no está disponible. */
export async function getConnectedRedis(redisUrl: string): Promise<Redis> {
  const client = getRedis(redisUrl);
  await ensureConnected(client);
  return client;
}

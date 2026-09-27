import { getDatabase, pingDatabase } from "@rutasegura/database";
import { getEnv } from "@/server/env";
import { apiJson } from "@/server/http/responses";
import { getRedis, pingRedis } from "@/server/redis";
import { checkHealth } from "@/server/services/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnv();

  const health = await checkHealth({
    database: () => pingDatabase(getDatabase(env.DATABASE_URL)),
    redis: () => pingRedis(getRedis(env.REDIS_URL)),
  });

  return apiJson(health, { status: health.status === "ok" ? 200 : 503 });
}

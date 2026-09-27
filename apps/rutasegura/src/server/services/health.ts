import "server-only";
import type { DependencyStatus, HealthResponse } from "@rutasegura/contracts";
import { errorKind, logger } from "../logger";

export type HealthChecks = Record<keyof HealthResponse["checks"], () => Promise<void>>;

const CHECK_TIMEOUT_MS = 2_000;

async function runCheck(
  name: string,
  check: () => Promise<void>,
  timeoutMs: number,
): Promise<DependencyStatus> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("HealthCheckTimeout")), timeoutMs);
  });

  try {
    await Promise.race([check(), timeout]);
    return "ok";
  } catch (error) {
    logger.error("health.dependency_failed", { dependency: name, kind: errorKind(error) });
    return "error";
  } finally {
    clearTimeout(timer);
  }
}

export async function checkHealth(
  checks: HealthChecks,
  timeoutMs = CHECK_TIMEOUT_MS,
): Promise<HealthResponse> {
  const [database, redis] = await Promise.all([
    runCheck("database", checks.database, timeoutMs),
    runCheck("redis", checks.redis, timeoutMs),
  ]);

  return {
    status: database === "ok" && redis === "ok" ? "ok" : "error",
    checks: { database, redis },
  };
}

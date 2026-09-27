import "server-only";
import { getEnv } from "./env";
import { logger } from "./logger";

/**
 * Next registra el error de instrumentation pero deja el servidor escuchando;
 * con configuración inválida el proceso debe terminar para que el
 * orquestador lo marque como caído.
 */
export function assertValidEnvironment() {
  try {
    getEnv();
  } catch (error) {
    logger.error("startup.invalid_environment", {
      detail: error instanceof Error ? error.message : "UnknownError",
    });
    process.exit(1);
  }
}

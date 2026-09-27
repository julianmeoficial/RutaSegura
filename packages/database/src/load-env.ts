import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Carga el `.env` de la raíz del monorepo para drizzle-kit y la semilla. Las
 * variables ya definidas (por ejemplo las de Compose) tienen prioridad.
 */
export function loadRootEnv(): void {
  const path = fileURLToPath(new URL("../../../.env", import.meta.url));
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

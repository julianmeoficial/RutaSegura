import "server-only";
import { unstable_rethrow } from "next/navigation";
import { errorKind, logger } from "@/server/logger";

/**
 * Error sin detalles que llega a los error boundaries. Next imprime en stderr
 * el error original de un Server Component, y el de Drizzle incluye la consulta
 * y sus parámetros (IDs de sesión o de usuario); este no lleva nada.
 */
export class PageDataError extends Error {
  constructor() {
    super("internal_error");
    this.name = "PageDataError";
  }
}

/** Registra el fallo como evento estructurado y devuelve el error sin detalles. */
export function pageFailure(route: string, error: unknown): PageDataError {
  logger.error("page.unhandled_error", { route, kind: errorKind(error) });
  return new PageDataError();
}

/**
 * Datos de una página del servidor con el mismo trato de errores que la API:
 * `redirect` y `notFound` siguen su curso; cualquier otro fallo queda en el log
 * sin mensaje ni parámetros y se muestra la página de error genérica.
 */
export async function pageData<T>(route: string, load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    unstable_rethrow(error);
    throw pageFailure(route, error);
  }
}

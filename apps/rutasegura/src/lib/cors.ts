/**
 * CORS de la API con allowlist de orígenes exactos. Sin comodines: con
 * credenciales, `Access-Control-Allow-Origin: *` no es válido y además
 * abriría la API a cualquier sitio.
 *
 * Este módulo no depende de secretos ni de `server-only`: lo usan proxy.ts y env.ts.
 */

export const CORS_ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE";
export const CORS_ALLOWED_HEADERS = "Content-Type";
export const CORS_MAX_AGE_SECONDS = 600;

type ParseOptions = { requireHttps: boolean };

/**
 * Normaliza `CORS_ALLOWED_ORIGINS` (lista separada por comas) a orígenes
 * exactos. El origen de la app siempre está incluido. Lanza un error si una
 * entrada es un comodín, trae ruta, query o credenciales, o no es http(s).
 */
export function parseAllowedOrigins(
  raw: string | undefined,
  appUrl: string,
  { requireHttps }: ParseOptions,
): string[] {
  const origins = new Set<string>([new URL(appUrl).origin]);
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    if (entry.includes("*")) {
      throw new Error("CORS_ALLOWED_ORIGINS no admite comodines");
    }
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      throw new Error("CORS_ALLOWED_ORIGINS contiene una URL inválida");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("CORS_ALLOWED_ORIGINS solo admite http o https");
    }
    if (requireHttps && url.protocol !== "https:") {
      throw new Error("CORS_ALLOWED_ORIGINS debe usar https en producción");
    }
    if (entry.replace(/\/$/, "") !== url.origin) {
      throw new Error("CORS_ALLOWED_ORIGINS debe contener solo orígenes, sin ruta ni query");
    }
    origins.add(url.origin);
  }

  return [...origins];
}

export function isAllowedOrigin(origin: string | null, allowlist: readonly string[]): boolean {
  return origin !== null && allowlist.includes(origin);
}

/** Cabeceras para una respuesta a un origen de la allowlist. */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

/** Cabeceras adicionales de una respuesta de preflight aceptada. */
export function preflightHeaders(origin: string): Record<string, string> {
  return {
    ...corsHeaders(origin),
    "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
    "Access-Control-Max-Age": String(CORS_MAX_AGE_SECONDS),
  };
}

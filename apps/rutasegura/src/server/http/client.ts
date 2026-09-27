import "server-only";

const USER_AGENT_MAX_LENGTH = 200;

/**
 * IP del cliente: el valor más a la derecha de `X-Forwarded-For`, que es el que
 * añade el proxy de confianza. Next solo completa la cabecera con la IP del
 * socket si el cliente no la envió, así que sin un proxy delante que la
 * sobrescriba o la extienda (Vercel, nginx, Caddy) este valor es falsificable.
 * Por eso los límites por correo y por guía, y el bloqueo por cuenta, no
 * dependen de la IP.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function userAgent(request: Request): string | null {
  const value = request.headers.get("user-agent");
  return value ? value.slice(0, USER_AGENT_MAX_LENGTH) : null;
}

const JSON_BODY_MAX_BYTES = 16 * 1024;

/**
 * Lee un cuerpo JSON de hasta 16 KiB sin lanzar: un cuerpo inválido, demasiado
 * grande o con otro tipo de contenido equivale a `undefined`.
 */
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return undefined;
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > JSON_BODY_MAX_BYTES) return undefined;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > JSON_BODY_MAX_BYTES) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

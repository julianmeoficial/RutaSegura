import "server-only";

export type CookieNames = { access: string; refresh: string };

/**
 * Sobre HTTPS las cookies llevan `Secure` y el prefijo `__Host-` (sin
 * `Domain`, `Path=/`). Sobre HTTP no: Safari descarta las cookies `Secure` en
 * `http://localhost`, y el login quedaría roto solo en WebKit.
 */
export function cookieNames(isHttps: boolean): CookieNames {
  return isHttps
    ? { access: "__Host-rs_at", refresh: "__Host-rs_rt" }
    : { access: "rs_at", refresh: "rs_rt" };
}

/**
 * En `APP_ENV=production` siempre Secure/`__Host-` (aunque falle el proto).
 * Sobre HTTP local en development/preview se omite Secure para Safari.
 */
export function isHttpsRequest(request: Request): boolean {
  if (process.env.APP_ENV === "production") return true;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwardedProto ?? new URL(request.url).protocol.replace(":", "")) === "https";
}

function serialize(name: string, value: string, maxAge: number, isHttps: boolean): string {
  const parts = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "HttpOnly", "SameSite=Lax"];
  if (isHttps) parts.push("Secure");
  return parts.join("; ");
}

export type SessionCookies = {
  accessToken: string;
  accessMaxAge: number;
  refreshToken: string;
  refreshMaxAge: number;
};

export function setSessionCookies(headers: Headers, isHttps: boolean, cookies: SessionCookies) {
  const names = cookieNames(isHttps);
  headers.append(
    "Set-Cookie",
    serialize(names.access, cookies.accessToken, cookies.accessMaxAge, isHttps),
  );
  headers.append(
    "Set-Cookie",
    serialize(names.refresh, cookies.refreshToken, cookies.refreshMaxAge, isHttps),
  );
}

export function clearSessionCookies(headers: Headers, isHttps: boolean) {
  const names = cookieNames(isHttps);
  headers.append("Set-Cookie", serialize(names.access, "", 0, isHttps));
  headers.append("Set-Cookie", serialize(names.refresh, "", 0, isHttps));
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      const value = part.slice(index + 1).trim();
      return value.length > 0 ? value : undefined;
    }
  }
  return undefined;
}

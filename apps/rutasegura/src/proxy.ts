import { NextResponse, type NextRequest } from "next/server";
import { API_ERRORS } from "@rutasegura/contracts";
import { isAllowedOrigin, corsHeaders, parseAllowedOrigins, preflightHeaders } from "@/lib/cors";
import {
  API_CONTENT_SECURITY_POLICY,
  STRICT_TRANSPORT_SECURITY,
  buildDocumentPolicy,
  createNonce,
} from "@/lib/security-headers";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type DenyReason = "cross_site_mutation" | "cors_origin_rejected";

function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwardedProto ?? request.nextUrl.protocol.replace(":", "")) === "https";
}

let allowlistCache: { key: string; origins: string[] } | undefined;

/**
 * Allowlist CORS a partir del entorno. env.ts ya la valida al arrancar; si
 * aun así fuera inválida, se cae al mismo origen (falla cerrado).
 */
function allowedOrigins(request: NextRequest): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  const requireHttps = process.env.APP_ENV === "production";
  const key = `${appUrl}|${raw ?? ""}|${requireHttps}`;
  if (allowlistCache?.key !== key) {
    let origins: string[];
    try {
      origins = parseAllowedOrigins(raw, appUrl, { requireHttps });
    } catch {
      origins = [new URL(appUrl).origin];
    }
    allowlistCache = { key, origins };
  }
  return allowlistCache.origins;
}

/**
 * Defensa CSRF para la API con cookies: una petición que modifica estado debe
 * venir del mismo sitio o de un origen de la allowlist CORS. Los navegadores
 * envían `Origin` en todo POST; si falta (cliente no navegador), no lleva
 * cookies ajenas y se deja pasar.
 */
function isCrossSiteMutation(request: NextRequest, originAllowed: boolean): boolean {
  if (!UNSAFE_METHODS.has(request.method)) return false;
  if (originAllowed) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;

  const origin = request.headers.get("origin");
  if (origin === null) return false;

  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/**
 * El proxy no puede usar el logger de servidor (`server-only`) ni los secretos
 * para el HMAC de la IP: registra solo ruta, método y motivo.
 */
function logAccessDenied(request: NextRequest, reason: DenyReason) {
  console.error(
    JSON.stringify({
      time: new Date().toISOString(),
      level: "warn",
      event: "security.access_denied",
      source: "proxy",
      route: request.nextUrl.pathname,
      method: request.method,
      reason,
    }),
  );
}

function apiBaseHeaders(): Record<string, string> {
  return {
    "Content-Security-Policy": API_CONTENT_SECURITY_POLICY,
    "Strict-Transport-Security": STRICT_TRANSPORT_SECURITY,
    "Cache-Control": "no-store",
  };
}

function forbiddenResponse(request: NextRequest, reason: DenyReason): NextResponse {
  logAccessDenied(request, reason);
  const { status, message } = API_ERRORS.forbidden;
  return NextResponse.json(
    { error: { code: "forbidden", message } },
    { status, headers: apiBaseHeaders() },
  );
}

function isPreflight(request: NextRequest): boolean {
  return (
    request.method === "OPTIONS" &&
    request.headers.has("origin") &&
    request.headers.has("access-control-request-method")
  );
}

export function proxy(request: NextRequest) {
  const isHttps = isHttpsRequest(request);
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const origin = request.headers.get("origin");
  const originAllowed = isApi && isAllowedOrigin(origin, allowedOrigins(request));

  if (isApi && isPreflight(request)) {
    if (!originAllowed || origin === null) {
      return forbiddenResponse(request, "cors_origin_rejected");
    }
    return new NextResponse(null, {
      status: 204,
      headers: { ...apiBaseHeaders(), ...preflightHeaders(origin) },
    });
  }

  if (isApi && isCrossSiteMutation(request, originAllowed)) {
    return forbiddenResponse(request, "cross_site_mutation");
  }

  const requestHeaders = new Headers(request.headers);

  let policy: string;
  if (isApi) {
    policy = API_CONTENT_SECURITY_POLICY;
  } else {
    const nonce = createNonce();
    policy = buildDocumentPolicy({
      nonce,
      isDevelopment: process.env.NODE_ENV === "development",
      isHttps,
    });
    // Next lee el nonce de la CSP de la petición y lo aplica a sus scripts.
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", policy);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY);

  if (isApi) {
    response.headers.set("Cache-Control", "no-store");
    if (originAllowed && origin !== null) {
      for (const [key, value] of Object.entries(corsHeaders(origin))) {
        response.headers.set(key, value);
      }
    }
  }
  if (process.env.APP_ENV !== "production") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

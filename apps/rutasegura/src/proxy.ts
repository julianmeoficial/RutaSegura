import { NextResponse, type NextRequest } from "next/server";
import {
  API_CONTENT_SECURITY_POLICY,
  STRICT_TRANSPORT_SECURITY,
  buildDocumentPolicy,
  createNonce,
} from "@/lib/security-headers";

function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwardedProto ?? request.nextUrl.protocol.replace(":", "")) === "https";
}

export function proxy(request: NextRequest) {
  const isHttps = isHttpsRequest(request);
  const isApi = request.nextUrl.pathname.startsWith("/api/");
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

  if (isApi) {
    response.headers.set("Cache-Control", "no-store");
  }
  if (isHttps) {
    response.headers.set("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY);
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

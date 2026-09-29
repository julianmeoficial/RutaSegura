import { logAuthFailure } from "@/server/audit/security-log";
import {
  clearSessionCookies,
  cookieNames,
  isHttpsRequest,
  readCookie,
  setSessionCookies,
} from "@/server/auth/cookies";
import { clientIp, userAgent } from "@/server/http/client";
import { withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { refresh } from "@/server/services/auth";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling("auth.refresh", async (request) => {
  const isHttps = isHttpsRequest(request);
  const token = readCookie(request, cookieNames(isHttps).refresh);

  const result = token
    ? await refresh(token, { ip: clientIp(request), userAgent: userAgent(request) })
    : ({ ok: false } as const);

  if (!result.ok) {
    logAuthFailure(request, "auth.refresh", token ? "refresh_invalid" : "missing_token");
    const headers = new Headers();
    clearSessionCookies(headers, isHttps);
    return apiError("unauthorized", { headers });
  }

  const headers = new Headers();
  setSessionCookies(headers, isHttps, result.cookies);
  return apiJson({ user: result.user }, { headers });
});

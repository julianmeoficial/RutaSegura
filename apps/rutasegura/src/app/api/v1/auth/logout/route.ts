import {
  clearSessionCookies,
  cookieNames,
  isHttpsRequest,
  readCookie,
} from "@/server/auth/cookies";
import { clientIp, userAgent } from "@/server/http/client";
import { withErrorHandling } from "@/server/http/guards";
import { apiEmpty } from "@/server/http/responses";
import { logout } from "@/server/services/auth";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling("auth.logout", async (request) => {
  const isHttps = isHttpsRequest(request);
  const names = cookieNames(isHttps);

  await logout(
    {
      refreshToken: readCookie(request, names.refresh),
      accessToken: readCookie(request, names.access),
    },
    { ip: clientIp(request), userAgent: userAgent(request) },
  );

  const headers = new Headers();
  clearSessionCookies(headers, isHttps);
  return apiEmpty({ headers });
});

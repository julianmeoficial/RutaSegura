import { loginRequestSchema } from "@rutasegura/contracts";
import { isHttpsRequest, setSessionCookies } from "@/server/auth/cookies";
import { clientIp, readJson, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { loginRules } from "@/server/rate-limit/policies";
import { login } from "@/server/services/auth";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling("auth.login", async (request) => {
  const ctx = { ip: clientIp(request), userAgent: userAgent(request) };

  const parsed = loginRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("bad_request");

  const limit = await guardRateLimit(loginRules(ctx.ip, parsed.data.email), {
    ...ctx,
    subject: parsed.data.email,
  });
  if (limit instanceof Response) return limit;

  const result = await login(parsed.data, ctx);
  if (!result.ok) return apiError("invalid_credentials", { headers: limit.headers });

  const headers = new Headers(limit.headers);
  setSessionCookies(headers, isHttpsRequest(request), result.cookies);
  return apiJson({ user: result.user }, { headers });
});

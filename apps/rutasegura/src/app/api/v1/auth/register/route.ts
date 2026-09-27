import { registerRequestSchema } from "@rutasegura/contracts";
import { clientIp, readJson, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { registerRules } from "@/server/rate-limit/policies";
import { register } from "@/server/services/auth";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling("auth.register", async (request) => {
  const ctx = { ip: clientIp(request), userAgent: userAgent(request) };

  const limit = await guardRateLimit(registerRules(ctx.ip), ctx);
  if (limit instanceof Response) return limit;

  const parsed = registerRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("bad_request", { headers: limit.headers });

  await register(parsed.data, ctx);
  // Misma respuesta si el correo ya existía: el registro no enumera cuentas.
  return apiJson({ status: "accepted" }, { status: 201, headers: limit.headers });
});

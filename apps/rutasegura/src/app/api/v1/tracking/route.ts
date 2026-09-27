import { trackingRequestSchema } from "@rutasegura/contracts";
import { clientIp, readJson, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { trackingRules } from "@/server/rate-limit/policies";
import { trackShipment } from "@/server/services/tracking";

export const dynamic = "force-dynamic";

/**
 * POST y no GET: el número de guía y los dígitos del teléfono no deben quedar
 * en URLs, historial del navegador ni logs de acceso.
 */
export const POST = withErrorHandling("tracking.query", async (request) => {
  const ctx = { ip: clientIp(request), userAgent: userAgent(request) };

  const parsed = trackingRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("bad_request");

  const limit = await guardRateLimit(trackingRules(ctx.ip, parsed.data.trackingNumber), {
    ...ctx,
    subject: parsed.data.trackingNumber,
  });
  if (limit instanceof Response) return limit;

  const result = await trackShipment(parsed.data, ctx);
  if (!result) return apiError("tracking_not_found", { headers: limit.headers });
  return apiJson(result, { headers: limit.headers });
});

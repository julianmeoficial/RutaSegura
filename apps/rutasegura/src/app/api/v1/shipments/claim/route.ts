import { claimRequestSchema } from "@rutasegura/contracts";
import { requireUser } from "@/server/auth/require-user";
import { clientIp, readJson, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { trackingRules } from "@/server/rate-limit/policies";
import { claimShipmentForUser } from "@/server/services/shipments";

export const dynamic = "force-dynamic";

/**
 * Vincula a la cuenta una guía existente. Comparte límites con el rastreo: el
 * reclamo es otra forma de probar dígitos contra una guía.
 */
export const POST = withErrorHandling("shipments.claim", async (request) => {
  const user = await requireUser(request, "shipments.claim");
  if (user instanceof Response) return user;

  const ctx = { ip: clientIp(request), userAgent: userAgent(request) };
  const parsed = claimRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError("bad_request");

  const limit = await guardRateLimit(trackingRules(ctx.ip, parsed.data.trackingNumber), {
    ...ctx,
    userId: user.id,
    subject: parsed.data.trackingNumber,
  });
  if (limit instanceof Response) return limit;

  const shipment = await claimShipmentForUser(parsed.data, user.id, ctx);
  if (!shipment) return apiError("not_found", { headers: limit.headers });
  return apiJson(shipment, { headers: limit.headers });
});

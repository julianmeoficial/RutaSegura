import { ulidSchema } from "@rutasegura/contracts";
import { authenticate } from "@/server/auth/require-user";
import { clientIp, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { shipmentsRules } from "@/server/rate-limit/policies";
import { getShipmentForUser } from "@/server/services/shipments";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = withErrorHandling<Context>("shipments.get", async (request, { params }) => {
  const user = await authenticate(request);
  if (!user) return apiError("unauthorized");

  const limit = await guardRateLimit(shipmentsRules(user.id), {
    userId: user.id,
    ip: clientIp(request),
    userAgent: userAgent(request),
  });
  if (limit instanceof Response) return limit;

  const id = ulidSchema.safeParse((await params).id);
  if (!id.success) return apiError("not_found", { headers: limit.headers });

  const shipment = await getShipmentForUser(id.data, user.id);
  return apiJson(shipment, { headers: limit.headers });
});

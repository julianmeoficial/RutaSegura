import { requireUser } from "@/server/auth/require-user";
import { clientIp, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiJson } from "@/server/http/responses";
import { shipmentsRules } from "@/server/rate-limit/policies";
import { listShipmentsForUser } from "@/server/services/shipments";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling("shipments.list", async (request) => {
  const user = await requireUser(request, "shipments.list");
  if (user instanceof Response) return user;

  const limit = await guardRateLimit(shipmentsRules(user.id), {
    userId: user.id,
    ip: clientIp(request),
    userAgent: userAgent(request),
  });
  if (limit instanceof Response) return limit;

  const shipments = await listShipmentsForUser(user.id);
  return apiJson({ shipments }, { headers: limit.headers });
});

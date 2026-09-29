import { notificationListQuerySchema } from "@rutasegura/contracts";
import { requireUser } from "@/server/auth/require-user";
import { clientIp, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { notificationsRules } from "@/server/rate-limit/policies";
import { listNotificationsForUser } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling("notifications.list", async (request) => {
  const user = await requireUser(request, "notifications.list");
  if (user instanceof Response) return user;

  const limit = await guardRateLimit(notificationsRules(user.id), {
    userId: user.id,
    ip: clientIp(request),
    userAgent: userAgent(request),
  });
  if (limit instanceof Response) return limit;

  const query = notificationListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return apiError("bad_request", { headers: limit.headers });

  const result = await listNotificationsForUser(user.id, query.data.limit);
  return apiJson(result, { headers: limit.headers });
});

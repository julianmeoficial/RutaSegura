import type { MarkNotificationsReadResponse } from "@rutasegura/contracts";
import { requireUser } from "@/server/auth/require-user";
import { clientIp, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiJson } from "@/server/http/responses";
import { notificationsRules } from "@/server/rate-limit/policies";
import { markNotificationsReadForUser } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

/** Sin cuerpo: solo afecta a los avisos del usuario de la sesión. */
export const POST = withErrorHandling("notifications.read", async (request) => {
  const user = await requireUser(request, "notifications.read");
  if (user instanceof Response) return user;

  const limit = await guardRateLimit(notificationsRules(user.id), {
    userId: user.id,
    ip: clientIp(request),
    userAgent: userAgent(request),
  });
  if (limit instanceof Response) return limit;

  await markNotificationsReadForUser(user.id);
  const body: MarkNotificationsReadResponse = { unreadCount: 0 };
  return apiJson(body, { headers: limit.headers });
});

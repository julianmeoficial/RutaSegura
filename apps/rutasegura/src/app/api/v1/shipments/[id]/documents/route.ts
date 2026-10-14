import { ulidSchema } from "@rutasegura/contracts";
import { requireUser } from "@/server/auth/require-user";
import { clientIp, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { documentsRules } from "@/server/rate-limit/policies";
import { listDocumentsForShipment } from "@/server/services/documents";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = withErrorHandling<Context>("documents.list", async (request, { params }) => {
  const user = await requireUser(request, "documents.list");
  if (user instanceof Response) return user;

  const limit = await guardRateLimit(documentsRules(user.id), {
    userId: user.id,
    ip: clientIp(request),
    userAgent: userAgent(request),
  });
  if (limit instanceof Response) return limit;

  const id = ulidSchema.safeParse((await params).id);
  if (!id.success) return apiError("not_found", { headers: limit.headers });

  const documents = await listDocumentsForShipment(id.data, user.id);
  return apiJson({ documents }, { headers: limit.headers });
});

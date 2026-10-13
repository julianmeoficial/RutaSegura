import { ulidSchema } from "@rutasegura/contracts";
import { requireUser } from "@/server/auth/require-user";
import { clientIp, userAgent } from "@/server/http/client";
import { guardRateLimit, withErrorHandling } from "@/server/http/guards";
import { apiError, apiJson } from "@/server/http/responses";
import { errorKind, logger } from "@/server/logger";
import { documentsRules } from "@/server/rate-limit/policies";
import { issueDownloadUrl } from "@/server/services/documents";
import { StorageUnavailableError } from "@/server/storage/signer";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Sin cuerpo. Devuelve una URL firmada de corta duración; nunca la registra en
 * logs. Documento ajeno, inexistente o con ULID mal formado: el mismo 404.
 */
export const POST = withErrorHandling<Context>(
  "documents.download_url",
  async (request, { params }) => {
    const user = await requireUser(request, "documents.download_url");
    if (user instanceof Response) return user;

    const limit = await guardRateLimit(documentsRules(user.id), {
      userId: user.id,
      ip: clientIp(request),
      userAgent: userAgent(request),
    });
    if (limit instanceof Response) return limit;
    const { headers } = limit;

    const id = ulidSchema.safeParse((await params).id);
    if (!id.success) return apiError("not_found", { headers });

    try {
      const signed = await issueDownloadUrl(id.data, user.id);
      return apiJson(signed, { headers });
    } catch (error) {
      if (error instanceof StorageUnavailableError) {
        logger.error("documents.storage_unavailable", { kind: errorKind(error) });
        return apiError("service_unavailable", { headers });
      }
      throw error;
    }
  },
);

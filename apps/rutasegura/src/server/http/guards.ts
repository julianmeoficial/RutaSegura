import "server-only";
import { recordAuthEvent, type AuthEventInput } from "@/server/audit/auth-events";
import { errorKind, logger } from "@/server/logger";
import { rateLimitHeaders, type RateLimitRule } from "@/server/rate-limit/limiter";
import { applyRateLimit } from "@/server/rate-limit/policies";
import { apiError } from "./responses";

export type RateLimitPass = { headers: Record<string, string> };

/**
 * Aplica el rate limit. Devuelve las cabeceras `RateLimit-*` para la respuesta
 * o, si se excedió o Redis no responde, la respuesta de error lista (429 o 503).
 */
export async function guardRateLimit(
  rules: RateLimitRule[],
  audit: Omit<AuthEventInput, "type">,
): Promise<RateLimitPass | Response> {
  let result;
  try {
    result = await applyRateLimit(rules);
  } catch (error) {
    logger.error("rate_limit.unavailable", { kind: errorKind(error) });
    return apiError("service_unavailable");
  }

  const headers = rateLimitHeaders(result);
  if (!result.allowed) {
    await recordAuthEvent({ type: "rate_limited", ...audit });
    return apiError("rate_limited", { headers });
  }
  return { headers };
}

/** Convierte cualquier excepción no prevista en un 500 genérico y registrado. */
export function withErrorHandling(
  route: string,
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      logger.error("api.unhandled_error", { route, kind: errorKind(error) });
      return apiError("internal_error");
    }
  };
}

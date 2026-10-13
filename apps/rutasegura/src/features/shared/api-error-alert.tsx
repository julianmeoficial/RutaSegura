"use client";

import type { ApiResult } from "@/lib/api-client";
import { Alert } from "@/components/ui";
import { errorMessage, type ErrorContext } from "@/lib/error-messages";
import { countdownLabel } from "@/lib/format";
import { useCountdown } from "./use-countdown";

export type ApiFailure = Extract<ApiResult<unknown>, { ok: false }> & { at: number };

/**
 * Mensaje accionable para un error de la API. Nunca muestra detalles internos:
 * el texto sale del catálogo de `error-messages` según el código público y la
 * pantalla. En un 429 muestra la espera de `Retry-After`.
 */
export function ApiErrorAlert({
  failure,
  context = "generic",
}: {
  failure: ApiFailure | null;
  context?: ErrorContext;
}) {
  const deadline = failure?.retryAfter ? failure.at + failure.retryAfter * 1000 : null;
  const remaining = useCountdown(deadline);
  if (!failure) return null;

  if (failure.code === "rate_limited") {
    return (
      <Alert tone="warning" live>
        <strong>Demasiados intentos.</strong>{" "}
        {remaining > 0
          ? `Vuelve a intentar en ${countdownLabel(remaining)}.`
          : "Ya puedes volver a intentarlo."}
      </Alert>
    );
  }

  return (
    <Alert tone="error" live>
      {errorMessage(failure.code, context)}
    </Alert>
  );
}

/** `true` mientras dure la espera de un 429. */
export function useRateLimitActive(failure: ApiFailure | null): boolean {
  const deadline =
    failure?.code === "rate_limited" && failure.retryAfter
      ? failure.at + failure.retryAfter * 1000
      : null;
  return useCountdown(deadline) > 0;
}

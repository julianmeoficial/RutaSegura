"use client";

import { Button, ButtonLink, Mono } from "@/components/ui";
import { PAGE_ERROR } from "@/lib/error-messages";
import { StatusScreen } from "./status-screen";

/**
 * Vista de las fronteras de error. Nunca muestra `error.message` ni la traza:
 * en producción Next ya los oculta y solo el `digest` permite cruzar con el log.
 */
export function ErrorView({
  digest,
  onRetry,
  homeHref = "/",
  homeLabel = "Ir al inicio",
  embedded = false,
}: {
  digest?: string;
  onRetry: () => void;
  homeHref?: string;
  homeLabel?: string;
  embedded?: boolean;
}) {
  return (
    <StatusScreen
      kind="error"
      embedded={embedded}
      title={PAGE_ERROR.title}
      actions={
        <>
          <Button onClick={onRetry}>Reintentar</Button>
          <ButtonLink href={homeHref} variant="ghost">
            {homeLabel}
          </ButtonLink>
        </>
      }
    >
      <p role="alert">{PAGE_ERROR.body}</p>
      {digest ? (
        <p>
          <small>
            {PAGE_ERROR.reference}: <Mono>{digest}</Mono>
          </small>
        </p>
      ) : null}
    </StatusScreen>
  );
}

"use client";

import { Actions, Button, ButtonLink, Card, Mono, Muted, Page, PageIntro } from "@/components/ui";
import { PAGE_ERROR } from "@/lib/error-messages";

/**
 * Vista de las fronteras de error. Nunca muestra `error.message` ni la traza:
 * en producción Next ya los oculta y solo el `digest` permite cruzar con el log.
 */
export function ErrorView({
  digest,
  onRetry,
  homeHref = "/",
  homeLabel = "Ir al inicio",
}: {
  digest?: string;
  onRetry: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <Page>
      <PageIntro title={PAGE_ERROR.title} />
      <Card>
        <div role="alert">
          <Muted>{PAGE_ERROR.body}</Muted>
        </div>
        {digest ? (
          <Muted>
            {PAGE_ERROR.reference}: <Mono>{digest}</Mono>
          </Muted>
        ) : null}
        <Actions>
          <Button onClick={onRetry}>Reintentar</Button>
          <ButtonLink href={homeHref}>{homeLabel}</ButtonLink>
        </Actions>
      </Card>
    </Page>
  );
}

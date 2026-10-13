import { API_ERRORS } from "@rutasegura/contracts";
import { Actions, ButtonLink, Card, Muted, Page, PageIntro } from "@/components/ui";

/** Recurso ajeno, inexistente o mal formado: la misma página, sin pistas. */
export default function NotFound() {
  return (
    <Page>
      <PageIntro title="No encontramos lo que buscas" />
      <Card>
        <Muted>{API_ERRORS.not_found.message} Revisa el enlace o vuelve a tus envíos.</Muted>
        <Actions>
          <ButtonLink href="/portal" variant="primary">
            Ir a Mis envíos
          </ButtonLink>
          <ButtonLink href="/rastreo">Rastrear una guía</ButtonLink>
        </Actions>
      </Card>
    </Page>
  );
}

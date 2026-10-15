import { ButtonLink } from "@/components/ui";
import { StatusScreen } from "@/components/status-screen";

/** Recurso ajeno, inexistente o mal formado: la misma página, sin pistas. */
export default function NotFound() {
  return (
    <StatusScreen
      kind="missing"
      title="No encontramos lo que buscas"
      actions={
        <>
          <ButtonLink href="/portal" variant="primary">
            Ir a Mis envíos
          </ButtonLink>
          <ButtonLink href="/rastreo" variant="ghost">
            Rastrear un envío
          </ButtonLink>
        </>
      }
    >
      <p>Puede que el enlace esté incompleto o que la página ya no exista.</p>
    </StatusScreen>
  );
}

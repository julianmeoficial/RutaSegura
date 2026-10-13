import type { Metadata } from "next";
import { ButtonLink, Card, CardTitle, EmptyState, PageIntro } from "@/components/ui";
import { ShipmentList } from "@/features/shipments/shipment-list";
import { requirePortalUser } from "@/server/auth/current-user";
import { pageData } from "@/server/portal/page-data";
import { listShipmentsForUser } from "@/server/services/shipments";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaOverviewPage() {
  const user = await requirePortalUser("/portal/agenda");
  const shipments = await pageData("portal.agenda", () => listShipmentsForUser(user.id));

  return (
    <>
      <PageIntro
        eyebrow="RF-07 / RF-08 · A01 / A09"
        title="Agenda tus entregas"
        description="Elige el envío. El selector de franjas solo aparece después de que el servidor verifica que el envío es tuyo."
      />
      <Card labelledBy="agenda-list">
        <CardTitle id="agenda-list">Envíos</CardTitle>
        {shipments.length > 0 ? (
          <ShipmentList shipments={shipments} documentCounts={new Map()} mode="agenda" />
        ) : (
          <EmptyState
            title="Sin envíos para agendar"
            description="Vincula una guía en Mis envíos para poder agendar su entrega."
            action={
              <ButtonLink href="/portal" variant="soft">
                Ir a Mis envíos
              </ButtonLink>
            }
          />
        )}
      </Card>
    </>
  );
}

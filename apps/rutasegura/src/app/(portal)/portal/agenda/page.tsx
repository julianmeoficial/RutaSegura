import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageIntro } from "@/components/ui";
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
        eyebrow="Agenda"
        title="Agenda tus entregas"
        description="Elige el envío y luego el día y la franja en que quieres recibirlo."
      />
      {shipments.length > 0 ? (
        <ShipmentList shipments={shipments} documentCounts={new Map()} mode="agenda" />
      ) : (
        <EmptyState
          title="No hay entregas por agendar"
          description="Agrega un envío en Mis envíos para elegir cuándo recibirlo."
          action={<ButtonLink href="/portal">Ir a Mis envíos</ButtonLink>}
        />
      )}
    </>
  );
}

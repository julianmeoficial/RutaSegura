import type { Metadata } from "next";
import {
  Actions,
  ButtonLink,
  Card,
  CardHeader,
  CardTitle,
  Chip,
  Muted,
  PageIntro,
} from "@/components/ui";
import { DocumentList } from "@/features/documents/document-list";
import { AuditTimeline } from "@/features/shipments/audit-timeline";
import { STATUS_LABEL, windowLabel } from "@/lib/format";
import { requirePortalUser } from "@/server/auth/current-user";
import { loadOwnedShipment } from "@/server/portal/load";

export const metadata: Metadata = { title: "Detalle del envío" };

type Props = { params: Promise<{ id: string }> };

const LOCKED = new Set(["out_for_delivery", "delivered"]);

export default async function ShipmentDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requirePortalUser(`/portal/envios/${encodeURIComponent(id)}`);
  const { shipment, documents } = await loadOwnedShipment(id, user.id, "portal.shipment");
  const status = STATUS_LABEL[shipment.status];

  return (
    <>
      <PageIntro
        eyebrow="RF-06 / RF-08 · A01"
        title={`Envío ${shipment.trackingNumber}`}
        description="La propiedad se verificó en el servidor antes de cargar este detalle."
      />

      <Card labelledBy="shipment-title">
        <CardHeader>
          <CardTitle id="shipment-title">Estado y entrega</CardTitle>
          <Chip tone={status.tone}>{status.label}</Chip>
        </CardHeader>
        <Muted>
          {shipment.window
            ? `Entrega agendada: ${windowLabel(shipment.window)}`
            : "Todavía no hay franja de entrega."}
        </Muted>
        {!LOCKED.has(shipment.status) ? (
          <Actions>
            <ButtonLink href={`/portal/envios/${shipment.id}/agenda`} variant="primary">
              {shipment.window ? "Reprogramar entrega" : "Agendar entrega"}
            </ButtonLink>
          </Actions>
        ) : null}
      </Card>

      <Card labelledBy="shipment-documents">
        <CardTitle id="shipment-documents">Documentos</CardTitle>
        {documents.length > 0 ? (
          <DocumentList documents={documents} />
        ) : (
          <Muted>Este envío no tiene documentos.</Muted>
        )}
      </Card>

      <Card labelledBy="shipment-audit">
        <CardTitle id="shipment-audit">Bitácora</CardTitle>
        <AuditTimeline audit={shipment.audit} />
      </Card>
    </>
  );
}

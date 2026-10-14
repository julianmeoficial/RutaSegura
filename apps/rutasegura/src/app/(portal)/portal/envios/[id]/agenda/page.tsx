import type { Metadata } from "next";
import {
  Alert,
  ButtonLink,
  Card,
  CardHeader,
  CardTitle,
  Chip,
  Muted,
  PageIntro,
} from "@/components/ui";
import { ScheduleForm } from "@/features/schedules/schedule-form";
import { AuditTimeline } from "@/features/shipments/audit-timeline";
import { STATUS_LABEL, windowLabel } from "@/lib/format";
import { requirePortalUser } from "@/server/auth/current-user";
import { loadOwnedShipment } from "@/server/portal/load";

export const metadata: Metadata = { title: "Agenda" };

type Props = { params: Promise<{ id: string }> };

const LOCKED = new Set(["out_for_delivery", "delivered"]);

export default async function ShipmentAgendaPage({ params }: Props) {
  const { id } = await params;
  const user = await requirePortalUser(`/portal/envios/${encodeURIComponent(id)}/agenda`);
  const { shipment } = await loadOwnedShipment(id, user.id, "portal.shipment_agenda");
  const locked = LOCKED.has(shipment.status);

  return (
    <>
      <PageIntro
        eyebrow="RF-07 / RF-08 · A01 / A09"
        title="Agenda una franja disponible"
        description="Solo aparece el selector después de que el servidor verifica que el envío pertenece a la sesión activa."
      />

      <Card labelledBy="agenda-shipment">
        <CardHeader>
          <div>
            <Muted>Envío</Muted>
            <CardTitle id="agenda-shipment">{shipment.trackingNumber}</CardTitle>
          </div>
          <Chip tone="success" dot={false}>
            Propiedad verificada
          </Chip>
        </CardHeader>
        {locked ? (
          <>
            <Alert tone="warning">
              El envío está {STATUS_LABEL[shipment.status].label.toLowerCase()}: ya no se puede
              agendar ni reprogramar.
            </Alert>
            <ButtonLink href={`/portal/envios/${shipment.id}`}>Volver al detalle</ButtonLink>
          </>
        ) : (
          <ScheduleForm
            shipmentId={shipment.id}
            current={shipment.window}
            nowIso={new Date().toISOString()}
          />
        )}
      </Card>

      <Card tone="info" labelledBy="agenda-confirmation">
        <CardTitle id="agenda-confirmation">Confirmación</CardTitle>
        <Muted>
          {shipment.window ? windowLabel(shipment.window) : "Todavía no hay franja confirmada."}
        </Muted>
        <Alert tone="warning">
          Cambiar la franja crea un nuevo evento; no sobrescribe el historial.
        </Alert>
        <CardTitle level={3}>Actividad reciente</CardTitle>
        <AuditTimeline audit={shipment.audit} limit={5} />
      </Card>
    </>
  );
}

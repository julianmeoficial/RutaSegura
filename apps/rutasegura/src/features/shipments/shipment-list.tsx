import type { ShipmentSummary } from "@rutasegura/contracts";
import { Actions, ButtonLink, Chip, Muted } from "@/components/ui";
import { STATUS_LABEL, windowLabel } from "@/lib/format";
import styles from "@/features/portal/portal.module.css";

const NOT_RESCHEDULABLE = new Set(["out_for_delivery", "delivered"]);

export function needsSchedule(shipment: ShipmentSummary): boolean {
  return shipment.window === null && !NOT_RESCHEDULABLE.has(shipment.status);
}

function scheduleLine(shipment: ShipmentSummary): string {
  if (shipment.window) return `Entrega agendada: ${windowLabel(shipment.window)}`;
  if (needsSchedule(shipment)) return "Requiere agenda";
  return shipment.status === "delivered" ? "Entrega completada" : "Sin franja de entrega";
}

function documentsLine(count: number): string {
  if (count === 0) return "Sin documentos";
  return count === 1 ? "1 documento" : `${count} documentos`;
}

export function ShipmentList({
  shipments,
  documentCounts,
  mode = "overview",
}: {
  shipments: ShipmentSummary[];
  documentCounts: Map<string, number>;
  mode?: "overview" | "agenda";
}) {
  return (
    <ul className={styles.list} aria-label="Tus envíos">
      {shipments.map((shipment) => {
        const status = STATUS_LABEL[shipment.status];
        const pendingSchedule = needsSchedule(shipment);
        return (
          <li key={shipment.id} className={styles.row}>
            <div className={styles.rowTop}>
              <h3 className={styles.rowTitle}>{shipment.trackingNumber}</h3>
              {pendingSchedule ? (
                <Chip tone="warning">Por agendar</Chip>
              ) : (
                <Chip tone={status.tone}>{status.label}</Chip>
              )}
            </div>
            <Muted>{scheduleLine(shipment)}</Muted>
            {mode === "overview" ? (
              <Muted>{documentsLine(documentCounts.get(shipment.id) ?? 0)}</Muted>
            ) : null}
            <Actions>
              {mode === "overview" ? (
                <ButtonLink href={`/portal/envios/${shipment.id}`} variant="secondary">
                  Ver detalles
                </ButtonLink>
              ) : null}
              {!NOT_RESCHEDULABLE.has(shipment.status) ? (
                <ButtonLink
                  href={`/portal/envios/${shipment.id}/agenda`}
                  variant={pendingSchedule ? "primary" : "secondary"}
                >
                  {shipment.window ? "Reprogramar" : "Agendar"}
                </ButtonLink>
              ) : null}
            </Actions>
          </li>
        );
      })}
    </ul>
  );
}

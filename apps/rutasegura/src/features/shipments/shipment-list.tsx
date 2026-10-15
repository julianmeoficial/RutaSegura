import Link from "next/link";
import type { ShipmentSummary } from "@rutasegura/contracts";
import { IconArrowRight } from "@/components/icons";
import { Chip } from "@/components/ui";
import { STATUS_LABEL, windowLabel } from "@/lib/format";
import styles from "@/features/portal/portal.module.css";
import { ShipmentProgress } from "./shipment-progress";

const NOT_RESCHEDULABLE = new Set(["out_for_delivery", "delivered"]);

export function canSchedule(shipment: ShipmentSummary): boolean {
  return !NOT_RESCHEDULABLE.has(shipment.status);
}

export function needsSchedule(shipment: ShipmentSummary): boolean {
  return shipment.window === null && canSchedule(shipment);
}

function scheduleLine(shipment: ShipmentSummary): string {
  if (shipment.window) return windowLabel(shipment.window);
  if (needsSchedule(shipment)) return "Por agendar";
  return shipment.status === "delivered" ? "Entrega completada" : "Llega hoy";
}

function documentsLine(count: number): string {
  if (count === 0) return "Sin documentos";
  return count === 1 ? "1 documento" : `${count} documentos`;
}

/**
 * Cada fila es un enlace al detalle (la guía estira su área a toda la fila) y
 * deja por encima la acción de agendar.
 */
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
        const detailHref =
          mode === "agenda" && canSchedule(shipment)
            ? `/portal/envios/${shipment.id}/agenda`
            : `/portal/envios/${shipment.id}`;
        return (
          <li key={shipment.id} className={styles.row} data-pending={pendingSchedule || undefined}>
            <h3 className={styles.rowGuide}>
              <Link href={detailHref} className={styles.rowLink}>
                {shipment.trackingNumber}
              </Link>
            </h3>
            <div className={styles.rowStatus}>
              <Chip tone={status.tone}>{status.label}</Chip>
              <ShipmentProgress status={shipment.status} compact />
            </div>
            <p className={styles.rowMeta}>
              <span className={pendingSchedule ? styles.rowPending : undefined}>
                {scheduleLine(shipment)}
              </span>
              {mode === "overview" ? (
                <span className={styles.rowDocs}>
                  {documentsLine(documentCounts.get(shipment.id) ?? 0)}
                </span>
              ) : null}
            </p>
            <div className={styles.rowAction}>
              {canSchedule(shipment) ? (
                <Link
                  href={`/portal/envios/${shipment.id}/agenda`}
                  className={pendingSchedule ? styles.rowSchedule : styles.rowReschedule}
                >
                  {shipment.window ? "Reprogramar" : "Agendar"}
                </Link>
              ) : (
                <IconArrowRight size={20} className={styles.rowArrow} />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

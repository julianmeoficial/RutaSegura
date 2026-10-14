import type { ShipmentDetail } from "@rutasegura/contracts";
import { Muted, Timeline } from "@/components/ui";
import { AUDIT_LABEL, STATUS_LABEL, dateTimeLabel } from "@/lib/format";

/** Bitácora del envío, de lo más reciente a lo más antiguo. Solo adición: nada se sobrescribe. */
export function AuditTimeline({
  audit,
  limit,
}: {
  audit: ShipmentDetail["audit"];
  limit?: number;
}) {
  if (audit.length === 0) return <Muted>Sin actividad registrada.</Muted>;
  const events = [...audit].reverse().slice(0, limit);
  return (
    <Timeline
      label="Actividad reciente"
      items={events.map((event, index) => ({
        key: `${event.createdAt}-${index}`,
        title:
          event.type === "status_changed" && event.toStatus
            ? `${AUDIT_LABEL.status_changed}: ${STATUS_LABEL[event.toStatus].label}`
            : AUDIT_LABEL[event.type],
        meta: dateTimeLabel(event.createdAt),
      }))}
    />
  );
}

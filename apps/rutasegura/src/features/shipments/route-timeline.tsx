import type { ShipmentEvent } from "@rutasegura/contracts";
import { Muted, Timeline } from "@/components/ui";
import { EVENT_LABEL, dateTimeLabel } from "@/lib/format";

/** Recorrido del envío, del movimiento más reciente al más antiguo. */
export function RouteTimeline({ events }: { events: ShipmentEvent[] }) {
  if (events.length === 0) return <Muted>Todavía no hay movimientos.</Muted>;
  return (
    <Timeline
      label="Recorrido del envío"
      highlightFirst
      items={[...events].reverse().map((event, index) => ({
        key: `${event.occurredAt}-${index}`,
        title: EVENT_LABEL[event.status],
        detail: event.city,
        meta: dateTimeLabel(event.occurredAt),
        tone:
          event.status === "exception"
            ? "danger"
            : event.status === "delivered"
              ? "success"
              : "default",
      }))}
    />
  );
}

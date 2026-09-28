import "server-only";
import { deliverySlotSchema, type ShipmentStatus } from "@rutasegura/contracts";

/** America/Bogota es UTC-5 todo el año: Colombia no aplica horario de verano. */
const BOGOTA_OFFSET = "-05:00";

const NOT_RESCHEDULABLE: ReadonlySet<ShipmentStatus> = new Set(["out_for_delivery", "delivered"]);

export function isReschedulable(status: ShipmentStatus): boolean {
  return !NOT_RESCHEDULABLE.has(status);
}

/** Instante de inicio de la franja en Bogotá, o `null` si fecha o franja no son válidas. */
export function slotStart(date: string, slot: string): Date | null {
  const parsedSlot = deliverySlotSchema.safeParse(slot);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!parsedSlot.success || !match) return null;

  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    return null;
  }

  const weekday = calendar.getUTCDay();
  if (weekday === 0 || weekday === 6) return null;

  const hour = parsedSlot.data.slice(0, 2);
  return new Date(`${date}T${hour}:00:00${BOGOTA_OFFSET}`);
}

/**
 * Franja agendable: lunes a viernes en Bogotá, una de las cinco franjas de 2 h
 * y con inicio estrictamente posterior a `now`.
 */
export function isValidDeliveryWindow(date: string, slot: string, now: Date = new Date()): boolean {
  const start = slotStart(date, slot);
  return start !== null && start.getTime() > now.getTime();
}

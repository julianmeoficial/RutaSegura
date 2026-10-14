import type {
  DeliverySlot,
  DeliveryWindow,
  ShipmentAuditType,
  ShipmentStatus,
} from "@rutasegura/contracts";

/** America/Bogota es UTC-5 todo el año. */
export const TIME_ZONE = "America/Bogota";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

export const STATUS_LABEL: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  created: { label: "Creado", tone: "info" },
  in_transit: { label: "En tránsito", tone: "success" },
  out_for_delivery: { label: "En reparto", tone: "success" },
  delivered: { label: "Entregado", tone: "neutral" },
  exception: { label: "Novedad", tone: "danger" },
};

export const AUDIT_LABEL: Record<ShipmentAuditType, string> = {
  claimed: "Envío vinculado a tu cuenta",
  scheduled: "Franja seleccionada",
  rescheduled: "Franja reprogramada",
  unscheduled: "Franja cancelada",
  status_changed: "Cambio de estado",
  document_url_issued: "Enlace de descarga generado",
};

export const DELIVERY_SLOTS: DeliverySlot[] = ["08-10", "10-12", "12-14", "14-16", "16-18"];

export function slotLabel(slot: DeliverySlot): string {
  const [from, to] = slot.split("-");
  return `${from}:00 – ${to}:00`;
}

// Etiquetas fijas en vez de Intl para fechas que se renderizan en servidor y
// cliente: los datos de locale de Node y de cada navegador difieren ("oct" vs
// "oct.") y rompen la hidratación.
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Fecha de calendario `YYYY-MM-DD` como "martes, 29 de septiembre". */
export function calendarDateLabel(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[day.getUTCDay()]}, ${day.getUTCDate()} de ${MONTHS[day.getUTCMonth()]}`;
}

export function windowLabel(window: DeliveryWindow): string {
  return `${calendarDateLabel(window.date)} · ${slotLabel(window.slot)}`;
}

export function dateTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

/** Instante como fecha de Bogotá: "13 oct 2026". */
export function dateLabel(iso: string): string {
  const day = new Date(new Date(iso).getTime() - 5 * 3600_000);
  return `${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]!.slice(0, 3)} ${day.getUTCFullYear()}`;
}

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MIME_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
};

/** `mm:ss` para cuentas regresivas. */
export function countdownLabel(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

/** Fecha de hoy en Bogotá como `YYYY-MM-DD`. */
export function bogotaToday(now: Date = new Date()): string {
  return new Date(now.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
}

/**
 * Próximos días hábiles (lunes a viernes) en Bogotá, empezando hoy. El servidor
 * vuelve a validar fecha y franja: esto solo arma el selector.
 */
export function upcomingBusinessDays(count: number, now: Date = new Date()): string[] {
  const days: string[] = [];
  const cursor = new Date(`${bogotaToday(now)}T00:00:00Z`);
  while (days.length < count) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** La franja ya empezó (o pasó) en Bogotá. */
export function isSlotPast(date: string, slot: DeliverySlot, now: Date = new Date()): boolean {
  const start = new Date(`${date}T${slot.slice(0, 2)}:00:00-05:00`);
  return start.getTime() <= now.getTime();
}

/**
 * Destino tras iniciar sesión: solo rutas internas del portal. Evita que
 * `?next=` sirva como redirección abierta.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/portal")) return "/portal";
  if (value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return "/portal";
  return value;
}

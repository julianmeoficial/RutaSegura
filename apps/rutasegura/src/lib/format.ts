import type {
  DeliverySlot,
  DeliveryWindow,
  NotificationKind,
  ShipmentAuditType,
  ShipmentStatus,
} from "@rutasegura/contracts";

/** America/Bogota es UTC-5 todo el año. */
export const TIME_ZONE = "America/Bogota";

type Tone = "success" | "warning" | "danger" | "neutral" | "route";

export const STATUS_LABEL: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  created: { label: "Registrado", tone: "neutral" },
  in_transit: { label: "En tránsito", tone: "neutral" },
  out_for_delivery: { label: "En reparto", tone: "route" },
  delivered: { label: "Entregado", tone: "success" },
  exception: { label: "Novedad", tone: "warning" },
};

/** Guía enmascarada para vistas públicas: "RS0000000009" → "RS-****-0009". */
export function maskTracking(trackingNumber: string): string {
  return `${trackingNumber.slice(0, 2)}-****-${trackingNumber.slice(-4)}`;
}

/** Titular y explicación de cada estado, en el lenguaje de quien espera un paquete. */
export const STATUS_INFO: Record<ShipmentStatus, { headline: string; description: string }> = {
  created: {
    headline: "Recibimos tu envío",
    description: "El paquete quedó registrado y pronto saldrá hacia su destino.",
  },
  in_transit: {
    headline: "Tu envío va en camino",
    description: "El paquete se mueve entre nuestras sedes rumbo a la ciudad de entrega.",
  },
  out_for_delivery: {
    headline: "Llega hoy",
    description: "Un repartidor ya lleva tu paquete. Ten a mano un documento para recibirlo.",
  },
  delivered: {
    headline: "Entregado",
    description: "El paquete llegó a su destino. Gracias por confiar en RutaSegura.",
  },
  exception: {
    headline: "Tu envío tiene una novedad",
    description:
      "Hubo un inconveniente en el camino y lo estamos resolviendo. Te avisaremos apenas avance.",
  },
};

/** Texto de cada evento del recorrido. */
export const EVENT_LABEL: Record<ShipmentStatus, string> = {
  created: "Envío registrado",
  in_transit: "En tránsito",
  out_for_delivery: "Salió a reparto",
  delivered: "Entregado",
  exception: "Novedad en la entrega",
};

export const PROGRESS_STEPS: { status: ShipmentStatus; label: string }[] = [
  { status: "created", label: "Registrado" },
  { status: "in_transit", label: "En camino" },
  { status: "out_for_delivery", label: "En reparto" },
  { status: "delivered", label: "Entregado" },
];

/** Paso alcanzado (0 a 3). Una novedad ocurre en el camino: se muestra en el paso 1. */
export function progressStep(status: ShipmentStatus): number {
  if (status === "exception") return 1;
  return PROGRESS_STEPS.findIndex((step) => step.status === status);
}

export const AUDIT_LABEL: Record<ShipmentAuditType, string> = {
  claimed: "Envío vinculado a tu cuenta",
  scheduled: "Franja seleccionada",
  rescheduled: "Franja reprogramada",
  unscheduled: "Franja cancelada",
  status_changed: "Cambio de estado",
  document_url_issued: "Enlace de descarga generado",
};

/** Título de cada aviso. Nunca lleva datos del envío: el detalle se ve dentro del envío. */
export const NOTIFICATION_LABEL: Record<NotificationKind, string> = {
  shipment_scheduled: "Entrega agendada",
  shipment_rescheduled: "Entrega reprogramada",
  shipment_unscheduled: "Agenda cancelada",
  shipment_status_changed: "Tu envío cambió de estado",
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

/** Fecha `YYYY-MM-DD` en partes cortas para una tarjeta de calendario: "lun", 13, "oct". */
export function calendarDayParts(date: string): { weekday: string; day: number; month: string } {
  const day = new Date(`${date}T00:00:00Z`);
  return {
    weekday: WEEKDAYS[day.getUTCDay()]!.slice(0, 3),
    day: day.getUTCDate(),
    month: MONTHS[day.getUTCMonth()]!.slice(0, 3),
  };
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

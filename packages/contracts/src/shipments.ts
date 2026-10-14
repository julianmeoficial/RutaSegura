import { z } from "zod";
import { shipmentStatusSchema, trackingRequestSchema } from "./tracking";

/** ULID en Crockford base32: 26 caracteres, el primero como máximo `7`. */
export const ulidSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);

/** El reclamo pide lo mismo que el rastreo: guía y últimos 4 dígitos. */
export const claimRequestSchema = trackingRequestSchema;

export type ClaimRequest = z.infer<typeof claimRequestSchema>;

export const deliverySlotSchema = z.enum(["08-10", "10-12", "12-14", "14-16", "16-18"]);

export type DeliverySlot = z.infer<typeof deliverySlotSchema>;

/** Fecha de calendario en Bogotá y franja; el cliente nunca envía instantes arbitrarios. */
export const scheduleRequestSchema = z
  .object({
    date: z.iso.date(),
    slot: deliverySlotSchema,
  })
  .strict();

export type ScheduleRequest = z.infer<typeof scheduleRequestSchema>;

export const deliveryWindowSchema = z.object({
  date: z.iso.date(),
  slot: deliverySlotSchema,
});

export type DeliveryWindow = z.infer<typeof deliveryWindowSchema>;

/** Envío visto por su dueño. Nunca nombre ni teléfono del destinatario. */
export const shipmentSummarySchema = z.object({
  id: ulidSchema,
  trackingNumber: z.string(),
  status: shipmentStatusSchema,
  window: deliveryWindowSchema.nullable(),
});

export type ShipmentSummary = z.infer<typeof shipmentSummarySchema>;

export const shipmentListResponseSchema = z.object({
  shipments: z.array(shipmentSummarySchema),
});

export type ShipmentListResponse = z.infer<typeof shipmentListResponseSchema>;

export const shipmentAuditTypeSchema = z.enum([
  "claimed",
  "scheduled",
  "rescheduled",
  "status_changed",
  "unscheduled",
  "document_url_issued",
]);

export type ShipmentAuditType = z.infer<typeof shipmentAuditTypeSchema>;

export const shipmentDetailSchema = shipmentSummarySchema.extend({
  audit: z.array(
    z.object({
      type: shipmentAuditTypeSchema,
      fromStatus: shipmentStatusSchema.nullable(),
      toStatus: shipmentStatusSchema.nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
});

export type ShipmentDetail = z.infer<typeof shipmentDetailSchema>;

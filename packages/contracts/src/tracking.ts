import { z } from "zod";

/** Guías con prefijo `RS` y diez dígitos, por ejemplo `RS0000000001`. */
export const trackingNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^RS\d{10}$/);

export const trackingRequestSchema = z
  .object({
    trackingNumber: trackingNumberSchema,
    phoneLast4: z.string().regex(/^\d{4}$/),
  })
  .strict();

export type TrackingRequest = z.infer<typeof trackingRequestSchema>;

export const shipmentStatusSchema = z.enum([
  "created",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
]);

export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;

/** Un paso del recorrido: estado, ciudad y momento. */
export const shipmentEventSchema = z.object({
  status: shipmentStatusSchema,
  city: z.string(),
  occurredAt: z.iso.datetime(),
});

export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;

/** Solo estado y recorrido: nunca nombre, teléfono ni dirección del destinatario. */
export const trackingResponseSchema = z.object({
  trackingNumber: z.string(),
  status: shipmentStatusSchema,
  events: z.array(shipmentEventSchema),
});

export type TrackingResponse = z.infer<typeof trackingResponseSchema>;

import { z } from "zod";

export const notificationKindSchema = z.enum([
  "shipment_scheduled",
  "shipment_rescheduled",
  "shipment_status_changed",
]);

export type NotificationKind = z.infer<typeof notificationKindSchema>;

export const NOTIFICATIONS_PAGE_MAX = 50;

/** `?limit=` opcional; cualquier otro parámetro se rechaza. */
export const notificationListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(NOTIFICATIONS_PAGE_MAX).default(20),
  })
  .strict();

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

/**
 * Aviso simulado visto por su destinatario. El cuerpo es una plantilla fija:
 * nunca trae guía, identificador de envío, nombre, teléfono, dirección ni franja.
 */
export const notificationSchema = z.object({
  kind: notificationKindSchema,
  body: z.string(),
  createdAt: z.iso.datetime(),
  read: z.boolean(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const notificationListResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
});

export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;

export const markNotificationsReadResponseSchema = z.object({
  unreadCount: z.literal(0),
});

export type MarkNotificationsReadResponse = z.infer<typeof markNotificationsReadResponseSchema>;

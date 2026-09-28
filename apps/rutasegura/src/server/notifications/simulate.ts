import "server-only";
import { logger } from "@/server/logger";
import type { Tx } from "@/server/repositories/db";
import { insertNotification, type NotificationKind } from "@/server/repositories/notifications";

/**
 * Cuerpo único para todo aviso. Un correo o SMS puede leerse en la pantalla
 * bloqueada o quedar en un buzón compartido: nunca lleva guía, identificador,
 * nombre, teléfono, dirección, ciudad ni franja.
 */
export const NOTIFICATION_BODY =
  "Hay una novedad en uno de tus envíos. Entra a RutaSegura para ver el detalle.";

/** Simula el envío de un aviso: guarda la fila y deja constancia en el log. */
export async function enqueueNotification(
  tx: Tx,
  notification: { userId: string; kind: NotificationKind },
): Promise<void> {
  await insertNotification(tx, { ...notification, body: NOTIFICATION_BODY });
  logger.info("notification.enqueued", { kind: notification.kind, userId: notification.userId });
}

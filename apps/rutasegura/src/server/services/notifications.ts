import "server-only";
import type { NotificationListResponse } from "@rutasegura/contracts";
import { withRlsContext } from "@/server/repositories/db";
import {
  countUnreadNotifications,
  listNotificationsByUser,
  markAllNotificationsRead,
} from "@/server/repositories/notifications";

/** Avisos del usuario de la sesión, del más reciente al más antiguo. */
export async function listNotificationsForUser(
  userId: string,
  limit: number,
): Promise<NotificationListResponse> {
  return withRlsContext({ userId }, async (tx) => {
    const rows = await listNotificationsByUser(tx, userId, limit);
    const unreadCount = await countUnreadNotifications(tx, userId);
    return {
      notifications: rows.map((row) => ({
        kind: row.kind,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        read: row.readAt !== null,
      })),
      unreadCount,
    };
  });
}

/** Marca como leídos todos los avisos pendientes del usuario de la sesión. */
export async function markNotificationsReadForUser(userId: string): Promise<void> {
  await withRlsContext({ userId }, (tx) => markAllNotificationsRead(tx, userId));
}

import "server-only";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { schema } from "@rutasegura/database";
import type { Tx } from "./db";

const { notifications } = schema;

export type NotificationKind = (typeof schema.notificationKind.enumValues)[number];

export async function insertNotification(
  tx: Tx,
  notification: { userId: string; kind: NotificationKind; body: string },
) {
  await tx.insert(notifications).values(notification);
}

export async function listNotificationsByUser(tx: Tx, userId: string, limit: number) {
  return tx
    .select({
      kind: notifications.kind,
      body: notifications.body,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(tx: Tx, userId: string): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

export async function markAllNotificationsRead(tx: Tx, userId: string) {
  await tx
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

import "server-only";
import { schema } from "@rutasegura/database";
import type { Tx } from "./db";

export type NotificationKind = (typeof schema.notificationKind.enumValues)[number];

export async function insertNotification(
  tx: Tx,
  notification: { userId: string; kind: NotificationKind; body: string },
) {
  await tx.insert(schema.notifications).values(notification);
}

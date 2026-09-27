import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { schema } from "@rutasegura/database";
import { db } from "./db";

const { sessions } = schema;

export type SessionRecord = typeof sessions.$inferSelect;

export async function insertSession(input: {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  ipHash: string | null;
  userAgent: string | null;
}): Promise<SessionRecord> {
  const [session] = await db().insert(sessions).values(input).returning();
  if (!session) throw new Error("SessionInsertFailed");
  return session;
}

export async function findSessionByTokenHash(
  tokenHash: string,
): Promise<SessionRecord | undefined> {
  const [session] = await db()
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  return session;
}

/** Sesión vigente: existe, no está revocada y no ha vencido. */
export async function isSessionActive(sessionId: string): Promise<boolean> {
  const [row] = await db()
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        isNull(sessions.revokedAt),
        sql`${sessions.expiresAt} > now()`,
      ),
    )
    .limit(1);
  return row !== undefined;
}

/**
 * Revoca la sesión actual y crea su reemplazo en una transacción. El `UPDATE`
 * condicionado a `revoked_at IS NULL` bloquea la fila: de dos peticiones
 * concurrentes con el mismo token, solo una rota; la otra recibe `undefined`.
 */
export async function rotateSession(
  current: SessionRecord,
  next: { tokenHash: string; expiresAt: Date; ipHash: string | null; userAgent: string | null },
): Promise<SessionRecord | undefined> {
  return db().transaction(async (tx) => {
    const revoked = await tx
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(sessions.id, current.id), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    if (revoked.length === 0) return undefined;

    const [created] = await tx
      .insert(sessions)
      .values({ userId: current.userId, familyId: current.familyId, ...next })
      .returning();
    if (!created) throw new Error("SessionInsertFailed");

    await tx.update(sessions).set({ replacedBy: created.id }).where(eq(sessions.id, current.id));
    return created;
  });
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db()
    .update(sessions)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

export async function revokeFamily(familyId: string): Promise<void> {
  await db()
    .update(sessions)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(sessions.familyId, familyId), isNull(sessions.revokedAt)));
}

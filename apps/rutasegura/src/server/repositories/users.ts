import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { schema } from "@rutasegura/database";
import type { AuthUser } from "@rutasegura/contracts";
import { db } from "./db";

const { users } = schema;

export type UserRecord = typeof users.$inferSelect;

export function toAuthUser(user: UserRecord): AuthUser {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  const [user] = await db().select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

/** Devuelve `undefined` si el correo ya existía, sin lanzar ni revelar nada más. */
export async function insertUser(input: {
  email: string;
  fullName: string;
  passwordHash: string;
}): Promise<UserRecord | undefined> {
  const [user] = await db()
    .insert(users)
    .values(input)
    .onConflictDoNothing({ target: users.email })
    .returning();
  return user;
}

/** Incremento atómico: intentos concurrentes no pueden perder fallos. */
export async function incrementFailedLogins(
  userId: string,
): Promise<{ failedLoginCount: number; lockoutLevel: number } | undefined> {
  const [row] = await db()
    .update(users)
    .set({ failedLoginCount: sql`${users.failedLoginCount} + 1`, updatedAt: sql`now()` })
    .where(eq(users.id, userId))
    .returning({ failedLoginCount: users.failedLoginCount, lockoutLevel: users.lockoutLevel });
  return row;
}

/**
 * Bloquea la cuenta y reinicia el contador. La condición sobre el contador
 * evita que dos fallos simultáneos apliquen dos bloqueos y suban dos niveles.
 */
export async function lockAccount(
  userId: string,
  threshold: number,
  lockSeconds: number,
): Promise<boolean> {
  const locked = await db()
    .update(users)
    .set({
      failedLoginCount: 0,
      lockoutLevel: sql`${users.lockoutLevel} + 1`,
      lockedUntil: sql`now() + make_interval(secs => ${lockSeconds})`,
      updatedAt: sql`now()`,
    })
    .where(and(eq(users.id, userId), gte(users.failedLoginCount, threshold)))
    .returning({ id: users.id });
  return locked.length > 0;
}

export async function clearLockout(userId: string): Promise<void> {
  await db()
    .update(users)
    .set({ failedLoginCount: 0, lockoutLevel: 0, lockedUntil: null, updatedAt: sql`now()` })
    .where(eq(users.id, userId));
}

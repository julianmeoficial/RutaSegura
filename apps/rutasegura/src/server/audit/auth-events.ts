import "server-only";
import { schema } from "@rutasegura/database";
import { keyedDigest } from "@/server/auth/digest";
import { getEnv } from "@/server/env";
import { errorKind, logger } from "@/server/logger";
import { db } from "@/server/repositories/db";

export type AuthEventType = (typeof schema.authEventType.enumValues)[number];

export type AuthEventInput = {
  type: AuthEventType;
  userId?: string | null;
  /** Correo o número de guía; se guarda solo su HMAC. */
  subject?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Registra un evento de autenticación. Un fallo al escribir la bitácora se
 * registra en el log, pero no tumba el login del usuario.
 */
export async function recordAuthEvent(event: AuthEventInput): Promise<void> {
  const { HMAC_SECRET } = getEnv();
  try {
    await db()
      .insert(schema.authEvents)
      .values({
        type: event.type,
        userId: event.userId ?? null,
        subjectHash: event.subject
          ? keyedDigest(HMAC_SECRET, "audit-subject", event.subject)
          : null,
        ipHash: event.ip ? keyedDigest(HMAC_SECRET, "audit-ip", event.ip) : null,
        userAgent: event.userAgent ?? null,
      });
  } catch (error) {
    logger.error("audit.write_failed", { event: event.type, kind: errorKind(error) });
  }
}

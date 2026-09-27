import { createHmac } from "node:crypto";

/**
 * HMAC de los últimos 4 dígitos del teléfono, ligado al número de guía. Sin el
 * secreto, una copia de la base no permite probar las 10 000 combinaciones.
 */
export function phoneLast4Digest(secret: string, trackingNumber: string, last4: string): string {
  return createHmac("sha256", secret).update(`${trackingNumber}:${last4}`).digest("base64url");
}

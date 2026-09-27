import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC-SHA256 con un prefijo de propósito, para que el mismo valor produzca
 * resúmenes distintos en cada uso (claves de rate limit, bitácora, tokens).
 */
export function keyedDigest(secret: string, purpose: string, value: string): string {
  return createHmac("sha256", secret).update(`${purpose}:${value}`).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

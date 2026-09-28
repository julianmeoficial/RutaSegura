import "server-only";
import { randomBytes } from "node:crypto";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
const MAX_TIME = 2 ** 48 - 1;

/** 48 bits de tiempo en ms (10 caracteres) y 80 bits aleatorios (16 caracteres). */
export function generateUlid(now: number = Date.now()): string {
  if (!Number.isInteger(now) || now < 0 || now > MAX_TIME) {
    throw new RangeError("ULID fuera de rango");
  }

  let time = "";
  let remaining = now;
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[remaining % 32] + time;
    remaining = Math.floor(remaining / 32);
  }

  let random = 0n;
  for (const byte of randomBytes(10)) random = (random << 8n) | BigInt(byte);
  let suffix = "";
  for (let i = 0; i < 16; i++) {
    suffix = CROCKFORD[Number(random & 31n)] + suffix;
    random >>= 5n;
  }

  return time + suffix;
}

export function isUlid(value: string): boolean {
  return ULID_PATTERN.test(value);
}

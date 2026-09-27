import "server-only";
import { hash, verify, type Algorithm, type Options } from "@node-rs/argon2";

/** `Algorithm` es un const enum ambiental; con `isolatedModules` se usa su valor. */
const ARGON2ID = 2 as Algorithm;

/** Parámetros mínimos recomendados por OWASP para Argon2id. */
export const ARGON2_OPTIONS: Options = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

let decoyHash: Promise<string> | undefined;

/**
 * Verifica una contraseña. Si la cuenta no existe (`storedHash` nulo) calcula
 * igualmente un Argon2id contra un hash señuelo, para que el tiempo de
 * respuesta no revele qué correos están registrados.
 */
export async function verifyPassword(
  storedHash: string | null,
  password: string,
): Promise<boolean> {
  if (storedHash === null) {
    decoyHash ??= hashPassword("rutasegura-decoy-password-never-valid");
    await verify(await decoyHash, password).catch(() => false);
    return false;
  }
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}

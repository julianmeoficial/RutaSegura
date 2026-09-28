import "server-only";

/**
 * Recurso inexistente o ajeno. Las rutas lo traducen a `404 not_found`, nunca a
 * `403`: responder distinto a "no existe" y a "no es tuyo" sería un oráculo de IDOR.
 */
export class OwnershipError extends Error {
  constructor() {
    super("resource_not_owned");
    this.name = "OwnershipError";
  }
}

type Owned = { ownerId: string | null };

/**
 * Autorización por objeto: el dueño debe ser exactamente el usuario de la
 * sesión. Un recurso sin dueño (`null`) no es de nadie.
 */
export function assertOwnership<T extends Owned>(
  resource: T | null | undefined,
  userId: string,
): asserts resource is T & { ownerId: string } {
  if (!resource || resource.ownerId === null || resource.ownerId !== userId) {
    throw new OwnershipError();
  }
}

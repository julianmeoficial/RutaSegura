import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase, type Database } from "@rutasegura/database";
import { getEnv } from "@/server/env";

export function db(): Database {
  return getDatabase(getEnv().DATABASE_URL);
}

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type RlsMode = "public_tracking" | "claim" | "operator";

export type RlsContext = { userId?: string | null; mode?: RlsMode };

/**
 * Transacción con el contexto que leen las políticas RLS (`app.user_id`,
 * `app.mode`). `set_config(..., true)` equivale a `SET LOCAL`: el valor muere
 * con la transacción y no se filtra a otra petición que reutilice la conexión.
 */
export function withRlsContext<T>(context: RlsContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db().transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.user_id', ${context.userId ?? ""}, true), set_config('app.mode', ${context.mode ?? ""}, true)`,
    );
    return fn(tx);
  });
}

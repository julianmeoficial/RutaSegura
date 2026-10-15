import "server-only";
import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type Connection = { client: postgres.Sql; db: Database };

const globalForDb = globalThis as unknown as { rutaseguraDb?: Connection };

const TRANSACTION_POOLER_PORT = "6543";

/**
 * El pooler de Supabase en modo transacción (puerto 6543) reparte cada
 * transacción entre conexiones distintas: no admite sentencias preparadas y
 * cada instancia serverless debe abrir pocas conexiones.
 */
export function connectionOptions(databaseUrl: string): { max: number; prepare: boolean } {
  const pooled = new URL(databaseUrl).port === TRANSACTION_POOLER_PORT;
  return pooled ? { max: 3, prepare: false } : { max: 10, prepare: true };
}

/**
 * Devuelve una conexión reutilizable. En desarrollo se guarda en `globalThis`
 * para que la recarga en caliente no abra un pool nuevo en cada cambio.
 */
export function getDatabase(databaseUrl: string): Database {
  if (!globalForDb.rutaseguraDb) {
    const client = postgres(databaseUrl, {
      ...connectionOptions(databaseUrl),
      idle_timeout: 20,
      connect_timeout: 5,
    });
    globalForDb.rutaseguraDb = { client, db: drizzle(client, { schema }) };
  }
  return globalForDb.rutaseguraDb.db;
}

export async function pingDatabase(db: Database): Promise<void> {
  await db.execute(sql`select 1`);
}

export { schema };
export { phoneLast4Digest } from "./tracking-digest";

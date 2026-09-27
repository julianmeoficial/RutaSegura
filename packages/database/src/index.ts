import "server-only";
import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type Connection = { client: postgres.Sql; db: Database };

const globalForDb = globalThis as unknown as { rutaseguraDb?: Connection };

/**
 * Devuelve una conexión reutilizable. En desarrollo se guarda en `globalThis`
 * para que la recarga en caliente no abra un pool nuevo en cada cambio.
 */
export function getDatabase(databaseUrl: string): Database {
  if (!globalForDb.rutaseguraDb) {
    const client = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 5,
      prepare: true,
    });
    globalForDb.rutaseguraDb = { client, db: drizzle(client, { schema }) };
  }
  return globalForDb.rutaseguraDb.db;
}

export async function pingDatabase(db: Database): Promise<void> {
  await db.execute(sql`select 1`);
}

export { schema };

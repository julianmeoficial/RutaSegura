import "server-only";
import { getDatabase, type Database } from "@rutasegura/database";
import { getEnv } from "@/server/env";

export function db(): Database {
  return getDatabase(getEnv().DATABASE_URL);
}

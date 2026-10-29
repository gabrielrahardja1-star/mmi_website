import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import * as authSchema from "./auth-schema";
import * as schema from "./schema";

const fullSchema = { ...schema, ...authSchema };
export type Db = NodePgDatabase<typeof fullSchema>;

// Kept on globalThis so Next's dev hot reload doesn't open a new pool on every edit.
const g = globalThis as unknown as { __mmiDb?: Db };

export function getDb(): Db {
  if (!g.__mmiDb) {
    // Small pool: the central Postgres is shared with the other internal apps.
    const pool = new Pool({ connectionString: getEnv().DATABASE_URL, max: 5 });
    g.__mmiDb = drizzle(pool, { schema: fullSchema });
  }
  return g.__mmiDb;
}

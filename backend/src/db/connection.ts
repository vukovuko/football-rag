import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../../env.ts";

/**
 * Database Connection
 *
 * Uses DATABASE_URL from env.ts
 * Connection pool managed by pg
 */

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool);

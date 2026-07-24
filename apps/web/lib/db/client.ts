import { Pool } from "pg";

/**
 * A single shared connection pool. Next.js dev mode re-evaluates modules on
 * every edit, which would otherwise leak a new Pool (and new connections)
 * per hot-reload — stash it on globalThis so we reuse the same instance.
 */
const globalForDb = globalThis as unknown as { pgPool?: Pool };

console.log("DATABASE_URL is set:", Boolean(process.env.DATABASE_URL));

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

/** Thin query helper so call sites don't need to import `pg` types directly. */
export async function query<Row extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<Row[]> {
  const result = await pool.query<Row>(text, params);
  return result.rows;
}

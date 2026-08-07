import postgres from "postgres";

const globalForStudio = globalThis as unknown as { studioSql?: postgres.Sql };

// Prisma Studio's postgresjs executor requires a `postgres` (postgres.js) client,
// not the `pg` Pool used everywhere else in this app (see ./client.ts). Kept as a
// separate, small connection pool so Studio traffic can't starve the main app pool.
export const studioSql =
  globalForStudio.studioSql ??
  postgres(process.env.DATABASE_URL!, { max: 3 });

if (process.env.NODE_ENV !== "production") {
  globalForStudio.studioSql = studioSql;
}

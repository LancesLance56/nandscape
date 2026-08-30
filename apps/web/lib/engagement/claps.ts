import { query } from "@/lib/db/client";

/**
 * Applause, countable, and open to readers who are not signed in.
 *
 * The shape is Medium's: one reader can clap up to CLAP_MAX times on one
 * thing, so the total measures enthusiasm rather than reach. Each clapper gets
 * one row that is incremented in place, which is why the public total is a SUM
 * over rows and not a count of them.
 *
 * Signed-out readers are identified by a random id their browser keeps (see
 * useClapperId). That is deliberately weak: clearing site data or switching
 * device earns a fresh allowance. Tightening it would mean fingerprinting or
 * logging IPs against what people read, which is a real privacy cost for a
 * decorative number.
 *
 * Written against the raw pool rather than Prisma to match the rest of
 * apps/web, which does not depend on @repo/db at all despite what CLAUDE.md
 * says; the tables it reads are the ones Prisma migrated.
 */

export type ContentKind = "BLOG" | "TUTORIAL";

/** Per-reader ceiling, matching the convention readers already know. */
export const CLAP_MAX = 50;

export interface ClapState {
  /** Everyone's claps added together. */
  total: number;
  /** This reader's own contribution, so the button can show its allowance. */
  mine: number;
}

export function isContentKind(value: unknown): value is ContentKind {
  return value === "BLOG" || value === "TUTORIAL";
}

/** `user:<id>` for a session, `anon:<random>` for everyone else. */
export function clapperIdFor(userId: string | null, anonId: string | null): string | null {
  if (userId) return `user:${userId}`;
  if (anonId && /^[a-zA-Z0-9_-]{8,64}$/.test(anonId)) return `anon:${anonId}`;
  // A missing or malformed anon id is not worth failing a page over; the
  // reader gets a read-only count until their browser supplies one.
  return null;
}

export async function getClapState(
  targetKind: ContentKind,
  targetSlug: string,
  clapperId: string | null,
): Promise<ClapState> {
  const rows = await query<{ total: string | null; mine: string | null }>(
    `SELECT COALESCE(SUM(count), 0)::text AS total,
            COALESCE(SUM(count) FILTER (WHERE "clapperId" = $3), 0)::text AS mine
       FROM claps
      WHERE "targetKind" = $1::"ContentKind" AND "targetSlug" = $2`,
    [targetKind, targetSlug, clapperId],
  );

  const row = rows[0];
  return { total: Number(row?.total ?? 0), mine: Number(row?.mine ?? 0) };
}

/**
 * Add to this reader's tally and return the new state.
 *
 * One statement, so two rapid taps from the same reader cannot race into two
 * rows: the unique index turns the second into an update. The ceiling is
 * applied in SQL with LEAST rather than read-then-write, which would let
 * concurrent requests both see the same "room left" and overshoot it.
 */
export async function addClaps(
  targetKind: ContentKind,
  targetSlug: string,
  clapperId: string,
  amount: number,
): Promise<ClapState> {
  const requested = Math.floor(amount);
  if (!Number.isFinite(requested) || requested < 1) {
    return getClapState(targetKind, targetSlug, clapperId);
  }

  // Never trust the posted amount: the only thing between this and an
  // arbitrary number is a fetch call anyone can edit.
  const delta = Math.min(requested, CLAP_MAX);

  await query(
    `INSERT INTO claps (id, "targetKind", "targetSlug", "clapperId", count, created_at, updated_at)
     VALUES (gen_random_uuid()::text, $1::"ContentKind", $2, $3, LEAST($4::int, $5::int), now(), now())
     ON CONFLICT ("targetKind", "targetSlug", "clapperId")
     -- Params need explicit ::int here. Untyped placeholders default to text,
     -- which Postgres then refuses to assign to an integer column (42804).
     DO UPDATE SET count = LEAST(claps.count + $4::int, $5::int), updated_at = now()`,
    [targetKind, targetSlug, clapperId, delta, CLAP_MAX],
  );

  return getClapState(targetKind, targetSlug, clapperId);
}

/** Totals for a list of slugs in one query, for index pages. */
export async function getClapTotals(targetKind: ContentKind, slugs: string[]): Promise<Map<string, number>> {
  if (slugs.length === 0) return new Map();

  const rows = await query<{ targetSlug: string; total: string }>(
    `SELECT "targetSlug", COALESCE(SUM(count), 0)::text AS total
       FROM claps
      WHERE "targetKind" = $1::"ContentKind" AND "targetSlug" = ANY($2::text[])
      GROUP BY "targetSlug"`,
    [targetKind, slugs],
  );

  return new Map(rows.map((row) => [row.targetSlug, Number(row.total)]));
}

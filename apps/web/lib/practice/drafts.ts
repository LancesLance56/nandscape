import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";
import { MAX_CODE_BYTES } from "./limits";

/**
 * In-progress, unsubmitted code, following PuzzleProgress's "last state per
 * user" pattern - including its choice to key by slug rather than by id, so
 * re-seeding a problem (a delete plus an insert, and therefore a new id) does
 * not silently discard everyone's work.
 *
 * Keyed by language as well, because switching the picker to glance at the
 * JavaScript stub must not overwrite the Python someone is halfway through.
 */

export interface DraftRow {
  problemSlug: string;
  language: string;
  code: string;
  updatedAt: string;
}

export async function getDraft(
  userId: string,
  problemSlug: string,
  language: string,
): Promise<DraftRow | null> {
  const rows = await query<DraftRow & Record<string, unknown>>(
    `SELECT problem_slug AS "problemSlug", language, code, updated_at AS "updatedAt"
       FROM coding_drafts
      WHERE "userId" = $1 AND problem_slug = $2 AND language = $3
      LIMIT 1`,
    [userId, problemSlug, language],
  );
  return rows[0] ?? null;
}

export async function saveDraft(
  userId: string,
  problemSlug: string,
  language: string,
  code: string,
): Promise<DraftRow> {
  const rows = await query<DraftRow & Record<string, unknown>>(
    // `id` is supplied rather than defaulted: Prisma's @default(uuid())
    // generates client-side, so the column has no DB default - the same
    // reason puzzle_progress passes its own id here.
    `INSERT INTO coding_drafts (id, "userId", problem_slug, language, code, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now(), now())
     ON CONFLICT ("userId", problem_slug, language)
     DO UPDATE SET code = EXCLUDED.code, updated_at = now()
     RETURNING problem_slug AS "problemSlug", language, code, updated_at AS "updatedAt"`,
    [randomUUID(), userId, problemSlug, language, code.slice(0, MAX_CODE_BYTES)],
  );
  return rows[0];
}

export async function deleteDraft(
  userId: string,
  problemSlug: string,
  language: string,
): Promise<boolean> {
  const rows = await query<{ problem_slug: string }>(
    `DELETE FROM coding_drafts
      WHERE "userId" = $1 AND problem_slug = $2 AND language = $3
      RETURNING problem_slug`,
    [userId, problemSlug, language],
  );
  return rows.length > 0;
}

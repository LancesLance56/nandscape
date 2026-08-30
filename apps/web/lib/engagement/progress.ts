import { query } from "@/lib/db/client";

/**
 * What a reader has finished, and when.
 *
 * Two sources feed the dashboard: tutorial pages marked done, and quiz runs.
 * Both are stored per event with a date rather than as a running total,
 * because the activity heatmap needs something to plot on a day and a counter
 * cannot be un-summed back into one.
 *
 * Only completions are stored. "Not started" is the absence of a row, so
 * publishing a new lesson never requires backfilling anything.
 *
 * Raw pool rather than Prisma, matching the rest of apps/web.
 */

export interface TutorialProgressEntry {
  pageSlug: string;
  trackSlug: string | null;
  completedAt: Date;
}

export interface QuizAttemptEntry {
  quizKey: string;
  score: number;
  total: number;
  createdAt: Date;
}

interface ProgressRow {
  page_slug: string;
  track_slug: string | null;
  completed_at: Date;
  [key: string]: unknown;
}

interface AttemptRow {
  quiz_key: string;
  score: number;
  total: number;
  created_at: Date;
  [key: string]: unknown;
}

export async function listTutorialProgress(userId: string): Promise<TutorialProgressEntry[]> {
  const rows = await query<ProgressRow>(
    `SELECT page_slug, track_slug, completed_at
       FROM tutorial_progress
      WHERE "userId" = $1
      ORDER BY completed_at DESC`,
    [userId],
  );

  return rows.map((row) => ({
    pageSlug: row.page_slug,
    trackSlug: row.track_slug,
    completedAt: row.completed_at,
  }));
}

/** Whether these specific pages are done, for rendering ticks in a list. */
export async function getCompletedSlugs(userId: string, pageSlugs: string[]): Promise<Set<string>> {
  if (pageSlugs.length === 0) return new Set();

  const rows = await query<{ page_slug: string }>(
    `SELECT page_slug FROM tutorial_progress WHERE "userId" = $1 AND page_slug = ANY($2::text[])`,
    [userId, pageSlugs],
  );

  return new Set(rows.map((row) => row.page_slug));
}

/**
 * Mark a page done or not done, and report where it ended up.
 *
 * Idempotent in both directions on purpose: the button that calls this is a
 * toggle, and a double-tap or a retried request should settle on the state the
 * caller asked for rather than flipping twice.
 */
export async function setTutorialCompletion(
  userId: string,
  pageSlug: string,
  trackSlug: string | null,
  completed: boolean,
): Promise<boolean> {
  if (completed) {
    await query(
      `INSERT INTO tutorial_progress (id, "userId", page_slug, track_slug, completed_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, now())
       ON CONFLICT ("userId", page_slug)
       -- Re-marking something already done must not move its date, or the
       -- heatmap would drift every time someone revisited a page.
       DO UPDATE SET track_slug = EXCLUDED.track_slug`,
      [userId, pageSlug, trackSlug],
    );
    return true;
  }

  await query(`DELETE FROM tutorial_progress WHERE "userId" = $1 AND page_slug = $2`, [userId, pageSlug]);
  return false;
}

export async function recordQuizAttempt(
  userId: string,
  quizKey: string,
  score: number,
  total: number,
): Promise<void> {
  // Nonsense scores are dropped rather than stored: this is posted from the
  // browser, and a bad row would quietly skew the dashboard forever.
  if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || score < 0 || score > total) return;

  await query(
    `INSERT INTO quiz_attempts (id, "userId", quiz_key, score, total, created_at)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, now())`,
    [userId, quizKey, score, total],
  );
}

export async function listQuizAttempts(userId: string): Promise<QuizAttemptEntry[]> {
  const rows = await query<AttemptRow>(
    `SELECT quiz_key, score, total, created_at
       FROM quiz_attempts
      WHERE "userId" = $1
      ORDER BY created_at DESC
      -- Enough to draw a year of activity without unbounded growth on a page
      -- that only renders a heatmap and a short list.
      LIMIT 500`,
    [userId],
  );

  return rows.map((row) => ({
    quizKey: row.quiz_key,
    score: row.score,
    total: row.total,
    createdAt: row.created_at,
  }));
}

/**
 * Activity per day, for the heatmap.
 *
 * A finished lesson and a finished quiz both count as one unit, so a day
 * someone did both reads darker than a day they did one.
 */
export function toActivityCounts(
  tutorials: TutorialProgressEntry[],
  quizzes: QuizAttemptEntry[],
): Map<string, number> {
  const counts = new Map<string, number>();

  const bump = (date: Date) => {
    const key = toDayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  for (const entry of tutorials) bump(entry.completedAt);
  for (const entry of quizzes) bump(entry.createdAt);

  return counts;
}

/** `YYYY-MM-DD` in local time. `toISOString` would bucket by UTC and shift
 *  evening activity into tomorrow for anyone west of Greenwich. */
export function toDayKey(date: Date): string {
  const day = date instanceof Date ? date : new Date(date);
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date2 = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date2}`;
}

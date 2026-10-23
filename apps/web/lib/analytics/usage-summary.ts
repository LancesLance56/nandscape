import { query } from "@/lib/db/client";

/**
 * Site usage for an explicit date range, as aggregates only.
 *
 * This is what `GET /api/admin/analytics/summary` serves to the owner's
 * personal dashboard (nandscape.dev), which lives outside this app and talks
 * to it with a bearer token rather than a session. Because the caller is
 * another system, the shape is a contract: every field is a count, a rate or
 * a content slug/title. No query here selects an email, a username, a name or
 * a user id into its output - user ids appear only inside `count(DISTINCT …)`.
 *
 * The honesty rules of admin-analytics.ts apply: nothing is estimated, and
 * days nothing happened on are zero rows from `generate_series`, not gaps.
 * Days are bucketed with `::date`, i.e. UTC days, for the reason given there.
 *
 * What the data can and cannot say, so the numbers are read correctly:
 *
 * - **Active users** union every dated thing a signed-in reader leaves behind:
 *   a session being created (a sign-in), a lesson completion, a quiz run, a
 *   puzzle save and a practice submission. Sessions are deleted on sign-out
 *   and expiry, and `puzzle_progress` keeps one row per reader per puzzle
 *   stamped with its *last* save, so older days undercount slightly. Signed-out
 *   visitors are invisible: the app records no page views.
 * - **Puzzle** activity comes from `puzzle_progress` (the `PuzzleAttempt` table
 *   is not written by the app). It has no per-attempt history, so a day shows
 *   puzzles *started* and puzzles *solved*, not individual check presses.
 * - **Practice** submissions are Submit presses only. Run records nothing.
 */

/** Longest range one request may ask for. A year of daily rows is plenty for a
 *  chart, and the cap bounds what a leaked token could make the database do. */
export const MAX_RANGE_DAYS = 366;
export const DEFAULT_RANGE_DAYS = 30;
const TOP_LIMIT = 10;

export interface UsageRange {
  /** Inclusive, `YYYY-MM-DD` (UTC). */
  from: string;
  to: string;
  days: number;
}

export interface UsageSummary {
  range: UsageRange;
  generatedAt: string;
  signups: {
    totalUsers: number;
    verifiedUsers: number;
    inRange: number;
    series: { day: string; count: number }[];
  };
  activeUsers: {
    /** Distinct users active on any day of the range. */
    inRange: number;
    /** Trailing windows ending now, independent of the requested range. */
    last7Days: number;
    last30Days: number;
    series: { day: string; count: number }[];
  };
  puzzles: {
    started: number;
    solved: number;
    series: { day: string; started: number; solved: number }[];
  };
  practice: {
    submissions: number;
    accepted: number;
    series: { day: string; submissions: number; accepted: number }[];
    languages: { language: string; submissions: number; accepted: number }[];
  };
  popular: {
    lessons: { slug: string; title: string | null; completions: number }[];
    puzzles: { slug: string; title: string; players: number; solvers: number }[];
    problems: { slug: string; title: string; submissions: number; accepted: number; solvers: number }[];
  };
}

/* -------------------------------------------------------------------------- */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDay(value: string): Date | null {
  if (!ISO_DAY.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  // Rejects 2026-02-30 and friends, which Date rolls over rather than refusing.
  return Number.isNaN(date.getTime()) || toIsoDay(date) !== value ? null : date;
}

/**
 * Resolve `from`/`to` query params into a validated range. Either may be
 * omitted: `to` defaults to today (UTC) and `from` to DEFAULT_RANGE_DAYS
 * before `to`. Returns an error string for the route to send back as a 422.
 */
export function resolveRange(
  fromParam: string | null,
  toParam: string | null,
): { ok: true; range: UsageRange } | { ok: false; error: string } {
  const to = toParam ? parseIsoDay(toParam) : parseIsoDay(toIsoDay(new Date()));
  if (!to) return { ok: false, error: "`to` must be a date in YYYY-MM-DD form" };

  const from = fromParam ? parseIsoDay(fromParam) : new Date(to.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS);
  if (!from) return { ok: false, error: "`from` must be a date in YYYY-MM-DD form" };

  const days = Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;
  if (days < 1) return { ok: false, error: "`from` must not be after `to`" };
  if (days > MAX_RANGE_DAYS) return { ok: false, error: `The range may span at most ${MAX_RANGE_DAYS} days` };

  return { ok: true, range: { from: toIsoDay(from), to: toIsoDay(to), days } };
}

/** See the note on `int` in admin-analytics.ts: counts arrive as bigint strings. */
function int(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** `$1`/`$2` are the inclusive range bounds in every query below. */
const CALENDAR = `calendar AS (SELECT generate_series($1::date, $2::date, interval '1 day')::date AS day)`;
const IN_RANGE = (column: string) => `${column} >= $1::date AND ${column} < $2::date + 1`;

async function getSignups(range: UsageRange): Promise<UsageSummary["signups"]> {
  const params = [range.from, range.to];
  const [[totals], rows] = await Promise.all([
    query(
      `SELECT count(*)                                              AS total,
              count(*) FILTER (WHERE "emailVerifiedAt" IS NOT NULL) AS verified,
              count(*) FILTER (WHERE ${IN_RANGE(`"createdAt"`)})   AS in_range
         FROM "User"`,
      params,
    ),
    query(
      `WITH ${CALENDAR},
       signups AS (
         SELECT "createdAt"::date AS day, count(*) AS n FROM "User"
          WHERE ${IN_RANGE(`"createdAt"`)} GROUP BY 1
       )
       SELECT to_char(c.day, 'YYYY-MM-DD') AS day, COALESCE(s.n, 0) AS n
         FROM calendar c LEFT JOIN signups s ON s.day = c.day
        ORDER BY c.day`,
      params,
    ),
  ]);

  return {
    totalUsers: int(totals?.total),
    verifiedUsers: int(totals?.verified),
    inRange: int(totals?.in_range),
    series: rows.map((row) => ({ day: String(row.day), count: int(row.n) })),
  };
}

/** Every dated trace a signed-in user leaves, as (userId, at). */
const ACTIVITY_EVENTS = `events AS (
  SELECT "userId", "createdAt"   AS at FROM "Session"
  UNION ALL
  SELECT "userId", completed_at  AS at FROM tutorial_progress
  UNION ALL
  SELECT "userId", created_at    AS at FROM quiz_attempts
  UNION ALL
  SELECT "userId", updated_at    AS at FROM puzzle_progress
  UNION ALL
  SELECT "userId", "submittedAt" AS at FROM "CodingSubmission"
)`;

async function getActiveUsers(range: UsageRange): Promise<UsageSummary["activeUsers"]> {
  const params = [range.from, range.to];
  const [[totals], rows] = await Promise.all([
    query(
      `WITH ${ACTIVITY_EVENTS}
       SELECT count(DISTINCT "userId") FILTER (WHERE ${IN_RANGE("at")})                AS in_range,
              count(DISTINCT "userId") FILTER (WHERE at >= now() - interval '7 days')  AS last7,
              count(DISTINCT "userId") FILTER (WHERE at >= now() - interval '30 days') AS last30
         FROM events`,
      params,
    ),
    query(
      `WITH ${CALENDAR}, ${ACTIVITY_EVENTS},
       daily AS (
         SELECT at::date AS day, count(DISTINCT "userId") AS n FROM events
          WHERE ${IN_RANGE("at")} GROUP BY 1
       )
       SELECT to_char(c.day, 'YYYY-MM-DD') AS day, COALESCE(d.n, 0) AS n
         FROM calendar c LEFT JOIN daily d ON d.day = c.day
        ORDER BY c.day`,
      params,
    ),
  ]);

  return {
    inRange: int(totals?.in_range),
    last7Days: int(totals?.last7),
    last30Days: int(totals?.last30),
    series: rows.map((row) => ({ day: String(row.day), count: int(row.n) })),
  };
}

async function getPuzzles(range: UsageRange): Promise<UsageSummary["puzzles"]> {
  const rows = await query(
    `WITH ${CALENDAR},
     started AS (
       SELECT created_at::date AS day, count(*) AS n FROM puzzle_progress
        WHERE ${IN_RANGE("created_at")} GROUP BY 1
     ),
     solved AS (
       SELECT solved_at::date AS day, count(*) AS n FROM puzzle_progress
        WHERE solved AND ${IN_RANGE("solved_at")} GROUP BY 1
     )
     SELECT to_char(c.day, 'YYYY-MM-DD') AS day,
            COALESCE(st.n, 0) AS started,
            COALESCE(so.n, 0) AS solved
       FROM calendar c
       LEFT JOIN started st ON st.day = c.day
       LEFT JOIN solved  so ON so.day = c.day
      ORDER BY c.day`,
    [range.from, range.to],
  );

  const series = rows.map((row) => ({ day: String(row.day), started: int(row.started), solved: int(row.solved) }));
  return {
    started: series.reduce((sum, d) => sum + d.started, 0),
    solved: series.reduce((sum, d) => sum + d.solved, 0),
    series,
  };
}

async function getPractice(range: UsageRange): Promise<UsageSummary["practice"]> {
  const params = [range.from, range.to];
  const [rows, languages] = await Promise.all([
    query(
      `WITH ${CALENDAR},
       daily AS (
         SELECT "submittedAt"::date AS day,
                count(*)                                    AS submissions,
                count(*) FILTER (WHERE verdict = 'ACCEPTED') AS accepted
           FROM "CodingSubmission"
          WHERE ${IN_RANGE(`"submittedAt"`)} GROUP BY 1
       )
       SELECT to_char(c.day, 'YYYY-MM-DD') AS day,
              COALESCE(d.submissions, 0) AS submissions,
              COALESCE(d.accepted, 0)    AS accepted
         FROM calendar c LEFT JOIN daily d ON d.day = c.day
        ORDER BY c.day`,
      params,
    ),
    query(
      `SELECT language,
              count(*)                                    AS submissions,
              count(*) FILTER (WHERE verdict = 'ACCEPTED') AS accepted
         FROM "CodingSubmission"
        WHERE ${IN_RANGE(`"submittedAt"`)}
        GROUP BY language
        ORDER BY count(*) DESC, language`,
      params,
    ),
  ]);

  const series = rows.map((row) => ({
    day: String(row.day),
    submissions: int(row.submissions),
    accepted: int(row.accepted),
  }));
  return {
    submissions: series.reduce((sum, d) => sum + d.submissions, 0),
    accepted: series.reduce((sum, d) => sum + d.accepted, 0),
    series,
    languages: languages.map((row) => ({
      language: String(row.language),
      submissions: int(row.submissions),
      accepted: int(row.accepted),
    })),
  };
}

async function getPopular(range: UsageRange): Promise<UsageSummary["popular"]> {
  const params = [range.from, range.to, TOP_LIMIT];
  const [lessons, puzzles, problems] = await Promise.all([
    query(
      `SELECT g.page_slug AS slug, p.title, count(*) AS completions
         FROM tutorial_progress g
         LEFT JOIN tutorial_pages p ON p.slug = g.page_slug
        WHERE ${IN_RANGE("g.completed_at")}
        GROUP BY g.page_slug, p.title
        ORDER BY count(*) DESC, g.page_slug
        LIMIT $3`,
      params,
    ),
    // A progress row spans first save (created_at) to last (updated_at); it
    // counts as a player in the range when that span overlaps it.
    query(
      `SELECT z.slug, z.title,
              count(*)                                                  AS players,
              count(*) FILTER (WHERE g.solved AND ${IN_RANGE("g.solved_at")}) AS solvers
         FROM puzzle_progress g
         JOIN "Puzzle" z ON z.slug = g.puzzle_slug
        WHERE g.updated_at >= $1::date AND g.created_at < $2::date + 1
        GROUP BY z.slug, z.title
        ORDER BY count(*) DESC, z.title
        LIMIT $3`,
      params,
    ),
    query(
      `SELECT p.slug, p.title,
              count(*)                                                   AS submissions,
              count(*) FILTER (WHERE s.verdict = 'ACCEPTED')             AS accepted,
              count(DISTINCT s."userId") FILTER (WHERE s.verdict = 'ACCEPTED') AS solvers
         FROM "CodingSubmission" s
         JOIN "CodingProblem" p ON p.id = s."problemId"
        WHERE ${IN_RANGE(`s."submittedAt"`)}
        GROUP BY p.slug, p.title
        ORDER BY count(*) DESC, p.title
        LIMIT $3`,
      params,
    ),
  ]);

  return {
    lessons: lessons.map((row) => ({
      slug: String(row.slug),
      title: (row.title as string | null) ?? null,
      completions: int(row.completions),
    })),
    puzzles: puzzles.map((row) => ({
      slug: String(row.slug),
      title: String(row.title),
      players: int(row.players),
      solvers: int(row.solvers),
    })),
    problems: problems.map((row) => ({
      slug: String(row.slug),
      title: String(row.title),
      submissions: int(row.submissions),
      accepted: int(row.accepted),
      solvers: int(row.solvers),
    })),
  };
}

/* -------------------------------------------------------------------------- */

export async function getUsageSummary(range: UsageRange): Promise<UsageSummary> {
  const [signups, activeUsers, puzzles, practice, popular] = await Promise.all([
    getSignups(range),
    getActiveUsers(range),
    getPuzzles(range),
    getPractice(range),
    getPopular(range),
  ]);

  return { range, generatedAt: new Date().toISOString(), signups, activeUsers, puzzles, practice, popular };
}

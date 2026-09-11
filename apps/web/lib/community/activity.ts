import { query } from "@/lib/db/client";

/**
 * What people have been doing, and whether you have been doing it daily.
 *
 * Activity is not a table. Every event below already exists as a row somewhere
 * - a public project, an accepted submission, a solved puzzle, a discussion
 * post, a finished lesson - so a feed is a UNION over those rather than a
 * write-amplifying activity log that could disagree with them.
 */

export interface ActivityEvent {
  actorUsername: string;
  actorName: string | null;
  /** "published a circuit", "solved a problem", ... */
  verb: string;
  /** The specifics under the headline. */
  detail: string;
  href: string;
  at: string;
}

type EventRow = {
  actor_username: string;
  actor_name: string | null;
  verb: string;
  detail: string;
  href: string;
  at: Date;
}

/**
 * One query, six sources.
 *
 * `$1` is the viewer; when it is non-null the feed is restricted to people
 * they follow, and when it is null every public event is fair game. Passing
 * the same parameter to each branch keeps this a single prepared statement
 * instead of two near-identical ones.
 *
 * Only the first accepted submission per problem counts as "solved": a
 * DISTINCT ON over (user, problem) ordered oldest-first, so re-submitting a
 * finished problem does not republish the same event.
 */
const feedSql = (visibility: string): string => `
WITH visible AS (
  SELECT u.id, u.username, u.name FROM "User" u WHERE ${visibility}
),
events AS (
  SELECT v.username AS actor_username, v.name AS actor_name,
         CASE WHEN p.forked_from_id IS NULL THEN 'published a circuit' ELSE 'forked a circuit' END AS verb,
         p.name AS detail,
         '/projects/' || p.slug AS href,
         p.updated_at AS at
    FROM projects p JOIN visible v ON v.id = p.owner_id
   WHERE p.visibility = 'PUBLIC'

  UNION ALL
  SELECT v.username, v.name, 'solved a problem', c.title,
         '/practices/' || c.slug, s.submitted_at
    FROM (
      SELECT DISTINCT ON (sub."userId", sub."problemId")
             sub."userId" AS user_id, sub."problemId" AS problem_id,
             sub."submittedAt" AS submitted_at
        FROM "CodingSubmission" sub
       WHERE sub.verdict = 'ACCEPTED'
       ORDER BY sub."userId", sub."problemId", sub."submittedAt" ASC
    ) s
    JOIN visible v ON v.id = s.user_id
    JOIN "CodingProblem" c ON c.id = s.problem_id

  UNION ALL
  SELECT v.username, v.name, 'solved a puzzle', z.title,
         '/puzzles/' || pp.puzzle_slug, pp.solved_at
    FROM puzzle_progress pp
    JOIN visible v ON v.id = pp."userId"
    JOIN "Puzzle" z ON z.slug = pp.puzzle_slug
   WHERE pp.solved AND pp.solved_at IS NOT NULL

  UNION ALL
  SELECT v.username, v.name,
         CASE WHEN d.parent_id IS NULL THEN 'started a discussion' ELSE 'answered a question' END,
         d.body,
         '/discuss/' || lower(d."targetKind"::text) || '/' || d.target_slug,
         d.created_at
    FROM discussion_posts d JOIN visible v ON v.id = d.author_id

  UNION ALL
  SELECT v.username, v.name, 'finished a lesson', tp.title,
         '/tutorials/' || COALESCE(tt.slug || '/', '') || t.page_slug, t.completed_at
    FROM tutorial_progress t
    JOIN visible v ON v.id = t."userId"
    JOIN tutorial_pages tp ON tp.slug = t.page_slug
    LEFT JOIN tutorial_sections ts ON ts.id = tp.section_id
    LEFT JOIN tutorial_tracks tt ON tt.id = ts.track_id
)
SELECT actor_username, actor_name, verb, detail, href, at
  FROM events
 ORDER BY at DESC
 LIMIT $2
`;

function toEvent(row: EventRow): ActivityEvent {
  return {
    actorUsername: row.actor_username,
    actorName: row.actor_name,
    verb: row.verb,
    // A discussion's detail is its body, which can run long; the rail gets one
    // line of it and the post itself carries the rest.
    detail: row.detail.length > 80 ? `${row.detail.slice(0, 77)}...` : row.detail,
    href: row.href,
    at: row.at.toISOString(),
  };
}

/** One person's own events, for the Activity tab on their profile. */
export async function listPersonActivity(userId: string, limit = 12): Promise<ActivityEvent[]> {
  const rows = await query<EventRow>(feedSql(`u.id = $1`), [userId, limit]);
  return rows.map(toEvent);
}

/* ------------------------------------------------------------------ streak */

export interface StreakState {
  /** Consecutive days ending today or yesterday. */
  days: number;
  /** Newest last, one entry per day, for the strip of cells. */
  cells: { date: string; active: boolean }[];
}

const STREAK_WINDOW = 14;

/**
 * Days on which this person did anything that counts.
 *
 * Counting today as a break the moment midnight passes would reset a streak
 * for someone who has simply not started yet, so a run that ends *yesterday*
 * is still alive. It only dies when a whole day is skipped.
 */
export async function getStreak(userId: string): Promise<StreakState> {
  const rows = await query<{ day: string }>(
    `SELECT DISTINCT to_char(day, 'YYYY-MM-DD') AS day FROM (
       SELECT date_trunc('day', p.updated_at) AS day FROM projects p
        WHERE p.owner_id = $1 AND p.visibility = 'PUBLIC'
       UNION ALL
       SELECT date_trunc('day', s."submittedAt") FROM "CodingSubmission" s
        WHERE s."userId" = $1 AND s.verdict = 'ACCEPTED'
       UNION ALL
       SELECT date_trunc('day', pp.solved_at) FROM puzzle_progress pp
        WHERE pp."userId" = $1 AND pp.solved AND pp.solved_at IS NOT NULL
       UNION ALL
       SELECT date_trunc('day', d.created_at) FROM discussion_posts d WHERE d.author_id = $1
       UNION ALL
       SELECT date_trunc('day', t.completed_at) FROM tutorial_progress t WHERE t."userId" = $1
       UNION ALL
       SELECT date_trunc('day', q.created_at) FROM quiz_attempts q WHERE q."userId" = $1
     ) days
     WHERE day IS NOT NULL`,
    [userId],
  );

  const active = new Set(rows.map((r) => r.day));
  const today = new Date();
  const key = (offset: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };

  let days = 0;
  // Start at today if there is activity there, otherwise at yesterday - see
  // the note above about not punishing a day that has barely begun.
  let cursor = active.has(key(0)) ? 0 : 1;
  while (active.has(key(cursor))) {
    days += 1;
    cursor += 1;
  }

  const cells = Array.from({ length: STREAK_WINDOW }, (_, i) => {
    const offset = STREAK_WINDOW - 1 - i;
    return { date: key(offset), active: active.has(key(offset)) };
  });

  return { days, cells };
}

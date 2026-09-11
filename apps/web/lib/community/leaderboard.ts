import { query } from "@/lib/db/client";

/**
 * Activity ranking.
 *
 * Every figure is counted from the rows that already record the thing, so a
 * rank cannot disagree with the profile it links to. Nothing is cached or
 * precomputed: these are indexed counts over tables that are small for a long
 * time yet, and a materialised view would be one more thing to invalidate.
 */

export const METRICS = ["solved", "forks", "answers", "streak"] as const;
export type Metric = (typeof METRICS)[number];

export const FRAMES = ["week", "month", "all"] as const;
export type Frame = (typeof FRAMES)[number];

export function isMetric(value: unknown): value is Metric {
  return typeof value === "string" && (METRICS as readonly string[]).includes(value);
}

export function isFrame(value: unknown): value is Frame {
  return typeof value === "string" && (FRAMES as readonly string[]).includes(value);
}

export const METRIC_LABEL: Record<Metric, string> = {
  solved: "Most solved",
  forks: "Most forked",
  answers: "Most helpful",
  streak: "Longest streak",
};

export const FRAME_LABEL: Record<Frame, string> = {
  week: "This week",
  month: "This month",
  all: "All time",
};

/** The unit printed after the number, so the column reads as a sentence. */
const METRIC_UNIT: Record<Metric, string> = {
  solved: "solved",
  forks: "forks",
  answers: "answers",
  streak: "days",
};

export interface BoardEntry {
  rank: number;
  username: string;
  name: string | null;
  value: number;
  unit: string;
  /** The secondary figure, so a row says more than one number. */
  support: string;
}

type BoardRow = {
  username: string;
  name: string | null;
  value: number;
  support: number;
}

/**
 * `all` has no lower bound, so the predicate is simply true rather than a
 * sentinel date - an epoch cast would quietly exclude anything with a null
 * timestamp and read as a real filter.
 */
function since(frame: Frame): string {
  if (frame === "week") return `now() - INTERVAL '7 days'`;
  if (frame === "month") return `now() - INTERVAL '30 days'`;
  return `'-infinity'::timestamptz`;
}

const LIMIT = 20;

/**
 * Longest run of consecutive active days, by the gaps-and-islands trick:
 * subtracting a dense row number from each date maps every consecutive run
 * onto a single constant, so counting rows per constant counts the run.
 */
function streakSql(frame: Frame): string {
  return `
    WITH days AS (
      SELECT user_id, day FROM (
        SELECT p.owner_id AS user_id, date_trunc('day', p.updated_at) AS day
          FROM projects p WHERE p.visibility = 'PUBLIC' AND p.updated_at >= ${since(frame)}
        UNION
        SELECT s."userId", date_trunc('day', s."submittedAt") FROM "CodingSubmission" s
         WHERE s.verdict = 'ACCEPTED' AND s."submittedAt" >= ${since(frame)}
        UNION
        SELECT pp."userId", date_trunc('day', pp.solved_at) FROM puzzle_progress pp
         WHERE pp.solved AND pp.solved_at >= ${since(frame)}
        UNION
        SELECT d.author_id, date_trunc('day', d.created_at) FROM discussion_posts d
         WHERE d.created_at >= ${since(frame)}
        UNION
        SELECT t."userId", date_trunc('day', t.completed_at) FROM tutorial_progress t
         WHERE t.completed_at >= ${since(frame)}
      ) raw
      GROUP BY user_id, day
    ),
    islands AS (
      SELECT user_id, day,
             day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day))::int * INTERVAL '1 day' AS anchor
        FROM days
    ),
    runs AS (
      SELECT user_id, COUNT(*)::int AS run FROM islands GROUP BY user_id, anchor
    )
    SELECT u.username, u.name, MAX(r.run)::int AS value,
           (SELECT COUNT(DISTINCT s."problemId") FROM "CodingSubmission" s
             WHERE s."userId" = u.id AND s.verdict = 'ACCEPTED')::int AS support
      FROM runs r JOIN "User" u ON u.id = r.user_id
     GROUP BY u.id, u.username, u.name
     ORDER BY value DESC, u.username ASC
     LIMIT ${LIMIT}`;
}

function countSql(metric: Exclude<Metric, "streak">, frame: Frame): string {
  const bound = since(frame);

  if (metric === "solved") {
    return `
      SELECT u.username, u.name,
             COUNT(DISTINCT s."problemId")::int AS value,
             (SELECT COUNT(*) FROM discussion_posts d WHERE d.author_id = u.id)::int AS support
        FROM "CodingSubmission" s JOIN "User" u ON u.id = s."userId"
       WHERE s.verdict = 'ACCEPTED' AND s."submittedAt" >= ${bound}
       GROUP BY u.id, u.username, u.name
       ORDER BY value DESC, u.username ASC
       LIMIT ${LIMIT}`;
  }

  if (metric === "forks") {
    // Forks *of* this person's circuits, made by somebody else. A fork of your
    // own work is a save-as, not a signal.
    return `
      SELECT u.username, u.name, COUNT(*)::int AS value,
             (SELECT COUNT(*) FROM projects p2
               WHERE p2.owner_id = u.id AND p2.visibility = 'PUBLIC')::int AS support
        FROM projects f
        JOIN projects p ON f.forked_from_id = p.id
        JOIN "User" u ON u.id = p.owner_id
       WHERE f.owner_id <> p.owner_id AND f.created_at >= ${bound}
       GROUP BY u.id, u.username, u.name
       ORDER BY value DESC, u.username ASC
       LIMIT ${LIMIT}`;
  }

  return `
    SELECT u.username, u.name, COUNT(*)::int AS value,
           (SELECT COUNT(DISTINCT s."problemId") FROM "CodingSubmission" s
             WHERE s."userId" = u.id AND s.verdict = 'ACCEPTED')::int AS support
      FROM discussion_posts d JOIN "User" u ON u.id = d.author_id
     WHERE d.created_at >= ${bound}
     GROUP BY u.id, u.username, u.name
     ORDER BY value DESC, u.username ASC
     LIMIT ${LIMIT}`;
}

const SUPPORT_LABEL: Record<Metric, (n: number) => string> = {
  solved: (n) => `${n} posts`,
  forks: (n) => `${n} public circuits`,
  answers: (n) => `${n} solved`,
  streak: (n) => `${n} solved`,
};

export async function getLeaderboard(metric: Metric, frame: Frame): Promise<BoardEntry[]> {
  const sql = metric === "streak" ? streakSql(frame) : countSql(metric, frame);
  const rows = await query<BoardRow>(sql);

  return rows
    // A zero is not a ranking. Somebody with no forks this week belongs off
    // the board rather than padding it out to twenty rows.
    .filter((row) => row.value > 0)
    .map((row, index) => ({
      rank: index + 1,
      username: row.username,
      name: row.name,
      value: row.value,
      unit: METRIC_UNIT[metric],
      support: SUPPORT_LABEL[metric](row.support),
    }));
}

import { query } from "@/lib/db/client";
import { toDayKey, type QuizAttemptEntry, type TutorialProgressEntry } from "@/lib/engagement/progress";
import { difficultyToPrisma, type PuzzleDifficulty } from "@/types/puzzle";

/**
 * The reader's own learning position: what they have finished, what comes next,
 * and what to suggest.
 *
 * Everything here is derived from rows the reader created. Nothing is invented
 * to fill a card - "up next" is genuinely the next unfinished lesson in the
 * track they chose, and a suggested puzzle is genuinely one they have not
 * solved. A dashboard that recommends something at random is worse than one
 * that says it has nothing to recommend.
 */

export interface TrackOutline {
  slug: string;
  title: string;
  /** Published pages, in the order a reader walks them: by section position,
   *  then page position. */
  pages: { slug: string; title: string }[];
}

/**
 * Every track and its published pages, in reading order.
 *
 * One query rather than walking `listTutorialNav`, because the ordering that
 * matters here spans three tables - a page's position is only meaningful inside
 * its section, and a section's only inside its track - and reconstructing that
 * in JavaScript from a flat nav tree would mean re-deriving what the ORDER BY
 * already knows.
 */
export async function listTrackOutlines(): Promise<TrackOutline[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT tr.slug AS track_slug, tr.title AS track_title, p.slug, p.title
       FROM tutorial_tracks tr
       JOIN tutorial_sections s ON s.track_id = tr.id
       JOIN tutorial_pages p ON p.section_id = s.id AND p.status = 'published'
      ORDER BY tr.position, tr.title, s.position, p.position, p.title`,
  );

  const byTrack = new Map<string, TrackOutline>();
  for (const row of rows) {
    const slug = String(row.track_slug);
    let track = byTrack.get(slug);
    if (!track) {
      track = { slug, title: String(row.track_title), pages: [] };
      byTrack.set(slug, track);
    }
    track.pages.push({ slug: String(row.slug), title: String(row.title) });
  }

  return Array.from(byTrack.values());
}

export interface TrackProgress extends TrackOutline {
  completed: number;
  /** The first page in reading order this reader has not marked done, or null
   *  when the track is finished. */
  nextPage: { slug: string; title: string } | null;
}

export function toTrackProgress(
  tracks: TrackOutline[],
  completedSlugs: Set<string>,
): TrackProgress[] {
  return tracks.map((track) => {
    const completed = track.pages.filter((page) => completedSlugs.has(page.slug)).length;
    return {
      ...track,
      completed,
      // The first *gap*, not the page after the last completed one: someone who
      // skipped ahead should be sent back to what they missed rather than
      // marched onward past it.
      nextPage: track.pages.find((page) => !completedSlugs.has(page.slug)) ?? null,
    };
  });
}

/**
 * Consecutive days ending today, or ending yesterday.
 *
 * Yesterday counts as the end of a live streak because the day is not over -
 * a streak counter that resets at midnight and tells you at 9am that you have
 * lost eleven days is measuring the clock, not the habit. A streak that ended
 * two or more days ago is genuinely broken and reads zero.
 */
export function currentStreak(days: Iterable<string>): number {
  const set = new Set(days);
  if (set.size === 0) return 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!set.has(toDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(toDayKey(cursor))) return 0;
  }

  let streak = 0;
  while (set.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/**
 * Lessons and quizzes finished in the trailing seven days.
 *
 * Trailing seven days rather than "since Monday": a goal that resets on a fixed
 * weekday punishes whoever studies at weekends, and the card can say "last 7
 * days" and mean it in every timezone.
 */
export function activityThisWeek(
  tutorials: TutorialProgressEntry[],
  quizzes: QuizAttemptEntry[],
): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const inWindow = (value: Date | string) => {
    const ms = value instanceof Date ? value.getTime() : Date.parse(String(value));
    return Number.isFinite(ms) && ms >= cutoff;
  };

  return (
    tutorials.filter((entry) => inWindow(entry.completedAt)).length +
    quizzes.filter((entry) => inWindow(entry.createdAt)).length
  );
}

export interface SuggestedPuzzle {
  slug: string;
  title: string;
  difficulty: string;
  /** True when there is already a saved, unsolved attempt - so the card can say
   *  "resume" rather than "start". */
  started: boolean;
}

/**
 * Unsolved puzzles worth showing this reader.
 *
 * Half-finished puzzles come first: someone with a saved attempt has already
 * chosen that puzzle, and finishing it is a smaller ask than starting a new
 * one. Ordering is deterministic rather than random so the card does not
 * reshuffle itself on every page load.
 */
export async function suggestPuzzles(
  userId: string,
  difficulty: PuzzleDifficulty | null,
  limit = 3,
): Promise<SuggestedPuzzle[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT z.slug, z.title, z.difficulty::text AS difficulty,
            (g.id IS NOT NULL) AS started
       FROM "Puzzle" z
       LEFT JOIN puzzle_progress g ON g.puzzle_slug = z.slug AND g."userId" = $1
      WHERE COALESCE(g.solved, false) = false
        AND ($2::text IS NULL OR z.difficulty::text = $2)
      ORDER BY (g.id IS NOT NULL) DESC,
               CASE z.difficulty
                 WHEN 'EASY' THEN 0 WHEN 'MEDIUM' THEN 1
                 WHEN 'HARD' THEN 2 ELSE 3
               END,
               z.title
      LIMIT $3`,
    [userId, difficulty ? difficultyToPrisma(difficulty) : null, limit],
  );

  return rows.map((row) => ({
    slug: String(row.slug),
    title: String(row.title),
    difficulty: String(row.difficulty).toLowerCase(),
    started: row.started === true,
  }));
}

/** Quiz scores, newest first, for the progress page. Keyed `<page>:<widget>`,
 *  so the page slug is the half worth showing. */
export interface QuizHistoryEntry {
  quizKey: string;
  pageSlug: string;
  pageTitle: string | null;
  best: number;
  latest: number;
  total: number;
  attempts: number;
  lastAttemptAt: Date;
}

export async function listQuizHistory(userId: string, limit = 20): Promise<QuizHistoryEntry[]> {
  const rows = await query<Record<string, unknown>>(
    `WITH ranked AS (
       SELECT quiz_key, score, total, created_at,
              row_number() OVER (PARTITION BY quiz_key ORDER BY created_at DESC) AS recency
         FROM quiz_attempts
        WHERE "userId" = $1
     )
     SELECT r.quiz_key,
            split_part(r.quiz_key, ':', 1) AS page_slug,
            p.title                        AS page_title,
            max(r.score)                   AS best,
            max(r.score) FILTER (WHERE r.recency = 1)   AS latest,
            max(r.total)                   AS total,
            count(*)                       AS attempts,
            max(r.created_at)              AS last_attempt_at
       FROM ranked r
       LEFT JOIN tutorial_pages p ON p.slug = split_part(r.quiz_key, ':', 1)
      GROUP BY r.quiz_key, p.title
      ORDER BY max(r.created_at) DESC
      LIMIT $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    quizKey: String(row.quiz_key),
    pageSlug: String(row.page_slug),
    pageTitle: (row.page_title as string | null) ?? null,
    best: Number(row.best ?? 0),
    latest: Number(row.latest ?? 0),
    total: Number(row.total ?? 0),
    attempts: Number(row.attempts ?? 0),
    lastAttemptAt: row.last_attempt_at as Date,
  }));
}

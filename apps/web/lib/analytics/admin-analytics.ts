import { query } from "@/lib/db/client";

/**
 * What the admin dashboard knows about the site.
 *
 * Every number here is a `count`, a `sum` or an `avg` over a table this app
 * already writes. Nothing is estimated, sampled, extrapolated or seeded with a
 * plausible-looking default: a site with two users and no quiz runs renders two
 * users and an empty quiz panel, because a dashboard that flatters you is worse
 * than no dashboard.
 *
 * There is deliberately no page-view or session-duration analytics. The app
 * records no such events, and the honest way to get them is an analytics
 * provider, not a column invented here that would only ever hold a guess.
 *
 * Raw pool rather than Prisma, matching the rest of apps/web (see
 * lib/engagement/claps.ts for the same note).
 *
 * ## Time buckets
 *
 * Days are bucketed in Postgres with `::date`, which for the `timestamp without
 * time zone` columns Prisma creates means UTC days. The per-user heatmap on
 * /account buckets in local time instead, because there it is one reader's own
 * evening and it should not slide into tomorrow. Here the rows span every
 * reader in every timezone, so there is no "local" to be right about, and a
 * single consistent boundary is what makes yesterday's column comparable to
 * today's.
 */

/** How much history the trend charts show, and the length of one comparison
 *  window - so "last 30 days" is measured against the 30 before it. */
export const WINDOW_DAYS = 30;

export interface DailyCount {
  /** `YYYY-MM-DD`. */
  day: string;
  count: number;
}

export interface DailyActivity {
  day: string;
  lessons: number;
  quizzes: number;
  puzzles: number;
}

export interface AudienceStats {
  totalUsers: number;
  /** Accounts created inside the trailing window, and in the window before it,
   *  so the tile can show a real change rather than a bare number. */
  newUsers: number;
  previousNewUsers: number;
  verifiedUsers: number;
  /** Sign-in method, counted from which credential the row actually carries. A
   *  user can have both (Google sign-in on an account that set a password), so
   *  these two need not sum to `totalUsers`. */
  googleUsers: number;
  passwordUsers: number;
  adminUsers: number;
  /** Users holding at least one session that has not expired yet. This is
   *  "signed in somewhere", not "here right now" - the app records no
   *  last-seen, and sessions run 30 days. */
  usersWithLiveSession: number;
  /** Users who finished a lesson, ran a quiz or touched a puzzle inside the
   *  window. The closest thing to an active-user count the data supports. */
  activeLearners: number;
  previousActiveLearners: number;
}

export interface LibraryStats {
  publishedPosts: number;
  draftPosts: number;
  publishedPages: number;
  draftPages: number;
  tracks: number;
  sections: number;
  /** Published pages that no section owns, so they never appear in the
   *  directory listing - a real content bug, worth surfacing. */
  orphanPages: number;
  puzzles: number;
  diagramPresets: number;
  publicProjects: number;
  unlistedProjects: number;
  privateProjects: number;
  forkedProjects: number;
}

export interface ClappedContent {
  kind: "BLOG" | "TUTORIAL";
  slug: string;
  /** Null when the slug no longer resolves - a clap outlives the post it was
   *  aimed at, which is the whole reason claps are keyed by slug. */
  title: string | null;
  claps: number;
  clappers: number;
}

export interface TrackStats {
  slug: string;
  title: string;
  publishedPages: number;
  /** Distinct (user, page) completions across the whole track. */
  completions: number;
  learners: number;
}

export interface LessonStats {
  slug: string;
  title: string | null;
  completions: number;
}

export interface QuizStats {
  quizKey: string;
  attempts: number;
  /** Mean score as a percentage, rounded. A low number here is the useful
   *  signal: it means the lesson before it is not landing. */
  averagePercent: number;
}

export interface PuzzleStats {
  slug: string;
  title: string;
  difficulty: string;
  solvers: number;
  attempting: number;
}

export interface AdminAnalytics {
  windowDays: number;
  audience: AudienceStats;
  signups: DailyCount[];
  activity: DailyActivity[];
  library: LibraryStats;
  topContent: ClappedContent[];
  tracks: TrackStats[];
  topLessons: LessonStats[];
  quizzes: QuizStats[];
  puzzles: PuzzleStats[];
  /** Puzzles nobody has solved yet. Not a failure - a backlog. */
  untouchedPuzzles: number;
  totalClaps: number;
}

/* -------------------------------------------------------------------------- */

/** Postgres hands back `count(*)` as a bigint, which the pg driver keeps as a
 *  string so it cannot silently lose precision. Every count here goes through
 *  this rather than being trusted to be a number already. */
function int(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

async function getAudience(days: number): Promise<AudienceStats> {
  const [row] = await query<Record<string, unknown>>(
    `SELECT
       count(*)                                                          AS total,
       count(*) FILTER (WHERE "createdAt" >= now() - make_interval(days => $1))                                AS new_users,
       count(*) FILTER (WHERE "createdAt" >= now() - make_interval(days => $1 * 2)
                          AND "createdAt" <  now() - make_interval(days => $1))                                AS prev_new_users,
       count(*) FILTER (WHERE "emailVerifiedAt" IS NOT NULL)             AS verified,
       count(*) FILTER (WHERE "googleId" IS NOT NULL)                    AS google,
       count(*) FILTER (WHERE "passwordHash" IS NOT NULL)                AS password,
       count(*) FILTER (WHERE role = 'ADMIN')                            AS admins
     FROM "User"`,
    [days],
  );

  const [live] = await query<Record<string, unknown>>(
    `SELECT count(DISTINCT "userId") AS n FROM "Session" WHERE "expiresAt" > now()`,
  );

  // One scan per activity table, unioned, then counted distinct. Three separate
  // COUNT DISTINCTs would double-count anyone who did two different things.
  const [active] = await query<Record<string, unknown>>(
    `WITH events AS (
       SELECT "userId", completed_at AS at FROM tutorial_progress
       UNION ALL
       SELECT "userId", created_at    AS at FROM quiz_attempts
       UNION ALL
       SELECT "userId", updated_at    AS at FROM puzzle_progress
     )
     SELECT
       count(DISTINCT "userId") FILTER (WHERE at >= now() - make_interval(days => $1))  AS current,
       count(DISTINCT "userId") FILTER (WHERE at >= now() - make_interval(days => $1 * 2)
                                          AND at <  now() - make_interval(days => $1))  AS previous
     FROM events`,
    [days],
  );

  return {
    totalUsers: int(row?.total),
    newUsers: int(row?.new_users),
    previousNewUsers: int(row?.prev_new_users),
    verifiedUsers: int(row?.verified),
    googleUsers: int(row?.google),
    passwordUsers: int(row?.password),
    adminUsers: int(row?.admins),
    usersWithLiveSession: int(live?.n),
    activeLearners: int(active?.current),
    previousActiveLearners: int(active?.previous),
  };
}

/**
 * A contiguous run of days, zeroes included.
 *
 * `generate_series` supplies the calendar rather than the data doing it: a
 * GROUP BY alone would skip days nothing happened on, and a line chart drawn
 * over the surviving rows would quietly compress a quiet fortnight into a
 * couple of pixels and read as steady traffic.
 */
async function getSignups(days: number): Promise<DailyCount[]> {
  const rows = await query<{ day: string; n: unknown }>(
    `WITH calendar AS (
       SELECT generate_series(current_date - ($1::int - 1), current_date, interval '1 day')::date AS day
     ),
     signups AS (
       SELECT "createdAt"::date AS day, count(*) AS n
         FROM "User"
        WHERE "createdAt" >= current_date - ($1::int - 1)
        GROUP BY 1
     )
     SELECT to_char(c.day, 'YYYY-MM-DD') AS day, COALESCE(s.n, 0) AS n
       FROM calendar c
       LEFT JOIN signups s ON s.day = c.day
      ORDER BY c.day`,
    [days],
  );

  return rows.map((row) => ({ day: row.day, count: int(row.n) }));
}

async function getActivity(days: number): Promise<DailyActivity[]> {
  const rows = await query<Record<string, unknown>>(
    `WITH calendar AS (
       SELECT generate_series(current_date - ($1::int - 1), current_date, interval '1 day')::date AS day
     ),
     lessons AS (
       SELECT completed_at::date AS day, count(*) AS n FROM tutorial_progress
        WHERE completed_at >= current_date - ($1::int - 1) GROUP BY 1
     ),
     quizzes AS (
       SELECT created_at::date AS day, count(*) AS n FROM quiz_attempts
        WHERE created_at >= current_date - ($1::int - 1) GROUP BY 1
     ),
     -- Solves, not saves: puzzle_progress also holds half-finished attempts,
     -- and counting those would make an afternoon of tinkering look like an
     -- afternoon of finishing.
     puzzles AS (
       SELECT solved_at::date AS day, count(*) AS n FROM puzzle_progress
        WHERE solved AND solved_at >= current_date - ($1::int - 1) GROUP BY 1
     )
     SELECT to_char(c.day, 'YYYY-MM-DD') AS day,
            COALESCE(l.n, 0) AS lessons,
            COALESCE(q.n, 0) AS quizzes,
            COALESCE(p.n, 0) AS puzzles
       FROM calendar c
       LEFT JOIN lessons l ON l.day = c.day
       LEFT JOIN quizzes q ON q.day = c.day
       LEFT JOIN puzzles p ON p.day = c.day
      ORDER BY c.day`,
    [days],
  );

  return rows.map((row) => ({
    day: String(row.day),
    lessons: int(row.lessons),
    quizzes: int(row.quizzes),
    puzzles: int(row.puzzles),
  }));
}

async function getLibrary(): Promise<LibraryStats> {
  const [row] = await query<Record<string, unknown>>(
    `SELECT
       (SELECT count(*) FROM blog_posts     WHERE status = 'published')     AS published_posts,
       (SELECT count(*) FROM blog_posts     WHERE status <> 'published')    AS draft_posts,
       (SELECT count(*) FROM tutorial_pages WHERE status = 'published')     AS published_pages,
       (SELECT count(*) FROM tutorial_pages WHERE status <> 'published')    AS draft_pages,
       (SELECT count(*) FROM tutorial_tracks)                               AS tracks,
       (SELECT count(*) FROM tutorial_sections)                             AS sections,
       (SELECT count(*) FROM tutorial_pages
         WHERE status = 'published' AND section_id IS NULL)                 AS orphan_pages,
       (SELECT count(*) FROM "Puzzle")                                      AS puzzles,
       (SELECT count(*) FROM diagram_presets)                               AS presets,
       (SELECT count(*) FROM projects WHERE visibility = 'PUBLIC')          AS public_projects,
       (SELECT count(*) FROM projects WHERE visibility = 'UNLISTED')        AS unlisted_projects,
       (SELECT count(*) FROM projects WHERE visibility = 'PRIVATE')         AS private_projects,
       (SELECT count(*) FROM projects WHERE forked_from_id IS NOT NULL)     AS forks`,
  );

  return {
    publishedPosts: int(row?.published_posts),
    draftPosts: int(row?.draft_posts),
    publishedPages: int(row?.published_pages),
    draftPages: int(row?.draft_pages),
    tracks: int(row?.tracks),
    sections: int(row?.sections),
    orphanPages: int(row?.orphan_pages),
    puzzles: int(row?.puzzles),
    diagramPresets: int(row?.presets),
    publicProjects: int(row?.public_projects),
    unlistedProjects: int(row?.unlisted_projects),
    privateProjects: int(row?.private_projects),
    forkedProjects: int(row?.forks),
  };
}

/**
 * The most-applauded pieces of content.
 *
 * `SUM(count)` rather than `COUNT(*)`: one clapper holds one row and increments
 * it up to CLAP_MAX, so the row count is the number of people and the sum is
 * the applause. Both are reported, because the pair is more honest than either
 * alone - fifty claps from one enthusiast is a different fact from fifty
 * claps from fifty readers.
 */
async function getTopContent(limit: number): Promise<ClappedContent[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT c."targetKind"::text AS kind,
            c."targetSlug"       AS slug,
            SUM(c.count)         AS claps,
            count(*)             AS clappers,
            COALESCE(p.title, t.title) AS title
       FROM claps c
       LEFT JOIN blog_posts     p ON c."targetKind" = 'BLOG'     AND p.slug = c."targetSlug"
       LEFT JOIN tutorial_pages t ON c."targetKind" = 'TUTORIAL' AND t.slug = c."targetSlug"
      GROUP BY c."targetKind", c."targetSlug", p.title, t.title
      ORDER BY SUM(c.count) DESC
      LIMIT $1`,
    [limit],
  );

  return rows.map((row) => ({
    kind: row.kind === "BLOG" ? "BLOG" : "TUTORIAL",
    slug: String(row.slug),
    title: (row.title as string | null) ?? null,
    claps: int(row.claps),
    clappers: int(row.clappers),
  }));
}

/**
 * Per-track reach.
 *
 * Completions join back through `tutorial_progress.track_slug`, the column
 * denormalised for exactly this - a page resolves its track by slug through two
 * nullable joins, and doing that per completion row would be both slower and
 * wrong for any page that has since moved section.
 */
async function getTracks(): Promise<TrackStats[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT tr.slug,
            tr.title,
            (SELECT count(*)
               FROM tutorial_pages p
               JOIN tutorial_sections s ON s.id = p.section_id
              WHERE s.track_id = tr.id AND p.status = 'published')  AS pages,
            (SELECT count(*) FROM tutorial_progress g
              WHERE g.track_slug = tr.slug)                          AS completions,
            (SELECT count(DISTINCT g."userId") FROM tutorial_progress g
              WHERE g.track_slug = tr.slug)                          AS learners
       FROM tutorial_tracks tr
      ORDER BY tr.position, tr.title`,
  );

  return rows.map((row) => ({
    slug: String(row.slug),
    title: String(row.title),
    publishedPages: int(row.pages),
    completions: int(row.completions),
    learners: int(row.learners),
  }));
}

async function getTopLessons(limit: number): Promise<LessonStats[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT g.page_slug AS slug, p.title, count(*) AS completions
       FROM tutorial_progress g
       LEFT JOIN tutorial_pages p ON p.slug = g.page_slug
      GROUP BY g.page_slug, p.title
      ORDER BY count(*) DESC, g.page_slug
      LIMIT $1`,
    [limit],
  );

  return rows.map((row) => ({
    slug: String(row.slug),
    title: (row.title as string | null) ?? null,
    completions: int(row.completions),
  }));
}

/**
 * Quiz difficulty, worst-performing first.
 *
 * `AVG(score::numeric / total)` rather than `SUM(score) / SUM(total)`: the
 * second weights a ten-question quiz five times as heavily as a two-question
 * one, which is a fine way to measure total answers and the wrong way to ask
 * "how did people do on this quiz".
 */
async function getQuizzes(limit: number): Promise<QuizStats[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT quiz_key,
            count(*) AS attempts,
            round(avg(score::numeric / NULLIF(total, 0)) * 100) AS avg_percent
       FROM quiz_attempts
      GROUP BY quiz_key
      ORDER BY avg(score::numeric / NULLIF(total, 0)) ASC, count(*) DESC
      LIMIT $1`,
    [limit],
  );

  return rows.map((row) => ({
    quizKey: String(row.quiz_key),
    attempts: int(row.attempts),
    averagePercent: int(row.avg_percent),
  }));
}

async function getPuzzles(limit: number): Promise<PuzzleStats[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT z.slug,
            z.title,
            z.difficulty::text AS difficulty,
            count(*) FILTER (WHERE g.solved)      AS solvers,
            count(*) FILTER (WHERE NOT g.solved)  AS attempting
       FROM "Puzzle" z
       LEFT JOIN puzzle_progress g ON g.puzzle_slug = z.slug
      GROUP BY z.slug, z.title, z.difficulty
     HAVING count(g.id) > 0
      ORDER BY count(*) FILTER (WHERE g.solved) DESC, z.title
      LIMIT $1`,
    [limit],
  );

  return rows.map((row) => ({
    slug: String(row.slug),
    title: String(row.title),
    difficulty: String(row.difficulty),
    solvers: int(row.solvers),
    attempting: int(row.attempting),
  }));
}

/* -------------------------------------------------------------------------- */

/**
 * Everything the admin dashboard renders, in one round of parallel queries.
 *
 * Each block is independent, so `Promise.all` is not just tidier than awaiting
 * in sequence - it is the difference between one slow query costing the page
 * its own latency and costing it the sum of all nine.
 */
export async function getAdminAnalytics(days: number = WINDOW_DAYS): Promise<AdminAnalytics> {
  const [audience, signups, activity, library, topContent, tracks, topLessons, quizzes, puzzles, extras] =
    await Promise.all([
      getAudience(days),
      getSignups(days),
      getActivity(days),
      getLibrary(),
      getTopContent(6),
      getTracks(),
      getTopLessons(6),
      getQuizzes(6),
      getPuzzles(8),
      query<Record<string, unknown>>(
        `SELECT
           (SELECT COALESCE(SUM(count), 0) FROM claps) AS total_claps,
           (SELECT count(*) FROM "Puzzle" z
             WHERE NOT EXISTS (
               SELECT 1 FROM puzzle_progress g WHERE g.puzzle_slug = z.slug AND g.solved
             )) AS untouched_puzzles`,
      ),
    ]);

  return {
    windowDays: days,
    audience,
    signups,
    activity,
    library,
    topContent,
    tracks,
    topLessons,
    quizzes,
    puzzles,
    totalClaps: int(extras[0]?.total_claps),
    untouchedPuzzles: int(extras[0]?.untouched_puzzles),
  };
}

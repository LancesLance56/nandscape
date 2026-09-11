import { query } from "@/lib/db/client";
import { difficultyFromPrisma, type PrismaDifficulty, type PuzzleDifficulty } from "@/types/puzzle";

/**
 * Public profiles, and the numbers they print.
 *
 * Written against the raw `pg` pool via `query()`, like every other data module
 * in apps/web. Nothing here is denormalised: "solved" is a COUNT DISTINCT over
 * accepted submissions and "forks" is a COUNT of rows pointing back, so there
 * is no counter that can drift away from the rows it summarises.
 *
 * There is no follow graph. Profiles are a record of what somebody has built
 * and written, not a social account.
 */

export interface PersonSummary {
  id: string;
  username: string;
  bio: string | null;
  createdAt: string;
}

export interface ProfileStats {
  /** Distinct coding problems with at least one accepted submission. */
  solved: number;
  /** Puzzles marked solved - counted separately, they are a different thing. */
  puzzles: number;
  /** Public circuits owned. */
  circuits: number;
  /** Forks other people made of this person's circuits. */
  forks: number;
  /** Posts written in discussions. */
  answers: number;
}

export interface Profile extends PersonSummary {
  stats: ProfileStats;
}

type PersonRow = {
  id: string;
  username: string;
  bio: string | null;
  created_at: Date;
};

type StatsRow = PersonRow & {
  solved: number;
  puzzles: number;
  circuits: number;
  forks: number;
  answers: number;
};

/**
 * Every stat in one round trip.
 *
 * Correlated subqueries rather than five joins: each one is independently
 * indexed, and a join fan-out across submissions, projects and posts would
 * need a DISTINCT over the lot to stop the counts multiplying each other.
 */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const rows = await query<StatsRow>(
    `SELECT u.id, u.username, u.bio, u."createdAt" AS created_at,
       (SELECT COUNT(DISTINCT s."problemId") FROM "CodingSubmission" s
          WHERE s."userId" = u.id AND s.verdict = 'ACCEPTED')::int              AS solved,
       (SELECT COUNT(*) FROM puzzle_progress pp
          WHERE pp."userId" = u.id AND pp.solved)::int                          AS puzzles,
       (SELECT COUNT(*) FROM projects p
          WHERE p.owner_id = u.id AND p.visibility = 'PUBLIC')::int             AS circuits,
       (SELECT COUNT(*) FROM projects f JOIN projects p ON f.forked_from_id = p.id
          WHERE p.owner_id = u.id AND f.owner_id <> u.id)::int                  AS forks,
       (SELECT COUNT(*) FROM discussion_posts d WHERE d.author_id = u.id)::int  AS answers
     FROM "User" u
     WHERE lower(u.username) = lower($1)`,
    [username],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    bio: row.bio,
    createdAt: row.created_at.toISOString(),
    stats: {
      solved: row.solved,
      puzzles: row.puzzles,
      circuits: row.circuits,
      forks: row.forks,
      answers: row.answers,
    },
  };
}

/* --------------------------------------------------------- profile tabs */

export interface SolvedProblem {
  slug: string;
  title: string;
  difficulty: PuzzleDifficulty;
  solvedAt: string;
}

/**
 * Problems this person has an accepted submission for, newest solve first.
 *
 * MIN over the accepted timestamps, so the date is when they *first* got it
 * out rather than the last time they happened to resubmit.
 */
export async function listSolvedProblems(userId: string, limit = 30): Promise<SolvedProblem[]> {
  const rows = await query<{ slug: string; title: string; difficulty: string; solved_at: Date }>(
    `SELECT c.slug, c.title, c.difficulty::text AS difficulty, MIN(s."submittedAt") AS solved_at
       FROM "CodingSubmission" s
       JOIN "CodingProblem" c ON c.id = s."problemId"
      WHERE s."userId" = $1 AND s.verdict = 'ACCEPTED'
      GROUP BY c.id, c.slug, c.title, c.difficulty
      ORDER BY solved_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    // The column is the Prisma enum (MEDIUM); everything that renders a
    // difficulty on this site speaks the lowercase form.
    difficulty: difficultyFromPrisma(row.difficulty as PrismaDifficulty),
    solvedAt: row.solved_at.toISOString(),
  }));
}

export interface PersonPost {
  body: string;
  /** The thread's heading: its own title, or the content it hangs off. */
  heading: string;
  href: string;
  score: number;
  createdAt: string;
}

/** This person's discussion posts, best first, for the Discussions tab. */
export async function listPersonPosts(userId: string, limit = 20): Promise<PersonPost[]> {
  const rows = await query<{
    body: string;
    title: string | null;
    parent_title: string | null;
    kind: string;
    target_slug: string;
    score: number;
    created_at: Date;
  }>(
    `SELECT d.body, d.title, p.title AS parent_title,
            d."targetKind"::text AS kind, d.target_slug, d.created_at,
            (SELECT COUNT(*) FROM discussion_votes v WHERE v.post_id = d.id)::int AS score
       FROM discussion_posts d
       LEFT JOIN discussion_posts p ON p.id = d.parent_id
      WHERE d.author_id = $1
      ORDER BY score DESC, d.created_at DESC
      LIMIT $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    body: row.body,
    // A reply borrows its parent's title; an attached thread has none, so the
    // slug is de-slugged into something readable rather than shown raw.
    heading:
      row.title ?? row.parent_title ?? row.target_slug.replace(/-/g, " "),
    href: `/discuss/${row.kind.toLowerCase()}/${row.target_slug}`,
    score: row.score,
    createdAt: row.created_at.toISOString(),
  }));
}

/**
 * Forks per circuit, keyed by slug, for the Circuits tab.
 *
 * One query for the whole tab rather than a count beside each card, which
 * would be N round trips for a grid that is usually a dozen tiles.
 */
export async function getForkCounts(ownerUsername: string): Promise<Map<string, number>> {
  const rows = await query<{ slug: string; forks: number }>(
    `SELECT p.slug, COUNT(f.id)::int AS forks
       FROM projects p
       JOIN "User" u ON u.id = p.owner_id
       LEFT JOIN projects f ON f.forked_from_id = p.id AND f.owner_id <> p.owner_id
      WHERE lower(u.username) = lower($1) AND p.visibility = 'PUBLIC'
      GROUP BY p.slug`,
    [ownerUsername],
  );
  return new Map(rows.map((row) => [row.slug, row.forks]));
}

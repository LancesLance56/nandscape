/**
 * Seed the community: the people, and the activity their profiles report.
 *
 * Run with `pnpm community:seed` against a migrated database.
 *
 * Two rules shape this script.
 *
 * It is **idempotent**: everything it writes is keyed on a persona's username
 * or on a deterministic slug, and every insert either upserts or is preceded by
 * a delete of exactly the rows this script owns. Running it twice leaves the
 * same database, and it never touches a row a real person created.
 *
 * It **reads the content that is actually there**. Solved problems, finished
 * lessons and published circuits are attached to whatever the database happens
 * to hold, so this works on a fully seeded instance and on a half-empty one
 * without a list of slugs here going stale.
 *
 * Discussion threads are *not* here. They are content, so they live in
 * `seed/discussions/*.json` and go in through the API like every other
 * resource - this script only has to exist first, so the handles those files
 * name resolve to real accounts.
 *
 * The personas have no password hash and cannot sign in. That is deliberate:
 * they exist to make the surfaces look inhabited, and an account nobody can
 * authenticate as is one that cannot be taken over.
 */

import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

/* ------------------------------------------------------------ environment */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");

// Next loads the root .env for us; a bare script does not, and the failure is
// otherwise a confusing SASL error rather than "no connection string".
// Same shape as scripts/migrate-diagrams.mts.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(ROOT, file));
  } catch {
    // Absent, which is fine as long as one of them supplies DATABASE_URL.
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set and no .env file carried one");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/** Midnight-anchored offsets, so a "streak" is a run of distinct dates. */
function daysAgo(days: number, hour = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/* -------------------------------------------------------------- personas */

interface Persona {
  username: string;
  bio: string;
  /** Days back on which this person did something. Drives streaks and ranking. */
  activeDays: number[];
}

/**
 * Seven accounts, with the lopsided activity real communities have: one clear
 * regular, a few steady contributors, and somebody who turned up last week.
 * Two have a run ending today, because a leaderboard where nobody holds a live
 * streak reads as broken.
 *
 * Handles only. There is no display-name field anywhere in the community
 * surfaces, so a persona is identified the same way a real account is.
 */
const PEOPLE: Persona[] = [
  {
    username: "off_by_one",
    bio: "Mostly algorithms and the loop bounds that ruin them. I write up the ones that took me three attempts.",
    activeDays: [0, 1, 2, 3, 4, 5, 6, 7, 9, 12, 15, 18, 22, 27, 33, 40],
  },
  {
    username: "midnight_compiler",
    bio: "Systems and compilers. Interested in the gap between what the standard promises and what the machine does.",
    activeDays: [0, 1, 2, 3, 6, 8, 11, 14, 19, 24, 30, 38],
  },
  {
    username: "nandhole",
    bio: "Gate golf. If there is a version of your circuit with one fewer NAND in it I would like to see it.",
    activeDays: [1, 2, 4, 5, 9, 13, 17, 21, 26, 34, 44],
  },
  {
    username: "heap_of_trouble",
    bio: "Data structures, and being annoying about which one you actually needed.",
    activeDays: [0, 2, 3, 7, 10, 16, 23, 29, 37, 48],
  },
  {
    username: "segfaulter",
    bio: "C++ and the parts of it that are load-bearing. Ask me about undefined behaviour, I have time.",
    activeDays: [1, 3, 8, 12, 20, 28, 41],
  },
  {
    username: "tail_recursive",
    bio: "Functional programming refugee. Still trying to write everything as a fold.",
    activeDays: [0, 4, 6, 11, 18, 25, 36],
  },
  {
    username: "carry_the_one",
    bio: "Sequential logic, timing closure, and a long-running argument with metastability.",
    activeDays: [2, 5, 7, 14, 21, 31, 45],
  },
];

/* -------------------------------------------------------------- the seeding */

async function upsertPeople(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const person of PEOPLE) {
    // No password hash: these accounts exist to be looked at, not signed into.
    // Email is verified so the profile does not render as a pending signup.
    const rows = await sql<{ id: string }>(
      `INSERT INTO "User" (id, email, username, bio, "emailVerifiedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $5, now())
       ON CONFLICT (username) DO UPDATE
         SET bio = EXCLUDED.bio, name = NULL, "updatedAt" = now()
       RETURNING id`,
      [
        randomUUID(),
        `${person.username}@nandscape.dev`,
        person.username,
        person.bio,
        daysAgo(Math.max(...person.activeDays) + 30),
      ],
    );
    ids.set(person.username, rows[0].id);
  }

  console.log(`  people: ${ids.size}`);
  return ids;
}

/**
 * Accepted submissions, spread over each persona's active days.
 *
 * The counts are staggered so the leaderboard has a shape: the first persona
 * solves the most, the last the fewest. Every row is ACCEPTED, because a
 * rejected submission is not what any of these surfaces count.
 */
async function seedSolves(ids: Map<string, string>): Promise<void> {
  const problems = await sql<{ id: string; slug: string }>(
    `SELECT id, slug FROM "CodingProblem" ORDER BY slug`,
  );
  if (problems.length === 0) {
    console.log("  solves: skipped, no coding problems seeded");
    return;
  }

  // This script owns every submission by a persona, so clearing them first is
  // what makes a re-run idempotent rather than cumulative.
  await sql(`DELETE FROM "CodingSubmission" WHERE "userId" = ANY($1)`, [[...ids.values()]]);

  let count = 0;
  for (const [index, person] of PEOPLE.entries()) {
    const userId = ids.get(person.username)!;
    // The strongest solver gets every problem; each one after gets fewer.
    const take = Math.max(2, problems.length - index * 2);

    for (const [n, problem] of problems.slice(0, take).entries()) {
      const day = person.activeDays[n % person.activeDays.length];
      await sql(
        `INSERT INTO "CodingSubmission"
           (id, "userId", "problemId", language, code, verdict, "passedCount", "totalCount", results, "runtimeMs", "submittedAt")
         VALUES ($1, $2, $3, $4, $5, 'ACCEPTED', $6, $6, '[]'::jsonb, $7, $8)`,
        [
          randomUUID(),
          userId,
          problem.id,
          ["python", "javascript", "cpp"][n % 3],
          "// accepted solution\n",
          8,
          12 + ((n * 7) % 90),
          daysAgo(day, 9 + (n % 8)),
        ],
      );
      count += 1;
    }
  }
  console.log(`  accepted submissions: ${count}`);
}

async function seedPuzzles(ids: Map<string, string>): Promise<void> {
  const puzzles = await sql<{ slug: string }>(`SELECT slug FROM "Puzzle" ORDER BY slug LIMIT 24`);
  if (puzzles.length === 0) {
    console.log("  puzzles: skipped, none seeded");
    return;
  }

  await sql(`DELETE FROM puzzle_progress WHERE "userId" = ANY($1)`, [[...ids.values()]]);

  let count = 0;
  for (const [index, person] of PEOPLE.entries()) {
    const userId = ids.get(person.username)!;
    const take = Math.max(2, puzzles.length - index * 3);

    for (const [n, puzzle] of puzzles.slice(0, take).entries()) {
      const day = person.activeDays[n % person.activeDays.length];
      await sql(
        `INSERT INTO puzzle_progress (id, "userId", puzzle_slug, solved, solved_at, nodes, edges, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, true, $3, '[]'::jsonb, '[]'::jsonb, $3, $3)
         ON CONFLICT ("userId", puzzle_slug) DO NOTHING`,
        [userId, puzzle.slug, daysAgo(day, 8 + (n % 11))],
      );
      count += 1;
    }
  }
  console.log(`  solved puzzles: ${count}`);
}

async function seedLessons(ids: Map<string, string>): Promise<void> {
  const pages = await sql<{ slug: string; track_slug: string | null }>(
    `SELECT p.slug, t.slug AS track_slug
       FROM tutorial_pages p
       LEFT JOIN tutorial_sections s ON s.id = p.section_id
       LEFT JOIN tutorial_tracks t ON t.id = s.track_id
      WHERE p.status = 'published'
      ORDER BY p.slug LIMIT 30`,
  );
  if (pages.length === 0) {
    console.log("  lessons: skipped, none published");
    return;
  }

  await sql(`DELETE FROM tutorial_progress WHERE "userId" = ANY($1)`, [[...ids.values()]]);

  let count = 0;
  for (const [index, person] of PEOPLE.entries()) {
    const userId = ids.get(person.username)!;
    const take = Math.max(3, pages.length - index * 4);

    for (const [n, page] of pages.slice(0, take).entries()) {
      const day = person.activeDays[n % person.activeDays.length];
      await sql(
        `INSERT INTO tutorial_progress (id, "userId", page_slug, track_slug, completed_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("userId", page_slug) DO NOTHING`,
        // The hour ranges across the event types overlap on purpose. Give one
        // type the latest hour of every day and it wins every tie in the
        // activity feed, which then reads as a wall of the same verb.
        [randomUUID(), userId, page.slug, page.track_slug, daysAgo(day, 6 + (n % 13))],
      );
      count += 1;
    }
  }
  console.log(`  finished lessons: ${count}`);
}

interface CircuitSpec {
  slug: string;
  name: string;
  description?: string | null;
  nodes?: unknown;
  edges?: unknown;
}

/** How many circuits each persona publishes, in PEOPLE order. */
const CIRCUITS_PER_PERSON = [4, 3, 3, 2, 2, 2];

/**
 * Public circuits for the personas, with fork lineage between them.
 *
 * The netlists come from `seed/projects/*.json` rather than from whatever
 * happens to be in the projects table, because those files carry real names
 * and descriptions - "8-bit Ripple-Carry Adder", not "Untitled circuit" - and
 * a gallery full of untitled boxes is exactly what this is meant to avoid.
 *
 * Forks point at *another persona's* circuit, never at the original seed row.
 * That is what gives the Most-forked board and a profile's fork count
 * something true to show: a fork of the site's own starter content tells you
 * nothing about who people are actually building on.
 */
async function seedCircuits(ids: Map<string, string>): Promise<void> {
  const dir = path.join(ROOT, "seed", "projects");
  let specs: CircuitSpec[] = [];
  try {
    specs = readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => JSON.parse(readFileSync(path.join(dir, file), "utf8")) as CircuitSpec)
      .filter((spec) => spec.slug && spec.name);
  } catch {
    console.log("  circuits: skipped, seed/projects is unreadable");
    return;
  }
  if (specs.length === 0) {
    console.log("  circuits: skipped, no circuit files found");
    return;
  }

  await sql(`DELETE FROM projects WHERE owner_id = ANY($1)`, [[...ids.values()]]);

  // Per persona, the rows they own, so the fork pass can point at a real one.
  const ownedByPerson = new Map<string, { id: string; spec: CircuitSpec }[]>();
  let cursor = 0;
  let originals = 0;

  for (const [index, person] of PEOPLE.entries()) {
    const userId = ids.get(person.username)!;
    const mine: { id: string; spec: CircuitSpec }[] = [];

    for (let n = 0; n < (CIRCUITS_PER_PERSON[index] ?? 2); n += 1) {
      const spec = specs[cursor % specs.length];
      cursor += 1;

      const id = randomUUID();
      const slug = `${person.username}-${spec.slug}`;
      const day = person.activeDays[n % person.activeDays.length];

      await sql(
        `INSERT INTO projects
           (id, slug, name, description, nodes, edges, scopes, blocks, tags, visibility, owner_id, forked_from_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, '[]'::jsonb, '[]'::jsonb, $7, 'PUBLIC', $8, NULL, $9, $9)
         ON CONFLICT (slug) DO NOTHING`,
        [
          id,
          slug,
          spec.name,
          spec.description ?? null,
          JSON.stringify(spec.nodes ?? []),
          JSON.stringify(spec.edges ?? []),
          ["community"],
          userId,
          daysAgo(day, 11 + (n % 5)),
        ],
      );

      mine.push({ id, spec });
      originals += 1;
    }

    ownedByPerson.set(person.username, mine);
  }

  // The fork pass. Each persona forks one circuit from the person before them
  // in the list, which produces a lineage nobody had to hand-maintain and
  // leaves the earlier, more prolific accounts as the most-forked ones.
  let forks = 0;
  for (const [index, person] of PEOPLE.entries()) {
    const sourcePerson = PEOPLE[(index + 1) % PEOPLE.length];
    const candidates = ownedByPerson.get(sourcePerson.username) ?? [];
    const userId = ids.get(person.username)!;

    for (const source of candidates.slice(0, index === 0 ? 2 : 1)) {
      const slug = `${person.username}-fork-${source.spec.slug}`;
      // Spread across the person's active days rather than all landing on the
      // most recent one, which would put every fork at the top of the feed.
      const day = person.activeDays[(index + 2) % person.activeDays.length];

      await sql(
        `INSERT INTO projects
           (id, slug, name, description, nodes, edges, scopes, blocks, tags, visibility, owner_id, forked_from_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, '[]'::jsonb, '[]'::jsonb, $7, 'PUBLIC', $8, $9, $10, $10)
         ON CONFLICT (slug) DO NOTHING`,
        [
          randomUUID(),
          slug,
          source.spec.name,
          source.spec.description ?? null,
          JSON.stringify(source.spec.nodes ?? []),
          JSON.stringify(source.spec.edges ?? []),
          ["community", "fork"],
          userId,
          source.id,
          daysAgo(day, 9 + (index % 9)),
        ],
      );
      forks += 1;
    }
  }

  console.log(`  public circuits: ${originals} originals, ${forks} forks of each other`);
}

async function main(): Promise<void> {
  console.log("Seeding community...");
  const ids = await upsertPeople();
  await seedSolves(ids);
  await seedPuzzles(ids);
  await seedLessons(ids);
  await seedCircuits(ids);
  console.log("Done.");
  console.log("");
  console.log("Discussions live in seed/discussions and are posted by the main");
  console.log("seed script, which needs these accounts to exist first:");
  console.log("  node seed/seed.mjs --base http://localhost:3000 --force");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

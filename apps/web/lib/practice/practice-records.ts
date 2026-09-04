import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";
import { difficultyFromPrisma, difficultyToPrisma } from "@/types/puzzle";
import type {
  CompareMode,
  PracticeDifficulty,
  PracticeLanguage,
  PracticeSignature,
  PracticeSpec,
  PracticeTestCase,
  PrismaDifficulty,
  VisibleTestCase,
} from "@/types/practice";
import { SUPPORTED_LANGUAGES } from "./languages";
import { checkProblem, firstError } from "./validate";

/**
 * Database access for coding problems, following puzzle-records.ts: the raw
 * `pg` path rather than Prisma, hand-written SQL, and a `to*` mapper that is
 * the only place a row becomes a domain object.
 *
 * The one structural rule here is that hidden test cases and reference
 * solutions are never selected by anything that feeds a response. There are
 * two column lists below, and the public one simply does not name those
 * columns, so leaking them takes more than forgetting to strip a field - it
 * takes writing a different query.
 */

/** Safe to serialize to a browser. Note what is absent. */
const PUBLIC_COLUMNS = `
  id, slug, title, summary, difficulty, tags, statement, kind, signature,
  languages, "starterCode", "visibleTests",
  jsonb_array_length("hiddenTests") AS hidden_count,
  "compareMode", "timeLimitMs", "memoryLimitMb", "createdAt", "updatedAt"
`;

/** Server-only. Used for grading and by the authoring round trip. */
const GRADING_COLUMNS = `
  id, slug, title, summary, difficulty, tags, statement, kind, signature,
  languages, "starterCode", "visibleTests", "hiddenTests",
  "compareMode", epsilon, "timeLimitMs", "memoryLimitMb", solutions,
  "createdAt", "updatedAt"
`;

/**
 * Columns both queries share. Kept free of an index signature so `Omit` below
 * behaves - an index signature would swallow the named properties and every
 * field would widen back to `unknown`.
 */
interface CommonRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  difficulty: PrismaDifficulty;
  tags: string[];
  statement: string;
  kind: string;
  signature: PracticeSignature;
  languages: string[];
  starterCode: Record<string, string>;
  visibleTests: PracticeTestCase[];
  compareMode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  createdAt: string;
  updatedAt: string;
}

interface PublicRow extends CommonRow {
  hidden_count: number;
  [key: string]: unknown;
}

interface GradingRow extends CommonRow {
  hiddenTests: PracticeTestCase[];
  epsilon: number;
  solutions: Record<string, string>;
  [key: string]: unknown;
}

/** Everything grading needs, and nothing the browser is allowed to see. */
export interface GradingSpec {
  id: string;
  slug: string;
  signature: PracticeSignature;
  languages: PracticeLanguage[];
  visibleTests: PracticeTestCase[];
  hiddenTests: PracticeTestCase[];
  compareMode: CompareMode;
  epsilon: number;
  timeLimitMs: number;
  memoryLimitMb: number;
}

function toSpec(row: PublicRow): PracticeSpec {
  // A language is offered only if it is both listed *and* has a stub. Listing
  // one without starter code would drop a user into an empty editor with no
  // function name to match, which fails in a way that looks like their fault.
  const languages = (row.languages ?? []).filter(
    (id): id is PracticeLanguage =>
      SUPPORTED_LANGUAGES.includes(id as PracticeLanguage) &&
      typeof row.starterCode?.[id] === "string",
  );

  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? "",
    difficulty: difficultyFromPrisma(row.difficulty),
    tags: row.tags ?? [],
    statement: row.statement ?? "",
    kind: "function",
    signature: row.signature,
    languages,
    starterCode: Object.fromEntries(
      languages.map((id) => [id, row.starterCode[id]]),
    ) as PracticeSpec["starterCode"],
    visibleTests: (row.visibleTests ?? []).map(
      (testCase, index): VisibleTestCase => ({ ...testCase, index }),
    ),
    hiddenTestCount: Number(row.hidden_count ?? 0),
    compareMode: (row.compareMode ?? "exact") as CompareMode,
    timeLimitMs: row.timeLimitMs,
    memoryLimitMb: row.memoryLimitMb,
  };
}

export async function listPracticeRecords(): Promise<PracticeSpec[]> {
  const rows = await query<PublicRow>(
    `SELECT ${PUBLIC_COLUMNS} FROM "CodingProblem" ORDER BY difficulty ASC, "createdAt" ASC`,
  );
  return rows.map(toSpec);
}

export async function getPracticeBySlug(slug: string): Promise<PracticeSpec | null> {
  const rows = await query<PublicRow>(
    `SELECT ${PUBLIC_COLUMNS} FROM "CodingProblem" WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return rows[0] ? toSpec(rows[0]) : null;
}

/**
 * The server-side view, including hidden cases. Every caller of this is a
 * route handler that grades - nothing it returns may be echoed back verbatim.
 */
export async function getGradingSpec(slug: string): Promise<GradingSpec | null> {
  const rows = await query<GradingRow>(
    `SELECT ${GRADING_COLUMNS} FROM "CodingProblem" WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    signature: row.signature,
    languages: (row.languages ?? []).filter((id): id is PracticeLanguage =>
      SUPPORTED_LANGUAGES.includes(id as PracticeLanguage),
    ),
    visibleTests: row.visibleTests ?? [],
    hiddenTests: row.hiddenTests ?? [],
    compareMode: (row.compareMode ?? "exact") as CompareMode,
    epsilon: row.epsilon ?? 1e-6,
    timeLimitMs: row.timeLimitMs,
    memoryLimitMb: row.memoryLimitMb,
  };
}

/**
 * Everything an author needs to edit a problem, secret halves included.
 *
 * Distinct from `getGradingSpec` (which carries only what grading reads) and
 * from `getPracticeBySlug` (which deliberately omits the secret halves). The
 * one caller is the admin editor, behind an ADMIN check - this is the only
 * function in the module that hands back `hiddenTests` and `solutions`
 * together with the display fields, so it is worth being explicit that it must
 * never be wired to a public route.
 */
export interface AuthoringRecord extends PracticeSeedInput {
  createdAt: string;
  updatedAt: string;
}

export async function getAuthoringRecord(slug: string): Promise<AuthoringRecord | null> {
  const rows = await query<GradingRow>(
    `SELECT ${GRADING_COLUMNS} FROM "CodingProblem" WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? "",
    difficulty: difficultyFromPrisma(row.difficulty),
    tags: row.tags ?? [],
    statement: row.statement ?? "",
    signature: row.signature,
    languages: (row.languages ?? []) as PracticeLanguage[],
    starterCode: row.starterCode ?? {},
    visibleTests: row.visibleTests ?? [],
    hiddenTests: row.hiddenTests ?? [],
    compareMode: (row.compareMode ?? "exact") as CompareMode,
    epsilon: row.epsilon ?? 1e-6,
    timeLimitMs: row.timeLimitMs,
    memoryLimitMb: row.memoryLimitMb,
    solutions: row.solutions ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface PracticeSeedInput {
  slug: string;
  title: string;
  summary?: string;
  difficulty: PracticeDifficulty;
  tags?: string[];
  statement?: string;
  signature: PracticeSignature;
  languages: PracticeLanguage[];
  starterCode: Record<string, string>;
  visibleTests: PracticeTestCase[];
  hiddenTests?: PracticeTestCase[];
  compareMode?: CompareMode;
  epsilon?: number;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  solutions?: Record<string, string>;
}

/**
 * Reject a problem that breaks any of the authoring rules.
 *
 * The rules themselves live in ./validate so the admin editor can show the
 * same list live while someone types. Authoring happens through seed JSON with
 * no schema of its own, so without this an arity mismatch would surface as
 * every submission failing with a confusing TypeError from inside the driver -
 * a bug that looks like the learner's and is nearly impossible for them to
 * diagnose. Cheaper to refuse the write.
 */
function validate(input: PracticeSeedInput): string | null {
  return firstError(checkProblem(input));
}

export class PracticeValidationError extends Error {}

function bindings(input: PracticeSeedInput, id: string | null): unknown[] {
  const values = [
    input.slug,
    input.title,
    input.summary ?? null,
    difficultyToPrisma(input.difficulty),
    input.tags ?? [],
    input.statement ?? "",
    JSON.stringify(input.signature),
    input.languages,
    JSON.stringify(input.starterCode),
    JSON.stringify(input.visibleTests),
    JSON.stringify(input.hiddenTests ?? []),
    input.compareMode ?? "exact",
    input.epsilon ?? 1e-6,
    input.timeLimitMs ?? 2000,
    input.memoryLimitMb ?? 256,
    JSON.stringify(input.solutions ?? {}),
  ];
  return id === null ? values : [id, ...values];
}

export async function createPracticeRecord(input: PracticeSeedInput): Promise<PracticeSpec> {
  const problem = validate(input);
  if (problem) throw new PracticeValidationError(problem);

  // Seeded problems have no human author, exactly as with Puzzle - creatorId
  // is nullable for that case (onDelete: SetNull on CodingProblem.creator).
  const rows = await query<PublicRow>(
    `INSERT INTO "CodingProblem" (
       id, slug, title, summary, difficulty, tags, statement, signature, languages,
       "starterCode", "visibleTests", "hiddenTests", "compareMode", epsilon,
       "timeLimitMs", "memoryLimitMb", solutions, "creatorId", "createdAt", "updatedAt"
     )
     VALUES ($1, $2, $3, $4, $5::"Difficulty", $6::text[], $7, $8::jsonb, $9::text[],
             $10::jsonb, $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17::jsonb, NULL, now(), now())
     RETURNING ${PUBLIC_COLUMNS}`,
    bindings(input, randomUUID()),
  );
  return toSpec(rows[0]);
}

export async function updatePracticeRecord(
  slug: string,
  input: PracticeSeedInput,
): Promise<PracticeSpec | null> {
  const problem = validate(input);
  if (problem) throw new PracticeValidationError(problem);

  const rows = await query<PublicRow>(
    `UPDATE "CodingProblem" SET
       title = $2, summary = $3, difficulty = $4::"Difficulty", tags = $5::text[],
       statement = $6, signature = $7::jsonb, languages = $8::text[],
       "starterCode" = $9::jsonb, "visibleTests" = $10::jsonb, "hiddenTests" = $11::jsonb,
       "compareMode" = $12, epsilon = $13, "timeLimitMs" = $14, "memoryLimitMb" = $15,
       solutions = $16::jsonb, "updatedAt" = now()
     WHERE slug = $1
     RETURNING ${PUBLIC_COLUMNS}`,
    bindings({ ...input, slug }, null),
  );
  return rows[0] ? toSpec(rows[0]) : null;
}

/**
 * Slugs this user has an accepted submission for.
 *
 * Derived rather than denormalized: a `solved` flag on a progress row is one
 * more thing that can drift out of step with the submissions it summarises,
 * and this aggregate is trivial at the scale of one person's practice history.
 */
export async function listSolvedSlugs(userId: string): Promise<string[]> {
  const rows = await query<{ slug: string }>(
    `SELECT DISTINCT p.slug
       FROM "CodingSubmission" s
       JOIN "CodingProblem" p ON p.id = s."problemId"
      WHERE s."userId" = $1 AND s.verdict = 'ACCEPTED'`,
    [userId],
  );
  return rows.map((row) => row.slug);
}

/** Slugs the user has submitted to but never had accepted. */
export async function listAttemptedSlugs(userId: string): Promise<string[]> {
  const rows = await query<{ slug: string }>(
    `SELECT DISTINCT p.slug
       FROM "CodingSubmission" s
       JOIN "CodingProblem" p ON p.id = s."problemId"
      WHERE s."userId" = $1
        AND p.slug NOT IN (
          SELECT p2.slug FROM "CodingSubmission" s2
            JOIN "CodingProblem" p2 ON p2.id = s2."problemId"
           WHERE s2."userId" = $1 AND s2.verdict = 'ACCEPTED'
        )`,
    [userId],
  );
  return rows.map((row) => row.slug);
}

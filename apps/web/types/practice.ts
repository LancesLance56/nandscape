import type { PuzzleDifficulty } from "@/types/puzzle";

/** Reused wholesale so a difficulty badge means the same thing everywhere. */
export type PracticeDifficulty = PuzzleDifficulty;

/**
 * The languages a problem can be attempted in.
 *
 * Chosen from what this site already teaches rather than from what a judge
 * usually offers: the seeded tutorials contain 57 JavaScript, 47 Python and 32
 * C++ code blocks, and lib/shiki.ts highlights exactly those. `cpp` is declared
 * here and deliberately has no LanguageDefinition yet - see languages.ts for
 * what adding it costs.
 */
export type PracticeLanguage = "python" | "javascript" | "cpp";

/**
 * The type vocabulary a signature is written in.
 *
 * Python and JavaScript drivers never read these - both parse JSON straight
 * into native values - so they exist purely for a statically typed driver that
 * has to emit a typed `main()`. That is the whole reason they are specified
 * now, while there is no C++ support to constrain: getting the vocabulary into
 * the schema before any content is authored means adding C++ later is a new
 * file, not a migration plus a rewrite of every seeded problem.
 *
 * Deliberately small. It covers every argument shape in the DS&A material
 * under apps/web/lib/, and each entry has an obvious C++ spelling:
 *
 *   int        -> long long          int[]      -> vector<long long>
 *   float      -> double             float[]    -> vector<double>
 *   bool       -> bool               bool[]     -> vector<bool>
 *   string     -> std::string        string[]   -> vector<string>
 *   int[][]    -> vector<vector<long long>>
 */
export type ValueType =
  | "int"
  | "float"
  | "bool"
  | "string"
  | "int[]"
  | "float[]"
  | "bool[]"
  | "string[]"
  | "int[][]"
  | "string[][]"
  | "void";

export interface SignatureParam {
  name: string;
  type: ValueType;
}

/**
 * What the user implements. `name` is the canonical (snake_case) identifier;
 * each LanguageDefinition renames it to that language's convention, so a
 * Python author writes `two_sum` and a JavaScript author writes `twoSum`
 * without the problem needing to state both.
 */
export interface PracticeSignature {
  name: string;
  params: SignatureParam[];
  returns: ValueType;
}

/**
 * How a returned value is judged.
 *
 * `unordered` exists because plenty of good problems ("return all pairs
 * summing to k") have no canonical ordering, and forcing one turns a correct
 * solution into a failing one for reasons that teach nothing.
 */
export type CompareMode = "exact" | "unordered" | "float";

export interface PracticeTestCase {
  /** Positional arguments, matching `signature.params` in order. */
  args: unknown[];
  expected: unknown;
  /** Shown under a visible case in the statement. Ignored for hidden cases. */
  explanation?: string;
}

/** A visible case, safe to send to the browser. */
export interface VisibleTestCase extends PracticeTestCase {
  index: number;
}

/**
 * The client-facing view of a problem. Hidden tests and reference solutions
 * are structurally absent rather than nulled out, so there is no shape in
 * which a serialization mistake could include them.
 */
export interface PracticeSpec {
  slug: string;
  title: string;
  summary: string;
  difficulty: PracticeDifficulty;
  tags: string[];
  /** Markdown. Rendered by components/practices/statement-markdown.tsx. */
  statement: string;
  kind: "function";
  signature: PracticeSignature;
  languages: PracticeLanguage[];
  starterCode: Partial<Record<PracticeLanguage, string>>;
  visibleTests: VisibleTestCase[];
  /** Count only. The cases themselves never leave the server. */
  hiddenTestCount: number;
  compareMode: CompareMode;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export type Verdict =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILE_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR";

/**
 * True when the code ran to completion and merely returned the wrong thing.
 * The UI branches on this: a wrong answer wants the expected/actual diff, and
 * everything else wants the error text, because the user's next move differs.
 */
export function isAnswerVerdict(verdict: Verdict): boolean {
  return verdict === "ACCEPTED" || verdict === "WRONG_ANSWER";
}

export interface TestCaseResult {
  index: number;
  /** False for hidden cases, which carry no args/expected/actual. */
  visible: boolean;
  status: "passed" | "failed" | "errored" | "timed-out" | "skipped";
  args?: unknown[];
  expected?: unknown;
  actual?: unknown;
  /** Whatever the user printed before returning. Truncated server-side. */
  stdout?: string;
  stderr?: string;
  runtimeMs?: number;
}

export interface ExecutionResult {
  verdict: Verdict;
  passedCount: number;
  totalCount: number;
  cases: TestCaseResult[];
  /**
   * One aggregated failure that is not about any single test case - a compile
   * error, or the engine being unreachable. Distinct from a per-case error so
   * the UI never has to guess whether to show a banner or a case list.
   */
  error?: {
    kind: Verdict;
    message: string;
  };
  /** Slowest single case. Null when nothing ran. */
  runtimeMs: number | null;
}

export type PrismaDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

import type {
  CompareMode,
  ExecutionResult,
  PracticeSignature,
  PracticeTestCase,
  TestCaseResult,
  Verdict,
} from "@/types/practice";
import { valuesMatch } from "./compare";
import { getLanguage } from "./languages";
import { buildLimits, MAX_CODE_BYTES, MAX_TEST_CASES } from "./limits";
import { parseDriverOutput, type DriverCaseRecord } from "./harnesses/protocol";
import { executeOnPiston, PistonUnavailableError } from "./piston";

export interface GradeableCase extends PracticeTestCase {
  /** Whether this case's inputs and outputs may be shown to the user. */
  visible: boolean;
}

export interface ExecuteOptions {
  language: string;
  code: string;
  signature: PracticeSignature;
  cases: GradeableCase[];
  compareMode: CompareMode;
  epsilon?: number;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

/**
 * Compile (where applicable), run every test case in one engine call, and
 * grade the results.
 *
 * All cases go out in a single batch. That is worth the small amount of
 * attribution work below - a process killed mid-batch has to have its failure
 * assigned to the right case - because the alternative is N engine round trips
 * per press of Run, each paying interpreter startup again. One batch keeps
 * feedback fast enough to iterate against, which is the entire point of having
 * a Run button separate from Submit.
 */
export async function executeSubmission(options: ExecuteOptions): Promise<ExecutionResult> {
  const language = getLanguage(options.language);
  if (!language) {
    return fatal("INTERNAL_ERROR", `Unsupported language: ${options.language}`, options.cases);
  }

  if (Buffer.byteLength(options.code, "utf8") > MAX_CODE_BYTES) {
    return fatal(
      "COMPILE_ERROR",
      `Your solution is larger than the ${Math.floor(MAX_CODE_BYTES / 1024)} KB limit.`,
      options.cases,
    );
  }

  const cases = options.cases.slice(0, MAX_TEST_CASES);
  if (cases.length === 0) {
    return { verdict: "ACCEPTED", passedCount: 0, totalCount: 0, cases: [], runtimeMs: null };
  }

  const limits = buildLimits(options, cases.length);

  let source: string;
  try {
    source = language.buildProgram(options.code, options.signature);
  } catch (error) {
    // Only reachable from a malformed problem signature, never from user code.
    return fatal(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Could not build the test harness.",
      cases,
    );
  }

  const stdin = JSON.stringify({ cases: cases.map((testCase) => ({ args: testCase.args })) });

  let response;
  try {
    response = await executeOnPiston({
      runtime: language.runtime,
      version: language.version,
      fileName: language.fileName,
      source,
      stdin,
      limits,
      compiled: language.compiled,
    });
  } catch (error) {
    if (error instanceof PistonUnavailableError) {
      return fatal("INTERNAL_ERROR", error.message, cases);
    }
    throw error;
  }

  if (response.compile && response.compile.code !== 0) {
    return fatal(
      "COMPILE_ERROR",
      response.compile.stderr || response.compile.stdout || "Compilation failed.",
      cases,
    );
  }

  const parsed = parseDriverOutput(response.run.stdout);

  // A fatal driver record means the program loaded but the harness could not
  // proceed - almost always a renamed or deleted function.
  if (parsed.fatal) {
    return fatal("RUNTIME_ERROR", parsed.fatal, cases);
  }

  // No results at all, and the process failed. Two very different things look
  // identical here, and only one of them is really "nothing ran":
  //
  //   - a syntax error or a module-level exception, where the program never
  //     got as far as defining the function. There is no test case to blame,
  //     so this is an aggregated failure.
  //   - the very first case hanging or exhausting memory, which produces no
  //     result line for the same reason but *is* attributable - the culprit is
  //     case 1, and telling the reader their program "exited before any test
  //     case ran" would send them looking for a startup bug that isn't there.
  //
  // Only the first is fatal; the second falls through to gradeCases, whose
  // first-missing-record rule already names the right case.
  if (parsed.cases.length === 0) {
    const failure = classifyProcessFailure(
      response.run.signal,
      response.run.stderr,
      response.run.code,
    );
    if (failure === "COMPILE_ERROR" || failure === "RUNTIME_ERROR") {
      return fatal(
        failure,
        response.run.stderr || "Your program exited before any test case ran.",
        cases,
      );
    }
  }

  return gradeCases(cases, parsed.cases, response.run, options);
}

function gradeCases(
  cases: GradeableCase[],
  records: DriverCaseRecord[],
  run: { stderr: string; signal: string | null; code: number | null },
  options: ExecuteOptions,
): ExecutionResult {
  const byIndex = new Map<number, DriverCaseRecord>();
  for (const record of records) byIndex.set(record.i, record);

  // The first case with no result is where the process died, and every case
  // after it never got a chance to run. Distinguishing "failed here" from
  // "never attempted" matters: a user whose case 3 hangs should not also be
  // told cases 4 and 5 are wrong.
  const firstMissing = cases.findIndex((_, index) => !byIndex.has(index));
  const deathVerdict =
    firstMissing === -1 ? null : classifyProcessFailure(run.signal, run.stderr, run.code);

  const results: TestCaseResult[] = cases.map((testCase, index) => {
    const record = byIndex.get(index);

    if (!record) {
      const isCulprit = index === firstMissing;
      return {
        index,
        visible: testCase.visible,
        status: isCulprit
          ? deathVerdict === "TIME_LIMIT_EXCEEDED"
            ? "timed-out"
            : "errored"
          : "skipped",
        ...(testCase.visible && isCulprit
          ? { args: testCase.args, expected: testCase.expected, stderr: trimStderr(run.stderr) }
          : {}),
      };
    }

    if (record.ok !== true) {
      return {
        index,
        visible: testCase.visible,
        status: "errored",
        runtimeMs: record.ms,
        ...(testCase.visible
          ? {
              args: testCase.args,
              expected: testCase.expected,
              stderr: record.error,
              stdout: record.out,
            }
          : {}),
      };
    }

    const passed = valuesMatch(record.value, testCase.expected, {
      mode: options.compareMode,
      epsilon: options.epsilon,
    });

    return {
      index,
      visible: testCase.visible,
      status: passed ? "passed" : "failed",
      runtimeMs: record.ms,
      // A passing hidden case reveals nothing, and a failing one must not
      // reveal its inputs - that is the whole reason it is hidden.
      ...(testCase.visible
        ? { args: testCase.args, expected: testCase.expected, actual: record.value, stdout: record.out }
        : {}),
    };
  });

  const passedCount = results.filter((result) => result.status === "passed").length;
  const runtimeMs = results.reduce<number | null>((slowest, result) => {
    if (typeof result.runtimeMs !== "number") return slowest;
    return slowest === null ? result.runtimeMs : Math.max(slowest, result.runtimeMs);
  }, null);

  return {
    verdict: overallVerdict(results, deathVerdict),
    passedCount,
    totalCount: results.length,
    cases: results,
    // A process death gets a banner as well as a marked case: the banner is
    // where the results panel puts the "what to try next" hint, and a bare
    // "Timed out" row on one case does not explain what to do about it.
    ...(deathVerdict
      ? {
          error: {
            kind: deathVerdict,
            message: trimStderr(run.stderr) || describeDeath(deathVerdict, cases, firstMissing),
          },
        }
      : {}),
    runtimeMs: runtimeMs === null ? null : Math.round(runtimeMs),
  };
}

/** Plain-language account of a killed process, when it left no stderr behind. */
function describeDeath(verdict: Verdict, cases: GradeableCase[], firstMissing: number): string {
  const label =
    firstMissing < 0
      ? "A test case"
      : `${cases[firstMissing]?.visible ? "Case" : "Hidden case"} ${firstMissing + 1}`;
  const remaining = firstMissing < 0 ? 0 : cases.length - firstMissing - 1;
  const tail =
    remaining > 0
      ? ` The remaining ${remaining} ${remaining === 1 ? "case was" : "cases were"} not run.`
      : "";

  if (verdict === "MEMORY_LIMIT_EXCEEDED") {
    return `${label} used more memory than the limit allows.${tail}`;
  }
  return `${label} did not finish within the time limit.${tail}`;
}

/**
 * Verdict precedence, worst first.
 *
 * A crash outranks a wrong answer because it is a different kind of problem
 * with a different fix, and reporting "wrong answer" for a program that never
 * produced an answer would be actively misleading.
 */
function overallVerdict(results: TestCaseResult[], deathVerdict: Verdict | null): Verdict {
  if (deathVerdict === "TIME_LIMIT_EXCEEDED") return "TIME_LIMIT_EXCEEDED";
  if (deathVerdict === "MEMORY_LIMIT_EXCEEDED") return "MEMORY_LIMIT_EXCEEDED";
  if (results.some((result) => result.status === "timed-out")) return "TIME_LIMIT_EXCEEDED";
  if (results.some((result) => result.status === "errored")) return "RUNTIME_ERROR";
  if (results.some((result) => result.status !== "passed")) return "WRONG_ANSWER";
  return "ACCEPTED";
}

/**
 * Why a process died, from how it was killed and what it printed on the way out.
 *
 * The exit code and the signal turn out to separate the two kill reasons
 * cleanly, which is worth recording because it is not obvious and the
 * distinction matters to the reader. Measured against this engine:
 *
 *   out of memory   code 137, signal null    ("Killed" from the run wrapper)
 *   timed out       code null, signal SIGKILL (the engine's own killer)
 *   threw           code 1,   signal null     (traceback on stderr)
 *   finished        code 0,   signal null
 *
 * 137 is the shell's 128 + SIGKILL, i.e. the cgroup limit killed the child and
 * the wrapper reported it; the engine's own timeout instead kills the job
 * directly and reports the signal. So an allocator message is no longer the
 * only way to tell them apart - it stays as a first check because some
 * runtimes die of memory more politely (Python raises MemoryError, Node prints
 * "heap out of memory" and aborts) and never reach 137 at all.
 */
function classifyProcessFailure(
  signal: string | null,
  stderr: string,
  exitCode: number | null,
): Verdict {
  const haystack = stderr.toLowerCase();
  if (
    haystack.includes("memoryerror") ||
    haystack.includes("bad_alloc") ||
    haystack.includes("cannot allocate") ||
    haystack.includes("out of memory") ||
    haystack.includes("javascript heap out of memory")
  ) {
    return "MEMORY_LIMIT_EXCEEDED";
  }

  // Killed by SIGKILL and reported through the wrapper rather than by the
  // engine: that is the memory ceiling, not the clock.
  if (exitCode === 137) return "MEMORY_LIMIT_EXCEEDED";

  if (signal === "SIGKILL" || signal === "SIGXCPU" || signal === "SIGTERM") {
    return "TIME_LIMIT_EXCEEDED";
  }

  if (
    haystack.includes("syntaxerror") ||
    haystack.includes("indentationerror") ||
    haystack.includes("taberror")
  ) {
    return "COMPILE_ERROR";
  }

  return "RUNTIME_ERROR";
}

/** One aggregated failure, with every case marked as never attempted. */
function fatal(kind: Verdict, message: string, cases: GradeableCase[]): ExecutionResult {
  return {
    verdict: kind,
    passedCount: 0,
    totalCount: cases.length,
    cases: cases.map((testCase, index) => ({
      index,
      visible: testCase.visible,
      status: "skipped" as const,
    })),
    error: { kind, message: trimStderr(message) },
    runtimeMs: null,
  };
}

/**
 * Strip the generated driver's own frames out of a traceback.
 *
 * A user who mistypes an index should see their line, not forty lines of
 * harness internals they did not write and cannot edit.
 */
function trimStderr(stderr: string): string {
  // Two sources of noise, neither of them a line the reader can edit: the
  // generated driver's own frames, and the engine's shell wrapper, which
  // announces a kill as `/piston/packages/python/3.12.0/run: line 3: Killed`.
  // The wrapper message actively misleads - it reads like a crash inside
  // something they imported. What survives is their own code, or nothing, in
  // which case the caller substitutes a plain-language description.
  const lines = stderr
    .split("\n")
    .filter(
      (line) =>
        !line.includes("_ns_") &&
        !line.includes("/piston/") &&
        // The compile wrapper's own epilogue, printed after g++ has already
        // failed. "chmod: cannot access 'a.out'" is a consequence of the real
        // error, never the error, and it lands last where it is most likely to
        // be mistaken for the cause.
        !/^chmod: /.test(line),
    );
  return lines.join("\n").slice(0, 4000).trim();
}

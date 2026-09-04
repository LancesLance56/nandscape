/**
 * Line prefixes the drivers use to separate their output from the user's.
 *
 * These are only a second line of defence: each driver already redirects the
 * user's stdout into a per-case buffer, so in normal operation nothing the
 * user prints reaches the real stdout at all. The prefixes still matter for
 * the cases redirection cannot cover - a subprocess, or a write straight to
 * file descriptor 1 - where an unrecognised line is simply ignored rather
 * than mistaken for a result.
 */
export const RESULT_SENTINEL = "NS-RESULT";

/** A failure that ended the run before any case could be attempted. */
export const FATAL_SENTINEL = "NS-FATAL";

export interface DriverCaseRecord {
  i: number;
  ok?: boolean;
  value?: unknown;
  error?: string;
  ms?: number;
  out?: string;
}

export interface DriverFatalRecord {
  error: string;
}

export interface ParsedDriverOutput {
  cases: DriverCaseRecord[];
  fatal: string | null;
  /** stdout lines that matched no sentinel, kept for debugging odd programs. */
  stray: string;
}

/**
 * Split raw engine stdout into driver records and everything else.
 *
 * Tolerant by design: a partially written final line (the process was killed
 * mid-flush on a timeout) is dropped rather than failing the whole parse, so
 * a timed-out submission still reports every case that did complete.
 */
export function parseDriverOutput(stdout: string): ParsedDriverOutput {
  const cases: DriverCaseRecord[] = [];
  const strayLines: string[] = [];
  let fatal: string | null = null;

  for (const line of stdout.split("\n")) {
    if (line.startsWith(RESULT_SENTINEL)) {
      try {
        cases.push(JSON.parse(line.slice(RESULT_SENTINEL.length)) as DriverCaseRecord);
      } catch {
        // Truncated tail of a killed process. The missing case is reported
        // as timed-out by the caller, which is the accurate description.
      }
      continue;
    }
    if (line.startsWith(FATAL_SENTINEL)) {
      try {
        fatal = (JSON.parse(line.slice(FATAL_SENTINEL.length)) as DriverFatalRecord).error;
      } catch {
        fatal = "The driver failed before any test case ran.";
      }
      continue;
    }
    if (line.length > 0) strayLines.push(line);
  }

  return { cases, fatal, stray: strayLines.join("\n") };
}

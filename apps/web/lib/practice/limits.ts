/**
 * Hard ceilings on anything the execution engine is asked to do.
 *
 * A problem row may tighten these (a tight problem can ask for 500ms), but
 * nothing can loosen them: buildLimits() clamps rather than trusts. That
 * direction matters because problem rows are authored content, and content
 * should not be able to widen a security boundary by fat-fingering a number.
 */

/** Per test case, and the value handed to the engine as its run timeout. */
export const MAX_TIME_LIMIT_MS = 5_000;
export const MIN_TIME_LIMIT_MS = 250;

/**
 * Wall-clock ceiling for an entire batch, however many cases it holds.
 *
 * Coupled to `PISTON_RUN_TIMEOUT` / `PISTON_RUN_CPU_TIME` in
 * docker-compose.yml: because every test case travels in one job, Piston sees
 * a batch as a single "run stage" and rejects the whole request outright if
 * the requested run_timeout exceeds its own configured limit. Raising this
 * without raising those turns every multi-case submission into a 400.
 */
export const MAX_BATCH_WALL_MS = 15_000;

export const MAX_MEMORY_MB = 256;
export const MIN_MEMORY_MB = 32;

/** Compiled languages only, and spent once per submission rather than per case. */
export const COMPILE_TIMEOUT_MS = 10_000;

/** Engine-side output ceilings. The driver also truncates per case. */
export const MAX_STDOUT_BYTES = 64 * 1024;
export const MAX_STDERR_BYTES = 16 * 1024;
/** Per case, applied inside the driver before anything is even printed. */
export const MAX_CASE_STDOUT_CHARS = 4 * 1024;

/** Submitted source. Generous for a single function, absurd for an exfiltration attempt. */
export const MAX_CODE_BYTES = 64 * 1024;

/** Cases per batch. Submit runs visible + hidden, so this bounds both. */
export const MAX_TEST_CASES = 25;

/**
 * Concurrent engine calls across the whole process. The engine runs each job
 * under its own isolate, so the thing being protected here is the host: without
 * a cap, twenty simultaneous submissions become twenty CPU-saturating
 * sandboxes and the site itself stops responding.
 */
export const MAX_CONCURRENT_EXECUTIONS = 4;

/** Requests per user per minute, per route. */
export const RATE_LIMIT_RUN_PER_MIN = 20;
/**
 * An aggregate ceiling across every anonymous caller, on top of the per-key
 * limit above.
 *
 * Two things need it. Per-key limiting is keyed on a hash of the forwarded
 * client address, and if the ingress appends to `x-forwarded-for` rather than
 * overwriting it, a caller can present a new value per request and mint a
 * fresh bucket each time. And even with a trustworthy header, per-key limits
 * bound one visitor, not the crowd: fifty anonymous readers at 20/min each is
 * a thousand executions a minute queueing for MAX_CONCURRENT_EXECUTIONS slots.
 *
 * Deliberately anonymous-only. Signed-in users are keyed by id and never draw
 * on this, so under abuse the practice pages keep working for them and signing
 * in is the way out.
 */
export const RATE_LIMIT_ANON_TOTAL_PER_MIN = 90;
export const RATE_LIMIT_SUBMIT_PER_MIN = 10;

export interface ResolvedLimits {
  perCaseMs: number;
  memoryMb: number;
  /** What the engine is told, covering every case in the batch. */
  batchWallMs: number;
  compileMs: number;
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/**
 * Turn a problem's requested limits plus a case count into what the engine is
 * actually told.
 *
 * The batch budget is per-case time multiplied by the number of cases, plus a
 * fixed allowance for interpreter startup - and then capped again. Since the
 * whole batch runs in one process, a single case that hangs consumes the
 * remaining budget; execute.ts attributes that timeout to the first case that
 * produced no result, which is exactly the hung one.
 */
export function buildLimits(
  requested: { timeLimitMs?: number; memoryLimitMb?: number },
  caseCount: number,
): ResolvedLimits {
  const perCaseMs = clamp(
    requested.timeLimitMs ?? 2000,
    MIN_TIME_LIMIT_MS,
    MAX_TIME_LIMIT_MS,
    2000,
  );
  const memoryMb = clamp(requested.memoryLimitMb ?? 256, MIN_MEMORY_MB, MAX_MEMORY_MB, 256);
  const STARTUP_ALLOWANCE_MS = 1_000;
  const batchWallMs = Math.min(
    MAX_BATCH_WALL_MS,
    perCaseMs * Math.max(1, caseCount) + STARTUP_ALLOWANCE_MS,
  );

  return { perCaseMs, memoryMb, batchWallMs, compileMs: COMPILE_TIMEOUT_MS };
}

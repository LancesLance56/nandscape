import {
  MAX_CONCURRENT_EXECUTIONS,
  MAX_STDERR_BYTES,
  MAX_STDOUT_BYTES,
  type ResolvedLimits,
} from "./limits";

/**
 * HTTP client for the self-hosted Piston execution service.
 *
 * The single most important property of this module is that the engine's
 * address is read from the environment exactly once, at module load, and is
 * never influenced by anything in a request. There is no code path that takes
 * a URL, a host, or a port from a client and reaches the network with it, so
 * the obvious SSRF shape - "make the judge fetch this for me" - has nowhere to
 * attach. Everything else here (timeouts, output caps, the concurrency gate)
 * is about the engine not being turned into a denial-of-service lever.
 */

const RAW_PISTON_URL = process.env.PISTON_URL ?? "http://piston:2000";

/**
 * Parsed at load so a malformed value fails fast and loudly at boot rather
 * than on a user's first submission, and so only the origin is ever reused -
 * a path or query smuggled into the env var is discarded.
 */
const PISTON_ORIGIN = (() => {
  try {
    return new URL(RAW_PISTON_URL).origin;
  } catch {
    throw new Error(
      `PISTON_URL is not a valid URL: ${JSON.stringify(RAW_PISTON_URL)}. ` +
        "Expected something like http://piston:2000.",
    );
  }
})();

const EXECUTE_ENDPOINT = `${PISTON_ORIGIN}/api/v2/execute`;

export interface PistonRunResult {
  stdout: string;
  stderr: string;
  code: number | null;
  /** Set when the process was killed; "SIGKILL" is how a timeout arrives. */
  signal: string | null;
}

export interface PistonResponse {
  run: PistonRunResult;
  compile?: PistonRunResult;
}

export class PistonUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PistonUnavailableError";
  }
}

/**
 * A counting semaphore over engine calls.
 *
 * Per-user rate limiting stops one person hammering the judge; this stops
 * *everyone at once* from doing it. Each sandbox is a real process with a real
 * CPU budget, and the web container shares a host with them, so without a cap
 * a burst of legitimate traffic degrades the entire site rather than just
 * queueing. In-process, which is the correct scope while the app runs as a
 * single instance - see the note in submit's route handler about what changes
 * if it is ever scaled out.
 */
let active = 0;
const waiting: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT_EXECUTIONS) {
    active += 1;
    return;
  }
  // No increment on resume: releaseSlot hands its slot over without
  // decrementing, so the count already accounts for this caller.
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function releaseSlot(): void {
  const next = waiting.shift();
  if (next) {
    // Transfer the slot rather than free it. Resolving a promise does not run
    // the waiter's continuation synchronously - that happens a microtask
    // later - so decrementing here would open a window in which a fresh
    // caller takes the fast path on capacity that is already spoken for, and
    // `active` settles one above the cap. Under load that repeats per release
    // and the gate stops bounding anything.
    next();
    return;
  }
  active -= 1;
}

export interface ExecuteRequest {
  runtime: string;
  version: string;
  fileName: string;
  source: string;
  stdin: string;
  limits: ResolvedLimits;
  compiled: boolean;
}

/**
 * Run one program against one stdin payload.
 *
 * Note the request carries every test case at once (execute.ts batches them),
 * so this is one engine round trip per Run or Submit rather than one per case:
 * the interpreter starts once, and for a compiled language the compile step
 * would be paid once too.
 */
export async function executeOnPiston(request: ExecuteRequest): Promise<PistonResponse> {
  await acquireSlot();

  // Belt and braces alongside the engine's own run_timeout: if the engine
  // itself wedges, the abort keeps a Next.js request handler from hanging on
  // it indefinitely.
  const controller = new AbortController();
  const abortTimer = setTimeout(
    () => controller.abort(),
    request.limits.batchWallMs + request.limits.compileMs + 5_000,
  );

  try {
    const response = await fetch(EXECUTE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        language: request.runtime,
        version: request.version,
        files: [{ name: request.fileName, content: request.source }],
        stdin: request.stdin,
        run_timeout: request.limits.batchWallMs,
        compile_timeout: request.compiled ? request.limits.compileMs : 1_000,
        run_memory_limit: request.limits.memoryMb * 1024 * 1024,
        compile_memory_limit: request.compiled ? request.limits.memoryMb * 1024 * 1024 : -1,
        run_cpu_time: request.limits.batchWallMs,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      throw new PistonUnavailableError(
        `Execution engine returned ${response.status}${detail ? `: ${detail}` : ""}`,
      );
    }

    const payload = (await response.json()) as PistonResponse;
    if (!payload || typeof payload !== "object" || !payload.run) {
      throw new PistonUnavailableError("Execution engine returned an unrecognised response.");
    }

    return {
      run: normalizeRun(payload.run),
      compile: payload.compile ? normalizeRun(payload.compile) : undefined,
    };
  } catch (error) {
    if (error instanceof PistonUnavailableError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PistonUnavailableError("The execution engine did not respond in time.");
    }
    throw new PistonUnavailableError("Could not reach the execution engine.", { cause: error });
  } finally {
    clearTimeout(abortTimer);
    releaseSlot();
  }
}

/**
 * Truncate here as well as at the engine. The engine's cap is the one that
 * protects the engine; this one protects everything downstream - the response
 * body, the submission row, and the browser - from a program whose entire
 * output is a gigabyte of newlines.
 */
function normalizeRun(run: PistonRunResult): PistonRunResult {
  return {
    stdout: truncate(run.stdout ?? "", MAX_STDOUT_BYTES),
    stderr: truncate(run.stderr ?? "", MAX_STDERR_BYTES),
    code: run.code ?? null,
    signal: run.signal ?? null,
  };
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n... output truncated at ${limit} characters ...`;
}

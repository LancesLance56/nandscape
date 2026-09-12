"use client";

import type { ExecutionResult, TestCaseResult, Verdict } from "@/types/practice";
import { formatValue } from "@/lib/practice/compare";

/**
 * The results panel.
 *
 * Its central job is keeping two kinds of failure visually separate. A wrong
 * answer means the code ran and returned something incorrect, and what the
 * reader needs is the expected/actual pair. Everything else - a syntax error,
 * a crash, a timeout, an unreachable engine - means no answer was produced at
 * all, and what they need is the error text. Collapsing the two into one "it
 * failed" list is the single most common way a judge wastes a beginner's time,
 * so the aggregated error gets a banner and the per-case diffs get a list, and
 * they never occupy the same space.
 */

const VERDICT_LABEL: Record<Verdict, string> = {
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong answer",
  COMPILE_ERROR: "Could not compile",
  RUNTIME_ERROR: "Runtime error",
  TIME_LIMIT_EXCEEDED: "Took too long",
  MEMORY_LIMIT_EXCEEDED: "Ran out of memory",
  INTERNAL_ERROR: "Judge unavailable",
};

/** What to try next, keyed to what actually went wrong. */
const VERDICT_HINT: Partial<Record<Verdict, string>> = {
  COMPILE_ERROR: "Check the syntax below - nothing ran yet.",
  RUNTIME_ERROR: "Your code started but threw an error part way through.",
  TIME_LIMIT_EXCEEDED:
    "Usually a loop that never ends, or an approach that is too slow for the largest input.",
  MEMORY_LIMIT_EXCEEDED: "Something is growing without bound - often an ever-expanding list.",
  INTERNAL_ERROR: "This one is on us, not on your code. Try again in a moment.",
};

interface ResultPanelProps {
  result: ExecutionResult | null;
  running: boolean;
  mode: "run" | "submit" | null;
}

export function ResultPanel({ result, running, mode }: ResultPanelProps) {
  if (running) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-soft">
        <span className="h-2 w-2 animate-pulse rounded-full bg-copper" />
        {mode === "submit" ? "Running every test case..." : "Running the example cases..."}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-soft">
        <p>
          <span className="font-medium text-ink">Run</span> checks the examples above.{" "}
          <span className="font-medium text-ink">Submit</span> checks those plus the hidden cases.
        </p>
      </div>
    );
  }

  const accepted = result.verdict === "ACCEPTED";

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={`text-sm font-semibold ${
            accepted ? "text-signal-green-strong" : "text-signal-coral-strong"
          }`}
        >
          {VERDICT_LABEL[result.verdict]}
        </span>
        {result.totalCount > 0 && (
          <span className="text-xs text-ink-soft">
            {result.passedCount} of {result.totalCount} passed
          </span>
        )}
        {result.runtimeMs !== null && (
          <span className="text-xs tabular-nums text-ink-soft">
            slowest case {result.runtimeMs} ms
          </span>
        )}
      </header>

      {/* One aggregated failure that belongs to no single case. */}
      {result.error && (
        <div className="mb-3 rounded-md border border-signal-coral/40 bg-signal-coral-bg/60 p-3">
          {VERDICT_HINT[result.error.kind] && (
            <p className="mb-2 text-xs text-ink-soft">{VERDICT_HINT[result.error.kind]}</p>
          )}
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink">
            {result.error.message}
          </pre>
        </div>
      )}

      <ol className="space-y-2">
        {result.cases.map((testCase) => (
          <CaseRow key={testCase.index} result={testCase} />
        ))}
      </ol>
    </div>
  );
}

const STATUS_STYLE: Record<TestCaseResult["status"], { dot: string; label: string }> = {
  passed: { dot: "bg-signal-green-strong", label: "Passed" },
  failed: { dot: "bg-signal-coral-strong", label: "Wrong output" },
  errored: { dot: "bg-signal-coral-strong", label: "Errored" },
  "timed-out": { dot: "bg-signal-coral-strong", label: "Timed out" },
  skipped: { dot: "bg-border-strong", label: "Not run" },
};

function CaseRow({ result }: { result: TestCaseResult }) {
  const style = STATUS_STYLE[result.status];
  const showDetail = result.visible && result.status !== "passed" && result.status !== "skipped";

  return (
    <li className="rounded-md border border-border bg-surface-2/50">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
        <span className="text-xs font-medium text-ink">
          {result.visible ? `Case ${result.index + 1}` : `Hidden case ${result.index + 1}`}
        </span>
        <span className="text-xs text-ink-soft">{style.label}</span>
        {typeof result.runtimeMs === "number" && (
          <span className="ml-auto text-xs tabular-nums text-ink-soft">
            {result.runtimeMs.toFixed(1)} ms
          </span>
        )}
      </div>

      {/* A hidden case that fails reports only that it failed. Showing its
          inputs would defeat the reason for hiding it, so the row simply
          stops here. */}
      {showDetail && (
        <div className="space-y-2 border-t border-border px-3 py-2">
          {result.args !== undefined && (
            <Field label="Input" value={result.args.map(formatValue).join(", ")} />
          )}
          {result.status === "failed" && (
            <>
              <Field label="Expected" value={formatValue(result.expected)} />
              <Field label="Got" value={formatValue(result.actual)} tone="bad" />
            </>
          )}
          {result.stderr && <Field label="Error" value={result.stderr} tone="bad" mono />}
          {result.stdout && <Field label="Your output" value={result.stdout} mono />}
        </div>
      )}

      {/* Captured print() output is worth showing even on a passing visible
          case - it is how people debug, and hiding it the moment a case goes
          green makes the panel feel like it is withholding information. */}
      {result.visible && result.status === "passed" && result.stdout && (
        <div className="border-t border-border px-3 py-2">
          <Field label="Your output" value={result.stdout} mono />
        </div>
      )}
    </li>
  );
}

function Field({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "bad";
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <span className="pt-0.5 text-xs text-ink-soft">{label}</span>
      <pre
        className={`overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed ${
          mono ? "font-mono" : "font-mono"
        } ${tone === "bad" ? "text-signal-coral-strong" : "text-ink"}`}
      >
        {value}
      </pre>
    </div>
  );
}

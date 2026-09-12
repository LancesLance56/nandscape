"use client";

import type { PracticeLanguage, Verdict } from "@/types/practice";

/**
 * The submission history for one problem.
 *
 * A summary row per press of Submit, newest first - the stored code is
 * deliberately not shown. The point of the tab is answering "have I been here
 * before, and what went wrong last time", which the verdict and the pass count
 * answer on their own; reading a past attempt back into the editor would
 * quietly discard whatever is in it now.
 *
 * The rows arrive with the draft (one request carries both) and a fresh one is
 * prepended by the workspace as soon as Submit returns, so this never has to
 * fetch anything itself.
 */

export interface SubmissionSummary {
  id: string;
  language: string;
  verdict: Verdict;
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
  submittedAt: string;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong answer",
  COMPILE_ERROR: "Could not compile",
  RUNTIME_ERROR: "Runtime error",
  TIME_LIMIT_EXCEEDED: "Took too long",
  MEMORY_LIMIT_EXCEEDED: "Ran out of memory",
  INTERNAL_ERROR: "Judge unavailable",
};

const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
} satisfies Partial<Record<PracticeLanguage, string>>;

/**
 * Rendered on the client from an ISO string, so it follows the reader's own
 * locale and zone rather than the server's.
 */
function formatWhen(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SubmissionsPanel({
  submissions,
  signedIn,
}: {
  submissions: SubmissionSummary[];
  signedIn: boolean;
}) {
  if (!signedIn) {
    return (
      <Empty>
        Sign in to keep a history of what you have submitted for this problem.
      </Empty>
    );
  }

  if (submissions.length === 0) {
    return <Empty>Nothing submitted yet. Every press of Submit is recorded here.</Empty>;
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <ol className="space-y-2">
        {submissions.map((submission) => {
          const accepted = submission.verdict === "ACCEPTED";
          return (
            <li
              key={submission.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-2/50 px-3 py-2"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  accepted ? "bg-signal-green-strong" : "bg-signal-coral-strong"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  accepted ? "text-signal-green-strong" : "text-signal-coral-strong"
                }`}
              >
                {VERDICT_LABEL[submission.verdict]}
              </span>
              {submission.totalCount > 0 && (
                <span className="text-xs tabular-nums text-ink-soft">
                  {submission.passedCount}/{submission.totalCount}
                </span>
              )}
              <span className="text-xs text-ink-soft">
                {LANGUAGE_LABELS[submission.language] ?? submission.language}
              </span>
              {submission.runtimeMs !== null && (
                <span className="text-xs tabular-nums text-ink-soft">
                  {submission.runtimeMs} ms
                </span>
              )}
              <span className="ml-auto text-xs text-slate">
                {formatWhen(submission.submittedAt)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-soft">
      <p>{children}</p>
    </div>
  );
}

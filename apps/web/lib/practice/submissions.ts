import { randomUUID } from "node:crypto";
import { query } from "@/lib/db/client";
import type { ExecutionResult, TestCaseResult, Verdict } from "@/types/practice";

export interface SubmissionSummary {
  id: string;
  language: string;
  verdict: Verdict;
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
  submittedAt: string;
}

/**
 * Record one press of Submit.
 *
 * Append-only. PuzzleAttempt keeps a single upserted row with an
 * `attemptsCount`, which suits a puzzle you either solved or did not; a coding
 * problem is something people converge on over several tries, and the shape of
 * those tries - first attempt timed out, second was wrong on an edge case,
 * third passed - is worth being able to show back.
 */
export async function recordSubmission(params: {
  userId: string;
  problemId: string;
  language: string;
  code: string;
  result: ExecutionResult;
}): Promise<SubmissionSummary> {
  const rows = await query<{
    id: string;
    language: string;
    verdict: Verdict;
    passedCount: number;
    totalCount: number;
    runtimeMs: number | null;
    submittedAt: string;
    [key: string]: unknown;
  }>(
    `INSERT INTO "CodingSubmission" (
       id, "userId", "problemId", language, code, verdict,
       "passedCount", "totalCount", results, "runtimeMs", "submittedAt"
     )
     VALUES ($1, $2, $3, $4, $5, $6::"SubmissionVerdict", $7, $8, $9::jsonb, $10, now())
     RETURNING id, language, verdict, "passedCount", "totalCount", "runtimeMs", "submittedAt"`,
    [
      randomUUID(),
      params.userId,
      params.problemId,
      params.language,
      params.code,
      params.result.verdict,
      params.result.passedCount,
      params.result.totalCount,
      JSON.stringify(stripForStorage(params.result.cases)),
      params.result.runtimeMs,
    ],
  );

  return rows[0];
}

/**
 * Drop captured stdout/stderr before the row is written.
 *
 * The per-case output is worth showing in the panel the user is looking at
 * right now, but storing it forever turns a print-debugging loop into
 * unbounded row growth for no later benefit. The verdict and the pass counts
 * are what history is actually read for.
 */
function stripForStorage(cases: TestCaseResult[]): TestCaseResult[] {
  return cases.map(({ index, visible, status, runtimeMs }) => ({
    index,
    visible,
    status,
    runtimeMs,
  }));
}

export async function listSubmissions(
  userId: string,
  problemSlug: string,
  limit = 20,
): Promise<SubmissionSummary[]> {
  return query<SubmissionSummary & Record<string, unknown>>(
    `SELECT s.id, s.language, s.verdict, s."passedCount", s."totalCount",
            s."runtimeMs", s."submittedAt"
       FROM "CodingSubmission" s
       JOIN "CodingProblem" p ON p.id = s."problemId"
      WHERE s."userId" = $1 AND p.slug = $2
      ORDER BY s."submittedAt" DESC
      LIMIT $3`,
    [userId, problemSlug, limit],
  );
}

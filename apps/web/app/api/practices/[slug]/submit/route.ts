import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { executeSubmission } from "@/lib/practice/execute";
import { getGradingSpec } from "@/lib/practice/practice-records";
import { recordSubmission } from "@/lib/practice/submissions";
import { deleteDraft } from "@/lib/practice/drafts";
import { enforceRateLimit, parseSubmissionBody, rateLimitKey } from "@/lib/practice/request";
import { RATE_LIMIT_SUBMIT_PER_MIN } from "@/lib/practice/limits";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Run against every test case, visible and hidden, and record the attempt.
 *
 * Requires an account, because it writes a submission row and because "solved"
 * has to belong to somebody. The hidden cases are read here and never leave:
 * executeSubmission marks them `visible: false`, and the result mapper drops
 * their inputs, expected values and captured output before the response is
 * built, so a failing hidden case reports its index and nothing else.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to submit a solution" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    rateLimitKey(request, user.id, "submit"),
    RATE_LIMIT_SUBMIT_PER_MIN,
  );
  if (limited) return limited;

  const parsed = await parseSubmissionBody(request);
  if (!parsed.ok) return parsed.response;

  const spec = await getGradingSpec(slug);
  if (!spec) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!spec.languages.includes(parsed.body.language)) {
    return NextResponse.json(
      { error: `This problem cannot be solved in ${parsed.body.language}` },
      { status: 422 },
    );
  }

  const result = await executeSubmission({
    language: parsed.body.language,
    code: parsed.body.code,
    signature: spec.signature,
    // Visible cases first so their indices line up with the ones the reader
    // already saw in the statement; hidden cases follow and report as
    // "Hidden case 4" rather than exposing anything about themselves.
    cases: [
      ...spec.visibleTests.map((testCase) => ({ ...testCase, visible: true })),
      ...spec.hiddenTests.map((testCase) => ({ ...testCase, visible: false })),
    ],
    compareMode: spec.compareMode,
    epsilon: spec.epsilon,
    timeLimitMs: spec.timeLimitMs,
    memoryLimitMb: spec.memoryLimitMb,
  });

  const submission = await recordSubmission({
    userId: user.id,
    problemId: spec.id,
    language: parsed.body.language,
    code: parsed.body.code,
    result,
  });

  // A solved problem no longer needs its draft: the accepted code is stored on
  // the submission, and leaving the draft behind means the next visit reopens
  // the working copy rather than the solution.
  if (result.verdict === "ACCEPTED") {
    await deleteDraft(user.id, slug, parsed.body.language).catch(() => {});
  }

  return NextResponse.json({ result, submission });
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { executeSubmission } from "@/lib/practice/execute";
import { getGradingSpec } from "@/lib/practice/practice-records";
import { enforceRateLimit, parseSubmissionBody, rateLimitKey } from "@/lib/practice/request";
import { RATE_LIMIT_RUN_PER_MIN } from "@/lib/practice/limits";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Run against the visible test cases only.
 *
 * The fast half of the Run/Submit contract: it executes just the cases the
 * user can already see, records nothing, and exists so the iteration loop is
 * short. Submit is the one that runs everything and costs an attempt.
 *
 * Signing in is not required. This is a teaching site, and a visitor who has
 * not made an account should still be able to try an idea and see it work -
 * the anonymous path is simply rate-limited on a hashed address instead of a
 * user id. Submit, which writes a row, does require an account.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const limited = enforceRateLimit(
    rateLimitKey(request, user?.id ?? null, "run"),
    RATE_LIMIT_RUN_PER_MIN,
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
    // Visible only. `spec.hiddenTests` is in scope here and deliberately unused
    // - the whole point of the split is that Run cannot reveal what Submit
    // checks, however convenient it would be to reuse one code path.
    cases: spec.visibleTests.map((testCase) => ({ ...testCase, visible: true })),
    compareMode: spec.compareMode,
    epsilon: spec.epsilon,
    timeLimitMs: spec.timeLimitMs,
    memoryLimitMb: spec.memoryLimitMb,
  });

  return NextResponse.json({ result, ran: "visible" });
}

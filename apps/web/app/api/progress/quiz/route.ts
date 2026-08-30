import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { recordQuizAttempt } from "@/lib/engagement/progress";

/**
 * Record a finished quiz run.
 *
 * Returns 204 for a signed-out reader rather than 401. The quiz itself works
 * perfectly well without an account, and the widget posts here in the
 * background when someone reaches the results screen; turning that into a
 * console error for every logged-out reader would be noise about a thing that
 * is working as intended.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return new NextResponse(null, { status: 204 });

  let body: { quizKey?: unknown; score?: unknown; total?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { quizKey, score, total } = body;
  if (typeof quizKey !== "string" || !quizKey || typeof score !== "number" || typeof total !== "number") {
    return NextResponse.json({ error: "`quizKey`, `score` and `total` are required" }, { status: 422 });
  }

  await recordQuizAttempt(user.id, quizKey, score, total);
  return new NextResponse(null, { status: 204 });
}

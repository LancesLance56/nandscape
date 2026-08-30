import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { setTutorialCompletion } from "@/lib/engagement/progress";

/**
 * Mark a tutorial page done, or undo it.
 *
 * Signed-in only, and that is not an oversight: the whole point of the record
 * is the dashboard, which a signed-out reader has no way back to. The toggle
 * that calls this hides itself rather than offering an action that cannot
 * persist.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to track progress" }, { status: 401 });

  let body: { pageSlug?: unknown; trackSlug?: unknown; completed?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pageSlug, trackSlug, completed } = body;
  if (typeof pageSlug !== "string" || !pageSlug || typeof completed !== "boolean") {
    return NextResponse.json({ error: "`pageSlug` and boolean `completed` are required" }, { status: 422 });
  }

  const now = await setTutorialCompletion(
    user.id,
    pageSlug,
    typeof trackSlug === "string" ? trackSlug : null,
    completed,
  );

  return NextResponse.json({ completed: now });
}

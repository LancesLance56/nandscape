import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCompletedSlugs, setTutorialCompletion } from "@/lib/engagement/progress";

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

/**
 * Whether *this* reader has finished a given page.
 *
 * Read from the browser rather than rendered into the page, because the
 * lesson itself is statically prerendered and revalidated for everyone:
 * touching the session cookie while building it would flip the whole route
 * to dynamic at runtime and lose the cached shell. Signed-out is a normal
 * answer here, not an error.
 */
export async function GET(request: NextRequest) {
  const pageSlug = request.nextUrl.searchParams.get("pageSlug");
  if (!pageSlug) {
    return NextResponse.json({ error: "`pageSlug` is required" }, { status: 422 });
  }

  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ signedIn: false, completed: false });

  const completed = await getCompletedSlugs(user.id, [pageSlug]).catch(() => new Set<string>());
  return NextResponse.json({ signedIn: true, completed: completed.has(pageSlug) });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { toggleVote } from "@/lib/community/discussions";

/**
 * Toggle the signed-in reader's upvote on one post.
 *
 * A toggle rather than separate add/remove routes: the composite primary key
 * on discussion_votes already makes the state binary, so there is exactly one
 * transition to express and no way for the client and the table to disagree
 * about which of two endpoints should have been called.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Sign in to vote" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const state = await toggleVote(id, user.id);
    return NextResponse.json(state, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    // 23503 is a foreign-key violation, which here means the post was deleted
    // between the page rendering and the click. That is a 404, not a 500 - the
    // reader did nothing wrong and a refresh fixes it.
    if ((error as { code?: string }).code === "23503") {
      return NextResponse.json({ error: "That post is gone" }, { status: 404 });
    }
    throw error;
  }
}

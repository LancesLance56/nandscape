import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  createPost,
  isDiscussionKind,
  resolveTarget,
  MAX_BODY_LENGTH,
  MAX_CODE_LENGTH,
} from "@/lib/community/discussions";

/**
 * Write one post into a content-scoped discussion.
 *
 * The target is resolved before the insert rather than trusted: without that
 * check any kind + slug pair would create a discussion for a page that does
 * not exist, which is a free way to fill the table and the hub rail with rows
 * nobody can moderate from the content they supposedly belong to.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Sign in to post" }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: "Verify your email address to post" }, { status: 403 });
  }

  let body: { kind?: unknown; slug?: unknown; body?: unknown; code?: unknown; parentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { kind, slug, parentId } = body;
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!isDiscussionKind(kind) || typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "`kind` and `slug` are required" }, { status: 422 });
  }
  if (!text) {
    return NextResponse.json({ error: "A post needs a body" }, { status: 422 });
  }
  if (text.length > MAX_BODY_LENGTH || code.length > MAX_CODE_LENGTH) {
    return NextResponse.json({ error: "Post is too long" }, { status: 422 });
  }
  if (parentId !== undefined && parentId !== null && typeof parentId !== "string") {
    return NextResponse.json({ error: "`parentId` must be a string" }, { status: 422 });
  }

  const target = await resolveTarget(kind, slug);
  if (!target) {
    return NextResponse.json({ error: "Nothing to discuss at that address" }, { status: 404 });
  }

  // A reply must belong to the same target as its parent. Without this, a
  // reply could be attached across content boundaries and would then render
  // on neither page - the parent lookup on the reading side would miss it.
  if (typeof parentId === "string" && parentId) {
    const rows = await query<{ id: string }>(
      `SELECT id FROM discussion_posts
        WHERE id = $1 AND "targetKind" = $2::"ContentKind" AND target_slug = $3 AND parent_id IS NULL`,
      [parentId, kind, slug],
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "No such post to reply to" }, { status: 404 });
    }
  }

  const id = await createPost({
    kind,
    slug,
    authorId: user.id,
    body: text,
    code: code || null,
    parentId: typeof parentId === "string" ? parentId : null,
  });

  return NextResponse.json({ id }, { status: 201 });
}

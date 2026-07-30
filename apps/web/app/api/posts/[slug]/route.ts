import { NextRequest, NextResponse } from "next/server";
import { deletePost, getPostBySlug, updatePost } from "@/lib/blog/posts";
import type { UpdatePostInput } from "@/types/blog";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Public callers only ever get published posts; anything else needs auth
  // (left as a TODO,  see app/api/posts/route.ts).
  const isPublic = request.nextUrl.searchParams.get("preview") !== "1";
  if (isPublic && post.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // TODO: require an authenticated session before allowing writes.
  const { slug } = await params;

  let patch: UpdatePostInput;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updated = await updatePost(slug, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ post: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  // TODO: require an authenticated session before allowing writes.
  const { slug } = await params;
  const deleted = await deletePost(slug);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

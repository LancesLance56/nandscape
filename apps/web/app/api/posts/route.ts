import { NextRequest, NextResponse } from "next/server";
import { createPost, listAllPosts, listPublishedPosts } from "@/lib/blog/posts";
import type { NewPostInput } from "@/types/blog";

export async function GET(request: NextRequest) {
  const includeDrafts = request.nextUrl.searchParams.get("status") === "all";

  // TODO: gate `includeDrafts` behind real auth once the admin area exists.
  // Right now anything other than the public/published view is unauthenticated.
  const posts = includeDrafts ? await listAllPosts() : await listPublishedPosts();

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  // TODO: require an authenticated session before allowing writes.
  let input: NewPostInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input.slug || !input.title) {
    return NextResponse.json({ error: "`slug` and `title` are required" }, { status: 422 });
  }

  try {
    const post = await createPost(input);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: `A post with slug "${input.slug}" already exists` }, { status: 409 });
    }
    console.error("[blog] failed to create post", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";
import { createPost, listAllPosts, listPublishedPosts } from "@/lib/blog/posts";
import type { NewPostInput } from "@/types/blog";

export async function GET(request: NextRequest) {
  const includeDrafts = request.nextUrl.searchParams.get("status") === "all";

  if (includeDrafts) {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const posts = includeDrafts ? await listAllPosts() : await listPublishedPosts();

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 422 });
  }

  const input = body as NewPostInput;
  if (typeof input.slug !== "string" || !input.slug || typeof input.title !== "string" || !input.title) {
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

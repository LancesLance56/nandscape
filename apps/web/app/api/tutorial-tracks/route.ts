import { NextRequest, NextResponse } from "next/server";
import { createTutorialTrack, listTutorialTracks } from "@/lib/tutorials/tutorial-tracks";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";
import type { NewTutorialTrackInput } from "@/types/tutorial";

export async function GET() {
  const tracks = await listTutorialTracks();
  return NextResponse.json({ tracks });
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

  const input = body as NewTutorialTrackInput;
  if (typeof input.slug !== "string" || !input.slug || typeof input.title !== "string" || !input.title) {
    return NextResponse.json({ error: "`slug` and `title` are required" }, { status: 422 });
  }

  try {
    const track = await createTutorialTrack(input);
    return NextResponse.json({ track }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: `A track with slug "${input.slug}" already exists` }, { status: 409 });
    }
    console.error("[tutorials] failed to create track", error);
    return NextResponse.json({ error: "Failed to create track" }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

import { NextRequest, NextResponse } from "next/server";
import { createTutorialSection, listTutorialSections } from "@/lib/tutorials/tutorial-sections";
import { getTutorialTrackBySlug } from "@/lib/tutorials/tutorial-tracks";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";
import type { NewTutorialSectionInput } from "@/types/tutorial";

export async function GET() {
  const sections = await listTutorialSections();
  return NextResponse.json({ sections });
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

  const input = body as NewTutorialSectionInput;
  if (typeof input.slug !== "string" || !input.slug || typeof input.title !== "string" || !input.title) {
    return NextResponse.json({ error: "`slug` and `title` are required" }, { status: 422 });
  }

  // Seed files name their track by slug; the UUID only exists after the
  // track row is created, so resolve it here rather than making every seed
  // file carry a generated id.
  let trackId = input.trackId ?? null;
  if (!trackId && input.trackSlug) {
    const track = await getTutorialTrackBySlug(input.trackSlug);
    if (!track) {
      return NextResponse.json({ error: `No tutorial track with slug "${input.trackSlug}"` }, { status: 422 });
    }
    trackId = track.id;
  }

  try {
    const section = await createTutorialSection({ ...input, trackId });
    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: `A section with slug "${input.slug}" already exists` }, { status: 409 });
    }
    console.error("[tutorials] failed to create section", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}
import { NextRequest, NextResponse } from "next/server";
import { deleteTutorialSection, getTutorialSectionBySlug, updateTutorialSection } from "@/lib/tutorials/tutorial-sections";
import { getTutorialTrackBySlug } from "@/lib/tutorials/tutorial-tracks";
import type { UpdateTutorialSectionInput } from "@/types/tutorial";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const section = await getTutorialSectionBySlug(slug);
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ section });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  let patch: UpdateTutorialSectionInput;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Same slug -> id resolution the POST route does, so re-running the seed
  // over sections that already exist still attaches them to their track.
  if (patch.trackId === undefined && patch.trackSlug) {
    const track = await getTutorialTrackBySlug(patch.trackSlug);
    if (!track) {
      return NextResponse.json({ error: `No tutorial track with slug "${patch.trackSlug}"` }, { status: 422 });
    }
    patch = { ...patch, trackId: track.id };
  }

  const updated = await updateTutorialSection(slug, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ section: updated });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const deleted = await deleteTutorialSection(slug);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
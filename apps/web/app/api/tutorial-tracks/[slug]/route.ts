import { NextRequest, NextResponse } from "next/server";
import {
  deleteTutorialTrack,
  getTutorialTrackBySlug,
  updateTutorialTrack,
} from "@/lib/tutorials/tutorial-tracks";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";
import type { UpdateTutorialTrackInput } from "@/types/tutorial";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const track = await getTutorialTrackBySlug(slug);
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ track });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  let patch: UpdateTutorialTrackInput;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updated = await updateTutorialTrack(slug, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ track: updated });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const deleted = await deleteTutorialTrack(slug);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

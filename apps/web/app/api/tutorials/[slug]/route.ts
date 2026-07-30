import { NextRequest, NextResponse } from "next/server";
import { deleteTutorialPage, getTutorialPageBySlug, updateTutorialPage } from "@/lib/tutorials/tutorials";
import { getTutorialSectionBySlug } from "@/lib/tutorials/tutorial-sections";
import type { UpdateTutorialPageInput } from "@/types/tutorial";

interface SeedTutorialPagePatch extends UpdateTutorialPageInput {
  sectionSlug?: string;
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const page = await getTutorialPageBySlug(slug);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  let patch: SeedTutorialPagePatch;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!patch.sectionId && patch.sectionSlug) {
    const section = await getTutorialSectionBySlug(patch.sectionSlug);
    if (section) patch.sectionId = section.id;
  }

  const updated = await updateTutorialPage(slug, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const deleted = await deleteTutorialPage(slug);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

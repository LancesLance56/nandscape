import { NextRequest, NextResponse } from "next/server";
import { deleteTutorialSection, getTutorialSectionBySlug, updateTutorialSection } from "@/lib/tutorials/tutorial-sections";
import type { UpdateTutorialSectionInput } from "@/types/tutorial";

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
  const { slug } = await params;

  let patch: UpdateTutorialSectionInput;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updated = await updateTutorialSection(slug, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ section: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const deleted = await deleteTutorialSection(slug);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
import { NextRequest, NextResponse } from "next/server";
import { createTutorialPage, listTutorialPages } from "@/lib/tutorials/tutorials";
import { getTutorialSectionBySlug } from "@/lib/tutorials/tutorial-sections";
import type { NewTutorialPageInput } from "@/types/tutorial";

interface SeedTutorialPageInput extends NewTutorialPageInput {
  sectionSlug?: string;
}

export async function GET() {
  const pages = await listTutorialPages();
  return NextResponse.json({ pages });
}

export async function POST(request: NextRequest) {
  let body: SeedTutorialPageInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.slug || !body.title) {
    return NextResponse.json({ error: "`slug` and `title` are required" }, { status: 422 });
  }

  let sectionId = body.sectionId ?? null;
  if (!sectionId && body.sectionSlug) {
    const section = await getTutorialSectionBySlug(body.sectionSlug);
    if (!section) {
      return NextResponse.json(
        { error: `No tutorial section with slug "${body.sectionSlug}"` },
        { status: 422 },
      );
    }
    sectionId = section.id;
  }

  try {
    const page = await createTutorialPage({ ...body, sectionId });
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: `A tutorial page with slug "${body.slug}" already exists` }, { status: 409 });
    }
    console.error("[tutorials] failed to create page", error);
    return NextResponse.json({ error: "Failed to create tutorial page" }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

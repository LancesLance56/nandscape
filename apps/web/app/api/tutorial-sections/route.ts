import { NextRequest, NextResponse } from "next/server";
import { createTutorialSection, listTutorialSections } from "@/lib/tutorials/tutorial-sections";
import type { NewTutorialSectionInput } from "@/types/tutorial";

export async function GET() {
  const sections = await listTutorialSections();
  return NextResponse.json({ sections });
}

export async function POST(request: NextRequest) {
  let input: NewTutorialSectionInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input.slug || !input.title) {
    return NextResponse.json({ error: "`slug` and `title` are required" }, { status: 422 });
  }

  try {
    const section = await createTutorialSection(input);
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
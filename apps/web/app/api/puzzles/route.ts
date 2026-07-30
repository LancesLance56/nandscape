import { NextRequest, NextResponse } from "next/server";
import { createPuzzleRecord, listPuzzleRecords } from "@/lib/puzzles/puzzle-records";
import type { PuzzleSeedInput } from "@/lib/puzzles/puzzle-records";

export async function GET() {
  const puzzles = await listPuzzleRecords();
  return NextResponse.json({ puzzles });
}

export async function POST(request: NextRequest) {
  let input: PuzzleSeedInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input.slug || !input.title || !input.difficulty) {
    return NextResponse.json({ error: "`slug`, `title`, and `difficulty` are required" }, { status: 422 });
  }

  try {
    const puzzle = await createPuzzleRecord(input);
    return NextResponse.json({ puzzle }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: `A puzzle with slug "${input.slug}" already exists` }, { status: 409 });
    }
    console.error("[puzzles] failed to create puzzle", error);
    return NextResponse.json({ error: "Failed to create puzzle" }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

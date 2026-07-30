import { NextRequest, NextResponse } from "next/server";
import { getPuzzleRecordBySlug, updatePuzzleRecord } from "@/lib/puzzles/puzzle-records";
import type { PuzzleSeedInput } from "@/lib/puzzles/puzzle-records";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const puzzle = await getPuzzleRecordBySlug(slug);
  if (!puzzle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ puzzle });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  let patch: Partial<PuzzleSeedInput>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updated = await updatePuzzleRecord(slug, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ puzzle: updated });
}

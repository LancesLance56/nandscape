import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";
import {
  createPracticeRecord,
  listPracticeRecords,
  PracticeValidationError,
  type PracticeSeedInput,
} from "@/lib/practice/practice-records";

export async function GET() {
  const practices = await listPracticeRecords();
  return NextResponse.json({ practices });
}

/**
 * Authoring goes through the seed pipeline, exactly as puzzles do: this
 * accepts an admin session or the SEED_SECRET header, and seed/seed.mjs POSTs
 * the files in seed/practices/ here.
 *
 * No admin UI, deliberately. The admin dashboard covers blog posts, tutorials
 * and diagrams - prose that benefits from a live editor - while puzzles, whose
 * content is structured data rather than prose, are seed-only. A coding
 * problem is structured data (a signature, typed test cases, per-language
 * stubs), so it follows puzzles rather than becoming a third authoring path.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let input: PracticeSeedInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input.slug || !input.title || !input.difficulty) {
    return NextResponse.json(
      { error: "`slug`, `title`, and `difficulty` are required" },
      { status: 422 },
    );
  }

  try {
    const practice = await createPracticeRecord(input);
    return NextResponse.json({ practice }, { status: 201 });
  } catch (error) {
    if (error instanceof PracticeValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: `A problem with slug "${input.slug}" already exists` },
        { status: 409 },
      );
    }
    console.error("[practices] failed to create problem", error);
    return NextResponse.json({ error: "Failed to create problem" }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

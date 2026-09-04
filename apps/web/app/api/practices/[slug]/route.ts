import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";
import {
  getPracticeBySlug,
  updatePracticeRecord,
  PracticeValidationError,
  type PracticeSeedInput,
} from "@/lib/practice/practice-records";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const practice = await getPracticeBySlug(slug);
  if (!practice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ practice });
}

/**
 * Update an existing problem — from `seed.mjs --force` or from Problem Studio.
 *
 * PATCH rather than PUT to match every other content route (posts, puzzles,
 * tutorials); seed.mjs issues PATCH for its overwrite path, so anything else
 * here is a 405 the moment someone re-seeds.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  let input: PracticeSeedInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const practice = await updatePracticeRecord(slug, input);
    if (!practice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ practice });
  } catch (error) {
    if (error instanceof PracticeValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[practices] failed to update problem", error);
    return NextResponse.json({ error: "Failed to update problem" }, { status: 500 });
  }
}

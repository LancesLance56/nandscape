import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";
import { getAuthoringRecord } from "@/lib/practice/practice-records";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * The authoring view of one problem, hidden tests and reference solutions
 * included.
 *
 * A separate route from `/api/practices/[slug]` rather than a flag on it. That
 * route is public and its response shape is the thing standing between a
 * learner and the answers; making it conditionally return the secret half
 * would mean one boolean, somewhere, is all that separates the two. A distinct
 * path with its own ADMIN check cannot be got wrong by accident.
 *
 * Note this route only reads. Saving goes through `PUT /api/practices/[slug]`,
 * which already accepts an admin session and runs the same validation the seed
 * pipeline does.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Same credential as the authoring write routes: an ADMIN session or the
  // SEED_SECRET header. seed/export.mjs needs this record to round-trip a
  // problem, and it has no login.
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const practice = await getAuthoringRecord(slug);
  if (!practice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ practice });
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  addClaps,
  clapperIdFor,
  getClapState,
  isContentKind,
  CLAP_MAX,
} from "@/lib/engagement/claps";

/**
 * Read and add claps. Open to signed-out readers by design.
 *
 * The reader's identity comes from their session when they have one and from
 * an `anonId` their browser generated when they do not. That id is accepted on
 * trust, which is the honest trade for a feature that must work without an
 * account: someone determined can mint new ids and clap again, and the cost of
 * stopping them (fingerprinting, or logging IPs against what people read) is
 * worse than the problem.
 */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const kind = params.get("kind");
  const slug = params.get("slug");
  const anonId = params.get("anonId");

  if (!isContentKind(kind) || !slug) {
    return NextResponse.json({ error: "`kind` (BLOG|TUTORIAL) and `slug` are required" }, { status: 400 });
  }

  const user = await getCurrentUser().catch(() => null);
  const clapperId = clapperIdFor(user?.id ?? null, anonId);
  const state = await getClapState(kind, slug, clapperId);

  return NextResponse.json(
    { ...state, max: CLAP_MAX },
    // Per-reader, so a shared cache would hand one person's `mine` to
    // everybody else.
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: NextRequest) {
  let body: { kind?: unknown; slug?: unknown; amount?: unknown; anonId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { kind, slug, amount, anonId } = body;
  if (!isContentKind(kind) || typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "`kind` (BLOG|TUTORIAL) and `slug` are required" }, { status: 422 });
  }

  const user = await getCurrentUser().catch(() => null);
  const clapperId = clapperIdFor(user?.id ?? null, typeof anonId === "string" ? anonId : null);

  if (!clapperId) {
    return NextResponse.json({ error: "No usable clapper id" }, { status: 422 });
  }

  const state = await addClaps(kind, slug, clapperId, typeof amount === "number" ? amount : 1);
  return NextResponse.json({ ...state, max: CLAP_MAX });
}

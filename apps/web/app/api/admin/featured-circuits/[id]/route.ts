import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { removeFeaturedCircuit, setActiveFeaturedCircuit } from "@/lib/featured-circuits/featured-circuits";
import type { FeaturedPlacement } from "@/lib/featured-circuits/featured-circuits";

const VALID_PLACEMENTS: FeaturedPlacement[] = ["HOMEPAGE_DEMO", "COMMUNITY_WEEKLY"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { active, placement } = (body as Record<string, unknown> | null) ?? {};
  if (active !== true) {
    return NextResponse.json({ error: "Only { active: true } is supported" }, { status: 422 });
  }
  if (!VALID_PLACEMENTS.includes(placement as FeaturedPlacement)) {
    return NextResponse.json({ error: "`placement` must be HOMEPAGE_DEMO or COMMUNITY_WEEKLY" }, { status: 422 });
  }

  await setActiveFeaturedCircuit(id, placement as FeaturedPlacement);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const deleted = await removeFeaturedCircuit(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

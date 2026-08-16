import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProjectBySlug } from "@/lib/projects/projects";
import { addFeaturedCircuit, listFeaturedCircuits } from "@/lib/featured-circuits/featured-circuits";
import type { FeaturedPlacement } from "@/lib/featured-circuits/featured-circuits";

const VALID_PLACEMENTS: FeaturedPlacement[] = ["HOMEPAGE_DEMO", "COMMUNITY_WEEKLY"];

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const placementParam = request.nextUrl.searchParams.get("placement");
  if (!VALID_PLACEMENTS.includes(placementParam as FeaturedPlacement)) {
    return NextResponse.json({ error: "`placement` query param must be HOMEPAGE_DEMO or COMMUNITY_WEEKLY" }, { status: 422 });
  }

  const featured = await listFeaturedCircuits(placementParam as FeaturedPlacement);
  return NextResponse.json({ featured });
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slug, placement } = (body as Record<string, unknown> | null) ?? {};
  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ error: "Project slug is required" }, { status: 422 });
  }
  if (!VALID_PLACEMENTS.includes(placement as FeaturedPlacement)) {
    return NextResponse.json({ error: "`placement` must be HOMEPAGE_DEMO or COMMUNITY_WEEKLY" }, { status: 422 });
  }

  const project = await getProjectBySlug(slug.trim());
  if (!project) {
    return NextResponse.json({ error: "No project found with that slug" }, { status: 404 });
  }

  const featured = await addFeaturedCircuit(project.id, placement as FeaturedPlacement);
  return NextResponse.json({ featured }, { status: 201 });
}

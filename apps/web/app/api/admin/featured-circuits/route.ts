import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProjectBySlug } from "@/lib/projects/projects";
import { addFeaturedCircuit, listFeaturedCircuits } from "@/lib/featured-circuits/featured-circuits";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const featured = await listFeaturedCircuits();
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

  const slug = (body as Record<string, unknown> | null)?.slug;
  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ error: "Project slug is required" }, { status: 422 });
  }

  const project = await getProjectBySlug(slug.trim());
  if (!project) {
    return NextResponse.json({ error: "No project found with that slug" }, { status: 404 });
  }

  const featured = await addFeaturedCircuit(project.id);
  return NextResponse.json({ featured }, { status: 201 });
}

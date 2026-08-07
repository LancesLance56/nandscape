import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { forkProject, getProjectBySlug } from "@/lib/projects/projects";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;
  const source = await getProjectBySlug(slug);
  if (!source) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const canFork = source.visibility !== "PRIVATE" || source.ownerId === user.id;
  if (!canFork) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = await forkProject(source, user.id);
  return NextResponse.json({ project }, { status: 201 });
}

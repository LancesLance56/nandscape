import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createProject, listProjectsForUser } from "@/lib/projects/projects";
import type { ProjectVisibility } from "@/lib/projects/projects";
import type { EditorNode, EditorEdge } from "@/types/editor";

const VALID_VISIBILITIES: ProjectVisibility[] = ["PRIVATE", "UNLISTED", "PUBLIC"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projects = await listProjectsForUser(user.id);
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, nodes, edges, visibility } = body as {
    name?: unknown;
    nodes?: unknown;
    edges?: unknown;
    visibility?: unknown;
  };

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "`name` is required" }, { status: 422 });
  }
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return NextResponse.json({ error: "`nodes` and `edges` must be arrays" }, { status: 422 });
  }
  if (visibility !== undefined && !VALID_VISIBILITIES.includes(visibility as ProjectVisibility)) {
    return NextResponse.json({ error: "`visibility` must be PRIVATE, UNLISTED, or PUBLIC" }, { status: 422 });
  }

  const project = await createProject(user.id, {
    name,
    nodes: nodes as EditorNode[],
    edges: edges as EditorEdge[],
    visibility: visibility as ProjectVisibility | undefined,
  });

  return NextResponse.json({ project }, { status: 201 });
}

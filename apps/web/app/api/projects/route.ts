import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createProject, listProjectsForUser } from "@/lib/projects/projects";
import type { ProjectVisibility } from "@/lib/projects/projects";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { CircuitScope } from "@/types/scope";

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

  const { name, description, nodes, edges, scopes, blocks, visibility } = body as {
    name?: unknown;
    description?: unknown;
    nodes?: unknown;
    edges?: unknown;
    scopes?: unknown;
    blocks?: unknown;
    visibility?: unknown;
  };

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "`name` is required" }, { status: 422 });
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    return NextResponse.json({ error: "`description` must be a string or null" }, { status: 422 });
  }
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return NextResponse.json({ error: "`nodes` and `edges` must be arrays" }, { status: 422 });
  }
  if (scopes !== undefined && !Array.isArray(scopes)) {
    return NextResponse.json({ error: "`scopes` must be an array" }, { status: 422 });
  }
  if (blocks !== undefined && !Array.isArray(blocks)) {
    return NextResponse.json({ error: "`blocks` must be an array" }, { status: 422 });
  }
  if (visibility !== undefined && !VALID_VISIBILITIES.includes(visibility as ProjectVisibility)) {
    return NextResponse.json({ error: "`visibility` must be PRIVATE, UNLISTED, or PUBLIC" }, { status: 422 });
  }

  const project = await createProject(user.id, {
    name,
    description: description as string | null | undefined,
    nodes: nodes as EditorNode[],
    edges: edges as EditorEdge[],
    scopes: scopes as CircuitScope[] | undefined,
    blocks: blocks as SubcircuitBlockDefinition[] | undefined,
    visibility: visibility as ProjectVisibility | undefined,
  });

  return NextResponse.json({ project }, { status: 201 });
}

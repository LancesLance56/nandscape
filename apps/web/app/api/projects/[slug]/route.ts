import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { deleteProject, getProjectBySlug, updateProject } from "@/lib/projects/projects";
import type { ProjectVisibility } from "@/lib/projects/projects";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { CircuitScope } from "@/types/scope";

const VALID_VISIBILITIES: ProjectVisibility[] = ["PRIVATE", "UNLISTED", "PUBLIC"];

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Private projects 404 for non-owners instead of 403,  a 403 confirms the
// slug exists, which is exactly what a private/unlisted split is meant to hide.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.visibility === "PRIVATE") {
    const user = await getCurrentUser();
    if (!user || user.id !== project.ownerId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;
  const existing = await getProjectBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (existing.ownerId !== user.id) {
    return NextResponse.json({ error: "You don't own this project" }, { status: 403 });
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

  if (visibility !== undefined && !VALID_VISIBILITIES.includes(visibility as ProjectVisibility)) {
    return NextResponse.json({ error: "`visibility` must be PRIVATE, UNLISTED, or PUBLIC" }, { status: 422 });
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    return NextResponse.json({ error: "`description` must be a string or null" }, { status: 422 });
  }
  if (nodes !== undefined && !Array.isArray(nodes)) {
    return NextResponse.json({ error: "`nodes` must be an array" }, { status: 422 });
  }
  if (edges !== undefined && !Array.isArray(edges)) {
    return NextResponse.json({ error: "`edges` must be an array" }, { status: 422 });
  }
  if (scopes !== undefined && !Array.isArray(scopes)) {
    return NextResponse.json({ error: "`scopes` must be an array" }, { status: 422 });
  }
  if (blocks !== undefined && !Array.isArray(blocks)) {
    return NextResponse.json({ error: "`blocks` must be an array" }, { status: 422 });
  }

  const project = await updateProject(existing.id, {
    name: typeof name === "string" ? name : undefined,
    description: description as string | null | undefined,
    nodes: nodes as EditorNode[] | undefined,
    edges: edges as EditorEdge[] | undefined,
    scopes: scopes as CircuitScope[] | undefined,
    blocks: blocks as SubcircuitBlockDefinition[] | undefined,
    visibility: visibility as ProjectVisibility | undefined,
  });

  return NextResponse.json({ project });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;
  const existing = await getProjectBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (existing.ownerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't own this project" }, { status: 403 });
  }

  const deleted = await deleteProject(existing.id);
  return NextResponse.json({ deleted });
}

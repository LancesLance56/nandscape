import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasValidSeedSecret, resolveSeedOwnerId } from "@/lib/auth/seed-secret";
import { createProject, listProjectsForUser } from "@/lib/projects/projects";
import type { ProjectVisibility } from "@/lib/projects/projects";
import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { CircuitScope } from "@/types/scope";

const VALID_VISIBILITIES: ProjectVisibility[] = ["PRIVATE", "UNLISTED", "PUBLIC"];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projects = await listProjectsForUser(user.id);
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  // Two ways in: a real user's session (the normal "Save" flow), or the
  // seed script's header (see seed/seed.mjs) - resolveSeedOwnerId picks the
  // right owner for whichever one applied, and returns null if neither did.
  const ownerId = await resolveSeedOwnerId(request);
  if (!ownerId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, description, nodes, edges, scopes, blocks, tags, visibility, slug } = body as {
    name?: unknown;
    description?: unknown;
    nodes?: unknown;
    edges?: unknown;
    scopes?: unknown;
    blocks?: unknown;
    tags?: unknown;
    visibility?: unknown;
    slug?: unknown;
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
  if (tags !== undefined && (!Array.isArray(tags) || !tags.every((t) => typeof t === "string"))) {
    return NextResponse.json({ error: "`tags` must be an array of strings" }, { status: 422 });
  }
  if (visibility !== undefined && !VALID_VISIBILITIES.includes(visibility as ProjectVisibility)) {
    return NextResponse.json({ error: "`visibility` must be PRIVATE, UNLISTED, or PUBLIC" }, { status: 422 });
  }

  // A fixed slug is only honored for the seed script - it's the one caller
  // that needs a predictable, stable URL (a tutorial's circuit-embed block
  // links a specific projectSlug). A real user's own save flow never sends
  // this, so there's no user-facing "choose your own slug" feature hiding
  // behind it.
  let explicitSlug: string | undefined;
  if (slug !== undefined) {
    if (!hasValidSeedSecret(request)) {
      return NextResponse.json({ error: "`slug` can only be set by the seed script" }, { status: 422 });
    }
    if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
      return NextResponse.json({ error: "`slug` must be lowercase letters, numbers, and hyphens" }, { status: 422 });
    }
    explicitSlug = slug;
  }

  try {
    const project = await createProject(ownerId, {
      name,
      description: description as string | null | undefined,
      nodes: nodes as EditorNode[],
      edges: edges as EditorEdge[],
      scopes: scopes as CircuitScope[] | undefined,
      blocks: blocks as SubcircuitBlockDefinition[] | undefined,
      tags: tags as string[] | undefined,
      visibility: visibility as ProjectVisibility | undefined,
      slug: explicitSlug,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    // Only reachable via the explicit-slug (seed-only) path: a random slug
    // retries internally in createProject, so what escapes here is always a
    // genuine "this fixed slug is taken" - the same shape seed.mjs already
    // knows how to handle for posts/tutorials (skip, or PATCH with --force).
    if (explicitSlug && isUniqueViolation(error)) {
      return NextResponse.json({ error: `A project with slug "${explicitSlug}" already exists` }, { status: 409 });
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

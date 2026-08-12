import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getProgress, saveProgress, deleteProgress } from "@/lib/puzzles/puzzle-progress";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;
  const progress = await getProgress(user.id, slug);
  return NextResponse.json({ progress });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const { nodes, edges, solved } = body as {
    nodes?: unknown;
    edges?: unknown;
    solved?: unknown;
  };

  const progress = await saveProgress(user.id, slug, {
    nodes: Array.isArray(nodes) ? (nodes as never) : undefined,
    edges: Array.isArray(edges) ? (edges as never) : undefined,
    solved: typeof solved === "boolean" ? solved : undefined,
  });

  return NextResponse.json({ progress });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;
  const deleted = await deleteProgress(user.id, slug);
  return NextResponse.json({ deleted });
}
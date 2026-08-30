import { NextRequest, NextResponse } from "next/server";
import {
  deleteDiagramPreset,
  getDiagramPreset,
  getDiagramUsage,
  updateDiagramPreset,
} from "@/lib/diagrams/diagram-records";
import type { DiagramKind, DiagramPresetInput } from "@/lib/diagrams/diagram-records";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";

function isKind(value: unknown): value is DiagramKind {
  return value === "flowchart" || value === "graph";
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const diagram = await getDiagramPreset(slug);
  if (!diagram) {
    return NextResponse.json({ error: `No diagram with slug "${slug}"` }, { status: 404 });
  }
  return NextResponse.json({ diagram });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  let input: DiagramPresetInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input.title || !isKind(input.kind) || input.spec === undefined) {
    return NextResponse.json({ error: "`title`, `kind` (flowchart|graph), and `spec` are required" }, { status: 422 });
  }

  const diagram = await updateDiagramPreset(slug, input);
  if (!diagram) {
    return NextResponse.json({ error: `No diagram with slug "${slug}"` }, { status: 404 });
  }
  return NextResponse.json({ diagram });
}

/**
 * Delete a preset, but only once nothing renders it.
 *
 * The render path treats a missing preset as "leave the block alone", so the
 * widget silently falls back to its own default chart rather than erroring -
 * which means deleting a preset that is still in use breaks pages without
 * telling anybody. The check is on the server rather than only in the admin
 * UI's disabled button, because the button is a courtesy and this is the rule.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  const usage = await getDiagramUsage(slug);
  const inUse = usage.tutorials.length + usage.posts.length;
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `"${slug}" is still shown on ${inUse} ${inUse === 1 ? "page" : "pages"}. Remove it from those first.`,
        usage,
      },
      { status: 409 },
    );
  }

  if (!(await deleteDiagramPreset(slug))) {
    return NextResponse.json({ error: `No diagram with slug "${slug}"` }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

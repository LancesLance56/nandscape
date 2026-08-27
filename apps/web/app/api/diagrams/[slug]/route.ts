import { NextRequest, NextResponse } from "next/server";
import { getDiagramPreset, updateDiagramPreset } from "@/lib/diagrams/diagram-records";
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

import { NextRequest, NextResponse } from "next/server";
import { createDiagramPreset, listDiagramPresets } from "@/lib/diagrams/diagram-records";
import type { DiagramKind, DiagramPresetInput } from "@/lib/diagrams/diagram-records";
import { isAuthorizedAdminRequest } from "@/lib/auth/seed-secret";

function isKind(value: unknown): value is DiagramKind {
  return value === "flowchart" || value === "graph";
}

export async function GET(request: NextRequest) {
  const kindParam = request.nextUrl.searchParams.get("kind");
  const kind = isKind(kindParam) ? kindParam : undefined;
  const diagrams = await listDiagramPresets(kind);
  return NextResponse.json({ diagrams });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedAdminRequest(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let input: DiagramPresetInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input.slug || !input.title || !isKind(input.kind) || input.spec === undefined) {
    return NextResponse.json(
      { error: "`slug`, `title`, `kind` (flowchart|graph), and `spec` are required" },
      { status: 422 },
    );
  }

  try {
    const diagram = await createDiagramPreset(input);
    return NextResponse.json({ diagram }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: `A diagram with slug "${input.slug}" already exists` }, { status: 409 });
    }
    console.error("[diagrams] failed to create diagram", error);
    return NextResponse.json({ error: "Failed to create diagram" }, { status: 500 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

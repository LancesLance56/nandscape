import type { EditorNode, EditorEdge } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { CircuitScope } from "@/types/scope";

export function circuitToJsonDataUrl(
  name: string,
  nodes: EditorNode[],
  edges: EditorEdge[],
  blocks: SubcircuitBlockDefinition[] = [],
  /** Every tab, if this project has more than the one. `nodes`/`edges`
   *  above should be `scopes[0]`'s content, so a reader that predates tabs
   *  still gets a working flat circuit out of this same field. */
  scopes: CircuitScope[] = [],
): string {
  const json = JSON.stringify({ name, nodes, edges, scopes, blocks }, null, 2);
  return `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
}

export interface ParsedCircuit {
  name?: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  /** Every tab the file bundled - [] for exports from before tabs existed,
   *  in which case `nodes`/`edges` above are the only circuit there is. */
  scopes: CircuitScope[];
  /** Any non-builtin custom blocks the file bundled (see resolveBlockClosure
   *  in subcircuit-flatten.ts) - [] for older exports that predate this
   *  field, which is exactly what a plain circuit with no subcircuits needs. */
  blocks: SubcircuitBlockDefinition[];
}

export function parseCircuitJson(text: string): ParsedCircuit {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON.");
  }

  const record = data as Record<string, unknown> | null;
  if (!record || typeof record !== "object" || !Array.isArray(record.nodes) || !Array.isArray(record.edges)) {
    throw new Error('File must contain "nodes" and "edges" arrays.');
  }
  if (record.scopes !== undefined && !Array.isArray(record.scopes)) {
    throw new Error('"scopes", if present, must be an array.');
  }
  if (record.blocks !== undefined && !Array.isArray(record.blocks)) {
    throw new Error('"blocks", if present, must be an array.');
  }

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    nodes: record.nodes as EditorNode[],
    edges: record.edges as EditorEdge[],
    scopes: (record.scopes as CircuitScope[] | undefined) ?? [],
    blocks: (record.blocks as SubcircuitBlockDefinition[] | undefined) ?? [],
  };
}

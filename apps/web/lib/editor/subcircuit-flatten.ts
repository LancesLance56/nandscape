import { GateType } from "@nandscape/engine";
import type { EditorNode, EditorEdge, SubcircuitNodeData, IoNodeData } from "@/types/editor";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";

/** Looks up a block by the id a subcircuit node's `circuitId` carries.
 *  Callers decide where blocks come from (the local library, a project's
 *  embedded snapshot, or both) - this module only knows how to walk and
 *  rewrite graphs once it has one. */
export type BlockResolver = (id: string) => SubcircuitBlockDefinition | undefined;

// Mirrors live-simulate.ts's MAX_SUBCIRCUIT_DEPTH - same rationale (a
// pathological or accidentally-cyclic nesting shouldn't hang the compiler).
const MAX_DEPTH = 8;

/**
 * Walks every subcircuit node reachable from `nodes` (recursively, through
 * blocks that themselves contain blocks) and returns every distinct
 * non-builtin block referenced. Builtins are excluded because they're
 * generated from source on every deployment (see default-blocks.ts) and
 * never need to travel with a saved project. Used to compute what to embed
 * in a Project row or exported .json file so it stays self-contained
 * regardless of what's in the viewer's local block library.
 */
export function resolveBlockClosure(
  nodes: EditorNode[],
  resolve: BlockResolver,
  /** Returning true for an id means "walk into it to find what it depends
   *  on, but don't add it to the snapshot itself" - used for a project's
   *  OWN scopes/tabs when resolve is a scope-aware resolver (see
   *  scope-block.ts): a tab is already part of the project's own saved
   *  data, so it never needs to also be duplicated into `blocks`, but it
   *  might itself use a genuine external block deeper in its wiring, which
   *  still needs collecting. */
  skipCollecting?: (id: string) => boolean,
): { blocks: SubcircuitBlockDefinition[]; issues: string[] } {
  const collected = new Map<string, SubcircuitBlockDefinition>();
  const visited = new Set<string>();
  const issues: string[] = [];

  function walk(scopeNodes: EditorNode[], chain: string[]): void {
    for (const n of scopeNodes) {
      if (n.data.kind !== "subcircuit") continue;
      const scData = n.data as SubcircuitNodeData;
      const block = resolve(scData.circuitId);
      if (!block || block.builtIn) continue;
      if (chain.includes(block.id)) {
        issues.push(`"${block.name}" contains itself, directly or through another block - fix this cycle before saving.`);
        continue;
      }
      if (visited.has(block.id)) continue;
      visited.add(block.id);
      if (!skipCollecting?.(block.id)) collected.set(block.id, block);
      walk(block.nodes, [...chain, block.id]);
    }
  }

  walk(nodes, []);
  return { blocks: [...collected.values()], issues };
}

export interface FlattenOk {
  ok: true;
  nodes: EditorNode[];
  edges: EditorEdge[];
}
export interface FlattenError {
  ok: false;
  issues: string[];
}

function bufferNode(id: string, position: { x: number; y: number }): EditorNode {
  return { id, type: "gate", position, data: { kind: "gate", gateType: GateType.BUFFER } };
}

interface Boundary {
  /** The BUFFER gate id standing in for this port from inside the block body. */
  bufferId: string;
}

/**
 * Inlines every subcircuit instance into plain gates/wires, so the result
 * can be handed to compile-circuit.ts exactly like a graph that never had
 * blocks in it. Each port (block input or output) becomes one BUFFER gate:
 * the parent scope's wiring connects to one side, the block's own internal
 * wiring connects to the other. Reusing BUFFER (rather than inventing a
 * pass-through concept) means the rest of the compiler needs zero new
 * cases. Multiple instances of the same block, and blocks nested inside
 * other blocks, each get their own namespaced clone (`instanceId::...`),
 * so two placements of the same block never collide. Direct instance-to-
 * instance wiring (no gate in between) is a normal, reachable graph shape
 * in this editor, so every edge endpoint - ordinary node, this scope's own
 * port placeholder, or another instance's boundary buffer - is resolved
 * through the same lookup rather than only handling one instance at a time.
 */
export function flattenSubcircuits(
  nodes: EditorNode[],
  edges: EditorEdge[],
  resolve: BlockResolver,
): FlattenOk | FlattenError {
  const outNodes: EditorNode[] = [];
  const outEdges: EditorEdge[] = [];
  const issues: string[] = [];

  flattenScope(nodes, edges, "", new Map(), [], resolve, outNodes, outEdges, issues);

  if (issues.length > 0) return { ok: false, issues: Array.from(new Set(issues)) };
  return { ok: true, nodes: outNodes, edges: outEdges };
}

function flattenScope(
  scopeNodes: EditorNode[],
  scopeEdges: EditorEdge[],
  namespace: string,
  boundary: Map<string, Boundary>, // this scope's own port-placeholder node id -> its buffer id (empty at top level)
  chain: string[], // block ids currently being expanded, innermost last - cycle guard
  resolve: BlockResolver,
  outNodes: EditorNode[],
  outEdges: EditorEdge[],
  issues: string[],
): void {
  const localId = (id: string) => namespace + id;
  const instanceNs = (instId: string) => `${namespace}${instId}::`;

  // Phase 1: resolve every subcircuit instance's block up front (so
  // instance-to-instance edges in phase 3 can look either side up
  // regardless of which instance is processed first) and create its
  // boundary buffers.
  const instances = scopeNodes.filter((n) => n.data.kind === "subcircuit");
  const instanceBlock = new Map<string, SubcircuitBlockDefinition | undefined>();

  for (const inst of instances) {
    const scData = inst.data as SubcircuitNodeData;
    const block = resolve(scData.circuitId);

    if (!block) {
      issues.push(`"${scData.label || "A block"}" couldn't be found - it may have been deleted, or never synced to this account.`);
      instanceBlock.set(inst.id, undefined);
      continue;
    }
    if (chain.includes(block.id)) {
      issues.push(`"${block.name}" can't contain itself, directly or through another block - remove the cycle before running this circuit.`);
      instanceBlock.set(inst.id, undefined);
      continue;
    }
    if (chain.length >= MAX_DEPTH) {
      issues.push(`"${block.name}" is nested more than ${MAX_DEPTH} blocks deep - flatten part of it by hand.`);
      instanceBlock.set(inst.id, undefined);
      continue;
    }

    instanceBlock.set(inst.id, block);
    const ns = instanceNs(inst.id);
    for (const port of block.inputs) outNodes.push(bufferNode(`${ns}in__${port.name}`, inst.position));
    for (const port of block.outputs) outNodes.push(bufferNode(`${ns}out__${port.name}`, inst.position));
  }

  // Phase 2: ordinary nodes (not an instance, not this scope's own port
  // placeholder - those were replaced by the caller's boundary buffers)
  // pass through with their id namespaced.
  for (const n of scopeNodes) {
    if (instanceBlock.has(n.id)) continue;
    if (boundary.has(n.id)) continue;
    outNodes.push({ ...n, id: localId(n.id) });
  }

  // Phase 3: resolve every edge endpoint through one lookup, whether it
  // lands on an ordinary node, this scope's own port placeholder, or
  // another instance's boundary buffer.
  const resolveEndpoint = (
    nodeId: string,
    handle: string | null | undefined,
    side: "source" | "target",
  ): { id: string; handle: string } | null => {
    const b = boundary.get(nodeId);
    if (b) return { id: b.bufferId, handle: side === "source" ? "out-0" : "in-0" };

    if (instanceBlock.has(nodeId)) {
      const block = instanceBlock.get(nodeId);
      if (!block) return null; // unresolved instance - already recorded as an issue above
      const ns = instanceNs(nodeId);
      return side === "source"
        ? { id: `${ns}out__${handle}`, handle: "out-0" }
        : { id: `${ns}in__${handle}`, handle: "in-0" };
    }

    return { id: localId(nodeId), handle: handle ?? "in-0" };
  };

  for (const e of scopeEdges) {
    const src = resolveEndpoint(e.source, e.sourceHandle, "source");
    const tgt = resolveEndpoint(e.target, e.targetHandle, "target");
    if (!src || !tgt) continue; // dropped: touches an instance that failed to resolve above
    outEdges.push({ ...e, id: localId(e.id), source: src.id, sourceHandle: src.handle, target: tgt.id, targetHandle: tgt.handle });
  }

  // Phase 4: recurse into each successfully-resolved instance's own body,
  // mapping its internal Input/Output nodes onto the buffers just created.
  for (const inst of instances) {
    const block = instanceBlock.get(inst.id);
    if (!block) continue;
    const ns = instanceNs(inst.id);

    const innerBoundary = new Map<string, Boundary>();
    for (const n of block.nodes) {
      if (n.data.kind === "input") {
        innerBoundary.set(n.id, { bufferId: `${ns}in__${(n.data as IoNodeData).name}` });
      } else if (n.data.kind === "output") {
        innerBoundary.set(n.id, { bufferId: `${ns}out__${(n.data as IoNodeData).name}` });
      }
    }

    flattenScope(block.nodes, block.edges, ns, innerBoundary, [...chain, block.id], resolve, outNodes, outEdges, issues);
  }
}

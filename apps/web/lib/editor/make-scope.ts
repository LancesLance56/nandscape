import type { CircuitScope } from "@/types/scope";

function nextScopeId(): string {
  return `scope_${crypto.randomUUID().slice(0, 8)}`;
}

/** Wraps a bare nodes/edges pair as a freshly-identified scope. Used both by
 *  scopes-store.ts (new tabs) and anywhere that needs to migrate pre-tabs
 *  data (a flat project, a legacy sandbox snapshot, an embedded circuit
 *  dropped into the sandbox) into the scopes shape. */
export function makeScope(name: string, nodes: CircuitScope["nodes"] = [], edges: CircuitScope["edges"] = []): CircuitScope {
  return { id: nextScopeId(), name, nodes, edges };
}

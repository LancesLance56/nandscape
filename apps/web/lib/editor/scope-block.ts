import { useScopesStore } from "@/store/scopes-store";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import { deriveBlockPorts } from "./block-ports";
import type { CircuitScope } from "@/types/scope";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { BlockResolver } from "./subcircuit-flatten";

/**
 * Presents a scope (another tab in the same project) as a
 * SubcircuitBlockDefinition, so every consumer that already knows how to
 * resolve/render/compile a subcircuit instance (subcircuit-node.tsx,
 * subcircuit-inspector.tsx, compile-circuit.ts via subcircuit-flatten.ts,
 * live-simulate.ts) works identically whether the instance points at a
 * saved block or at a sibling tab - neither needs its own parallel code
 * path. `color`/`builtIn` are deliberately absent: scopes don't have a
 * block color, and are never eligible to be treated as a builtin (see
 * resolveBlockClosure's skipCollecting - a scope is already part of the
 * project's own saved data, it never needs snapshotting like an external
 * block does).
 */
export function scopeToBlockDefinition(scope: CircuitScope): SubcircuitBlockDefinition {
  const { inputs, outputs } = deriveBlockPorts(scope.nodes);
  return {
    id: scope.id,
    name: scope.name,
    inputs,
    outputs,
    nodes: scope.nodes,
    edges: scope.edges,
    builtIn: false,
    updatedAt: 0,
  };
}

/**
 * The single BlockResolver used everywhere a subcircuit instance's
 * circuitId needs resolving during an active editing session: check this
 * project's own tabs first, then fall back to the global block library.
 * Scope ids and block ids are both freeform strings from unrelated id
 * spaces (`scope_xxxxxxxx` vs `block_xxxxxxxx`), so there's no realistic
 * collision between the two lookups.
 */
export function createScopeAwareResolver(): BlockResolver {
  return (id) => {
    const scope = useScopesStore.getState().resolveScope(id);
    if (scope) return scopeToBlockDefinition(scope);
    return useSubcircuitBlocksStore.getState().getById(id);
  };
}

"use client";

import { useScopesStore } from "@/store/scopes-store";
import { useSubcircuitBlocksStore } from "@/store/subcircuit-blocks-store";
import { scopeToBlockDefinition } from "@/lib/editor/scope-block";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";

/**
 * The reactive (React-hook) equivalent of scope-block.ts's
 * createScopeAwareResolver, for components that need to re-render when the
 * resolved thing changes: subcircuit-node.tsx (port count/labels) and
 * subcircuit-inspector.tsx (name, color eligibility). Checks this project's
 * own tabs first, then the global block library.
 *
 * `isScope` lets callers hide block-only affordances (subcircuit-inspector's
 * color picker) for a tab-backed instance - a scope doesn't have a block
 * color the way a saved block does.
 *
 * Note: while a scope is the ACTIVE tab, its entry in useScopesStore is
 * whatever it looked like at the last tab switch, not this keystroke's
 * edits (see scopes-store.ts's commitActive) - live-updating that too would
 * only matter for the degenerate case of a scope referencing itself, which
 * is already rejected as a cycle wherever it'd actually run.
 */
export function useResolvedSubcircuit(circuitId: string): { block: SubcircuitBlockDefinition | undefined; isScope: boolean } {
  const scope = useScopesStore((s) => s.scopes.find((sc) => sc.id === circuitId));
  const globalBlock = useSubcircuitBlocksStore((s) => s.getById(circuitId));
  if (scope) return { block: scopeToBlockDefinition(scope), isScope: true };
  return { block: globalBlock, isScope: false };
}

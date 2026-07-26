import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorNode, EditorEdge } from "@/types/editor";

export interface CustomCircuit {
  id: string;
  name: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  updatedAt: number;
}

export type CircuitScope = "sandbox" | `puzzle:${string}`;

export function scopeForPuzzle(puzzleSlug: string | null): CircuitScope {
  return puzzleSlug ? (`puzzle:${puzzleSlug}` as CircuitScope) : "sandbox";
}

export interface CustomCircuitsState {
  byScope: Record<string, CustomCircuit[]>;
  list: (scope: CircuitScope) => CustomCircuit[];
  save: (scope: CircuitScope, name: string, nodes: EditorNode[], edges: EditorEdge[]) => string;
  rename: (scope: CircuitScope, id: string, name: string) => void;
  remove: (scope: CircuitScope, id: string) => void;
}

export const useCustomCircuitsStore = create<CustomCircuitsState>()(
  persist(
    (set, get) => ({
      byScope: {},

      list: (scope) => get().byScope[scope] ?? [],

      save: (scope, name, nodes, edges) => {
        const id = `custom_${crypto.randomUUID().slice(0, 8)}`;
        set((state) => ({
          byScope: {
            ...state.byScope,
            [scope]: [...(state.byScope[scope] ?? []), { id, name, nodes, edges, updatedAt: Date.now() }],
          },
        }));
        return id;
      },

      rename: (scope, id, name) =>
        set((state) => ({
          byScope: {
            ...state.byScope,
            [scope]: (state.byScope[scope] ?? []).map((c) => (c.id === id ? { ...c, name } : c)),
          },
        })),

      remove: (scope, id) =>
        set((state) => ({
          byScope: {
            ...state.byScope,
            [scope]: (state.byScope[scope] ?? []).filter((c) => c.id !== id),
          },
        })),
    }),
    {
      name: "nandscape-custom-circuits",
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const old = persisted as { circuits?: CustomCircuit[] } | undefined;
          return { byScope: old?.circuits?.length ? { sandbox: old.circuits } : {} };
        }
        return persisted as CustomCircuitsState;
      },
    },
  ),
);
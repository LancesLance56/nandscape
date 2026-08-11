import { create } from "zustand";
import { persist } from "zustand/middleware";
import { makeScope } from "@/lib/editor/make-scope";
import type { CircuitScope } from "@/types/scope";
import type { EditorNode, EditorEdge } from "@/types/editor";

export interface SandboxProgressState {
  scopes: CircuitScope[];
  activeScopeId: string;
  hasSavedProgress: boolean;
  save: (scopes: CircuitScope[], activeScopeId: string) => void;
  clear: () => void;
}

interface LegacyV1State {
  nodes?: EditorNode[];
  edges?: EditorEdge[];
  hasSavedProgress?: boolean;
}

export const useSandboxProgressStore = create<SandboxProgressState>()(
  persist(
    (set) => ({
      scopes: [],
      activeScopeId: "",
      hasSavedProgress: false,
      save: (scopes, activeScopeId) => set({ scopes, activeScopeId, hasSavedProgress: true }),
      clear: () => set({ scopes: [], activeScopeId: "", hasSavedProgress: false }),
    }),
    {
      name: "nandscape-sandbox-progress",
      version: 2,
      // v1 stored a single flat nodes/edges pair (pre-tabs). Wrap it as one
      // "Main" scope so existing sandbox users don't lose their circuit.
      migrate: (persisted, version) => {
        if (version < 2) {
          const old = persisted as LegacyV1State | undefined;
          if (!old?.hasSavedProgress) return { scopes: [], activeScopeId: "", hasSavedProgress: false };
          const scope = makeScope("Main", old.nodes ?? [], old.edges ?? []);
          return { scopes: [scope], activeScopeId: scope.id, hasSavedProgress: true };
        }
        return persisted as SandboxProgressState;
      },
    },
  ),
);

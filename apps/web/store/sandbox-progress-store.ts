import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorNode, EditorEdge } from "@/types/editor";

export interface SandboxProgressState {
  nodes: EditorNode[];
  edges: EditorEdge[];
  hasSavedProgress: boolean;
  save: (nodes: EditorNode[], edges: EditorEdge[]) => void;
  clear: () => void;
}

export const useSandboxProgressStore = create<SandboxProgressState>()(
  persist(
    (set) => ({
      nodes: [],
      edges: [],
      hasSavedProgress: false,
      save: (nodes, edges) => set({ nodes, edges, hasSavedProgress: true }),
      clear: () => set({ nodes: [], edges: [], hasSavedProgress: false }),
    }),
    { name: "nandscape-sandbox-progress" },
  ),
);
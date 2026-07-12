import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubcircuitBlockDefinition } from "@/types/subcircuit-block";
import type { EditorNode, EditorEdge } from "@/types/editor";
import { deriveBlockPorts } from "@/lib/editor/block-ports";
import { getBuiltinSubcircuitBlocks } from "@/lib/editor/default-blocks";

export type CreateBlockResult = SubcircuitBlockDefinition | { error: string };

export interface SubcircuitBlocksState {
  customBlocks: SubcircuitBlockDefinition[];
  createFromGraph: (name: string, nodes: EditorNode[], edges: EditorEdge[]) => CreateBlockResult;
  rename: (id: string, name: string) => void;
  setColor: (id: string, color: string | undefined) => void;
  remove: (id: string) => void;
  getById: (id: string) => SubcircuitBlockDefinition | undefined;
}

function hasDuplicateNames(ports: { name: string }[]): boolean {
  const seen = new Set<string>();
  for (const p of ports) {
    if (seen.has(p.name)) return true;
    seen.add(p.name);
  }
  return false;
}

export const useSubcircuitBlocksStore = create<SubcircuitBlocksState>()(
  persist(
    (set, get) => ({
      customBlocks: [],

      createFromGraph: (name, nodes, edges) => {
        const ports = deriveBlockPorts(nodes);
        if (ports.inputs.length === 0 && ports.outputs.length === 0) {
          return { error: "A block needs at least one Input or Output node inside it." };
        }
        if (hasDuplicateNames(ports.inputs) || hasDuplicateNames(ports.outputs)) {
          return { error: "Every Input/Output node needs a unique name to become a distinct pin." };
        }

        const def: SubcircuitBlockDefinition = {
          id: `block_${crypto.randomUUID().slice(0, 8)}`,
          name,
          inputs: ports.inputs,
          outputs: ports.outputs,
          nodes,
          edges,
          builtIn: false,
          updatedAt: Date.now(),
        };
        set((state) => ({ customBlocks: [...state.customBlocks, def] }));
        return def;
      },

      rename: (id, name) =>
        set((state) => ({
          customBlocks: state.customBlocks.map((b) => (b.id === id ? { ...b, name } : b)),
        })),
      setColor: (id, color) =>
        set((state) => ({
         customBlocks: state.customBlocks.map((b) => (b.id === id ? { ...b, color } : b)),
        })),

      remove: (id) => set((state) => ({ customBlocks: state.customBlocks.filter((b) => b.id !== id) })),

      getById: (id) =>
        getBuiltinSubcircuitBlocks().find((b) => b.id === id) ?? get().customBlocks.find((b) => b.id === id),
    }),
    { name: "nandscape-subcircuit-blocks" },
  ),
);
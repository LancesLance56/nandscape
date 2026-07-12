import {create} from "zustand";
import {persist} from "zustand/middleware";
import type {EditorNode, EditorEdge} from "@/types/editor";

export interface CustomCircuit {
  id: string;
  name: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  updatedAt: number;
}

export interface CustomCircuitsState {
  circuits: CustomCircuit[];
  save: (name: string, nodes: EditorNode[], edges: EditorEdge[]) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
}

export const useCustomCircuitsStore = create<CustomCircuitsState>()(
  persist(
    (set) => ({
      circuits: [],

      save: (name, nodes, edges) => {
        const id = `custom_${crypto.randomUUID().slice(0, 8)}`;
        set((state) => ({
          circuits: [
            ...state.circuits,
            {id, name, nodes, edges, updatedAt: Date.now()},
          ],
        }));
        return id;
      },

      rename: (id, name) =>
        set((state) => ({
          circuits: state.circuits.map((c) => (c.id === id ? {...c, name} : c)),
        })),

      remove: (id) =>
        set((state) => ({circuits: state.circuits.filter((c) => c.id !== id)})),
    }),
    {name: "nandscape-custom-circuits"},
  ),
);
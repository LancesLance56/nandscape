import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EdgeRoutingStyle = "bezier" | "orthogonal" | "straight";

export interface PreferencesState {
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  edgeRouting: EdgeRoutingStyle;
  animateSignals: boolean;
  reducedMotion: boolean;

  setSnapToGrid: (value: boolean) => void;
  setGridSize: (size: number) => void;
  setShowGrid: (value: boolean) => void;
  setEdgeRouting: (style: EdgeRoutingStyle) => void;
  setAnimateSignals: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      snapToGrid: true,
      gridSize: 16,
      showGrid: true,
      edgeRouting: "bezier",
      animateSignals: true,
      reducedMotion: false,

      setSnapToGrid: (value) => set({ snapToGrid: value }),
      setGridSize: (size) => set({ gridSize: Math.max(4, size) }),
      setShowGrid: (value) => set({ showGrid: value }),
      setEdgeRouting: (style) => set({ edgeRouting: style }),
      setAnimateSignals: (value) => set({ animateSignals: value }),
      setReducedMotion: (value) => set({ reducedMotion: value }),
    }),
    { name: "nandscape-editor-preferences" },
  ),
);

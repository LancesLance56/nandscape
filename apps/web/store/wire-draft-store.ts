import { create } from "zustand";

export interface WireDraft {
  sourceNodeId: string;
  sourceHandleId: string | null;
  sourceHandleType: "source" | "target";
  waypoints: { x: number; y: number }[];
  origin: { x: number; y: number };
  cursor: { x: number; y: number } | null;
}

export interface WireDraftState {
  draft: WireDraft | null;
  start: (
    nodeId: string,
    handleId: string | null,
    handleType: "source" | "target",
    origin: { x: number; y: number },
  ) => void;
  addWaypoint: (point: { x: number; y: number }) => void;
  updateCursor: (point: { x: number; y: number }) => void;
  cancel: () => void;
  clear: () => void;
}


export const useWireDraftStore = create<WireDraftState>((set) => ({
  draft: null,

  start: (nodeId, handleId, handleType, origin) =>
    set({
      draft: { sourceNodeId: nodeId, sourceHandleId: handleId, sourceHandleType: handleType, waypoints: [], origin, cursor: origin },
    }),

  addWaypoint: (point) =>
    set((state) =>
      state.draft ? { draft: { ...state.draft, waypoints: [...state.draft.waypoints, point] } } : state,
    ),

  updateCursor: (point) =>
    set((state) => (state.draft ? { draft: { ...state.draft, cursor: point } } : state)),

  cancel: () => set({ draft: null }),
  clear: () => set({ draft: null }),
}));

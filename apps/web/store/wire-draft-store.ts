import {create} from "zustand";

export interface WireDraft {
  sourceNodeId: string;
  sourceHandleId: string | null;
  sourceHandleType: "source" | "target";
  waypoints: { x: number; y: number }[];
  origin: { x: number; y: number };
  cursor: { x: number; y: number } | null;
  snapTarget: { x: number; y: number } | null;
  radius: number;
}

export interface WireDraftState {
  draft: WireDraft | null;
  start: (
    nodeId: string,
    handleId: string | null,
    handleType: "source" | "target",
    origin: { x: number; y: number },
    radius: number
  ) => void;
  addWaypoint: (point: { x: number; y: number }) => void;
  updateCursor: (point: { x: number; y: number }) => void;
  setSnapTarget: (point: { x: number; y: number } | null) => void;
  cancel: () => void;
  clear: () => void;
}

export const useWireDraftStore = create<WireDraftState>((set) => ({
  draft: null,

  start: (nodeId, handleId, handleType, origin, r) =>
    set({
      draft: {
        sourceNodeId: nodeId,
        sourceHandleId: handleId,
        sourceHandleType: handleType,
        waypoints: [],
        origin,
        cursor: origin,
        snapTarget: null,
        radius: r
      },
    }),

  addWaypoint: (point) =>
    set((state) =>
      state.draft ? {draft: {...state.draft, waypoints: [...state.draft.waypoints, point]}} : state,
    ),

  updateCursor: (point) =>
    set((state) => (state.draft ? {draft: {...state.draft, cursor: point}} : state)),

  setSnapTarget: (point) =>
    set((state) => (state.draft ? {draft: {...state.draft, snapTarget: point}} : state)),

  cancel: () => set({draft: null}),
  clear: () => set({draft: null}),
}));
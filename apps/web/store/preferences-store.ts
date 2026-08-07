import {create} from "zustand";
import {persist} from "zustand/middleware";

export type EdgeRoutingStyle = "bezier" | "smoothstep" | "straight";

export interface PreferencesState {
  snapToGrid: boolean;
  snapGridSize: number;
  visualGridSize: number;
  showGrid: boolean;
  edgeRouting: EdgeRoutingStyle;
  edgeMinLength: number;
  edgeCornerRadius: number;
  showGateLabels: boolean;
  animateSignals: boolean;
  reducedMotion: boolean;
  gateNodeTopMargin: number;
  gateNodePortSpacing: number;
  gateNodeMinHeight: number;
  gateNodeMinWidth: number;
  gateNodeMaxWidth: number;
  gateCharWidth: number;
  gateShapesFillOpacity: number;
  gateShapesBubbleRadius: number;
  gateShapesBubbleGap: number;

  setSnapToGrid: (value: boolean) => void;
  setSnapGridSize: (size: number) => void;
  setVisualGridSize: (size: number) => void;
  setShowGrid: (value: boolean) => void;
  setEdgeRouting: (style: EdgeRoutingStyle) => void;
  setEdgeMinLength: (length: number) => void;
  setEdgeCornerRadius: (radius: number) => void;
  setShowGateLabels: (value: boolean) => void;
  setAnimateSignals: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setGateNodeTopMargin: (margin: number) => void;
  setGateNodePortSpacing: (spacing: number) => void;
  setGateNodeMinHeight: (height: number) => void;
  setGateNodeMinWidth: (width: number) => void;
  setGateNodeMaxWidth: (width: number) => void;
  setGateCharWidth: (width: number) => void;
  setGateShapesFillOpacity: (opacity: number) => void;
  setGateShapesBubbleRadius: (radius: number) => void;
  setGateShapesBubbleGap: (gap: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      snapToGrid: true,
      snapGridSize: 10,
      visualGridSize: 50,
      showGrid: true,
      edgeRouting: "smoothstep",
      edgeMinLength: 8,
      edgeCornerRadius: 2,
      showGateLabels: true,
      animateSignals: true,
      reducedMotion: false,
      gateNodeTopMargin: 10,
      gateNodePortSpacing: 20,
      gateNodeMinHeight: 35,
      gateNodeMinWidth: 96,
      gateNodeMaxWidth: 220,
      gateCharWidth: 7.2,
      gateShapesFillOpacity: 1.0,
      gateShapesBubbleRadius: 4,
      gateShapesBubbleGap: 2,

      setSnapToGrid: (value) => set({snapToGrid: value}),
      setSnapGridSize: (size) => set({snapGridSize: Math.max(4, size)}),
      setVisualGridSize: (size) => set({visualGridSize: Math.max(4, size)}),
      setShowGrid: (value) => set({showGrid: value}),
      setEdgeRouting: (style) => set({edgeRouting: style}),
      setEdgeMinLength: (length) => set({edgeMinLength: Math.max(0, length)}),
      setEdgeCornerRadius: (radius) => set({edgeCornerRadius: Math.max(0, radius)}),
      setShowGateLabels: (value) => set({showGateLabels: value}),
      setAnimateSignals: (value) => set({animateSignals: value}),
      setReducedMotion: (value) => set({reducedMotion: value}),
      setGateNodeTopMargin: (margin) => set({gateNodeTopMargin: Math.max(4, margin)}),
      setGateNodePortSpacing: (spacing) => set({gateNodePortSpacing: Math.max(12, spacing)}),
      setGateNodeMinHeight: (height) => set({gateNodeMinHeight: Math.max(32, height)}),
      setGateNodeMinWidth: (width) => set({gateNodeMinWidth: Math.max(64, width)}),
      setGateNodeMaxWidth: (width) => set({gateNodeMaxWidth: Math.max(128, width)}),
      setGateCharWidth: (width) => set({gateCharWidth: Math.max(4, width)}),
      setGateShapesFillOpacity: (opacity) => set({gateShapesFillOpacity: opacity}),
      setGateShapesBubbleRadius: (radius) => set({gateShapesBubbleRadius: radius}),
      setGateShapesBubbleGap: (gap) => set({gateShapesBubbleGap: gap}),
    }),
    {
      name: "nandscape-editor-preferences",
      version: 2,
      migrate: (persistedState, persistedVersion) => {
        if (persistedVersion < 1) return undefined;
        return persistedState as PreferencesState;
      },
    },
  ),
);
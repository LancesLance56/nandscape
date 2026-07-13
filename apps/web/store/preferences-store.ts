import {create} from "zustand";
import {persist} from "zustand/middleware";

export type EdgeRoutingStyle = "bezier" | "smoothstep" | "straight";

export interface PreferencesState {
  snapToGrid: boolean;
  snapGridSize: number;
  visualGridSize: number;
  showGrid: boolean;
  edgeRouting: EdgeRoutingStyle;
  animateSignals: boolean;
  reducedMotion: boolean;
  gateNodeTopMargin: number;
  gateNodePortSpacing: number;
  gateNodeMinHeight: number;
  gateShapesFillOpacity: number;
  gateShapesBubbleRadius: number;
  gateShapesBubbleGap: number;

  setSnapToGrid: (value: boolean) => void;
  setSnapGridSize: (size: number) => void;
  setVisualGridSize: (size: number) => void;
  setShowGrid: (value: boolean) => void;
  setEdgeRouting: (style: EdgeRoutingStyle) => void;
  setAnimateSignals: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setGateNodeTopMargin: (margin: number) => void;
  setGateNodePortSpacing: (spacing: number) => void;
  setGateNodeMinHeight: (height: number) => void;
  setGateShapesFillOpacity: (opacity: number) => void;
  setGateShapesBubbleRadius: (radius: number) => void;
  setGateShapesBubbleGap: (gap: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      snapToGrid: true,
      snapGridSize: 10,
      visualGridSize: 32,
      showGrid: true,
      edgeRouting: "smoothstep",
      animateSignals: true,
      reducedMotion: false,
      gateNodeTopMargin: 10,
      gateNodePortSpacing: 8,
      gateNodeMinHeight: 36,
      gateShapesFillOpacity: 0.9,
      gateShapesBubbleRadius: 4,
      gateShapesBubbleGap: 2,

      setSnapToGrid: (value) => set({snapToGrid: value}),
      setSnapGridSize: (size) => set({snapGridSize: Math.max(4, size)}),
      setVisualGridSize: (size) => set({visualGridSize: Math.max(4, size)}),
      setShowGrid: (value) => set({showGrid: value}),
      setEdgeRouting: (style) => set({edgeRouting: style}),
      setAnimateSignals: (value) => set({animateSignals: value}),
      setReducedMotion: (value) => set({reducedMotion: value}),
      setGateNodeTopMargin: (margin) => set({gateNodeTopMargin: Math.max(4, margin)}),
      setGateNodePortSpacing: (spacing) => set({gateNodePortSpacing: Math.max(12, spacing)}),
      setGateNodeMinHeight: (height) => set({gateNodeMinHeight: Math.max(32, height)}),
      setGateShapesFillOpacity: (opacity) => set({gateShapesFillOpacity: opacity}),
      setGateShapesBubbleRadius: (radius) => set({gateShapesBubbleRadius: radius}),
      setGateShapesBubbleGap: (gap) => set({gateShapesBubbleGap: gap}),
    }),
    {name: "nandscape-editor-preferences"},
  ),
);
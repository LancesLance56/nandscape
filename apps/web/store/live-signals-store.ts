import {create} from "zustand";
import {SignalState} from "@nandscape/engine";

export interface LiveSignalsState {
  edgeSignals: Record<string, SignalState>;
  setEdgeSignals: (signals: Record<string, SignalState>) => void;
}

export const useLiveSignalsStore = create<LiveSignalsState>((set) => ({
  edgeSignals: {},
  setEdgeSignals: (signals) => set({edgeSignals: signals}),
}));

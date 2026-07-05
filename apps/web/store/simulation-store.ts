import { create } from "zustand";
import type { Simulator } from "@nandscape/engine";
import type { SignalState } from "@nandscape/engine";

/**
 * Owns the runtime side of a circuit: whether it's running, how fast, and
 * the last-known signal for every net (keyed by editor edge id, not engine
 */

export type SimulationStatus = "idle" | "compiling" | "running" | "paused" | "error";

export interface SimulationState {
  status: SimulationStatus;
  simulator: Simulator | null;
  /** edgeId -> resolved signal, refreshed every animation frame while running. */
  signalByEdgeId: Record<string, SignalState>;
  speed: number; // simulation time units advanced per real second
  error: string | null;

  compileAndAttach: (simulator: Simulator) => void;
  setSignals: (signals: Record<string, SignalState>) => void;
  play: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setError: (message: string | null) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  status: "idle",
  simulator: null,
  signalByEdgeId: {},
  speed: 1,
  error: null,

  compileAndAttach: (simulator) => set({ simulator, status: "paused", error: null }),

  setSignals: (signals) =>
    set((state) => ({ signalByEdgeId: { ...state.signalByEdgeId, ...signals } })),

  play: () => {
    if (!get().simulator) return;
    set({ status: "running" });
  },

  pause: () => set((state) => (state.status === "running" ? { status: "paused" } : state)),

  step: () => {
    const { simulator } = get();
    if (!simulator) return;
    simulator.step();
    set({ status: "paused" });
  },

  reset: () => {
    get().simulator?.reset();
    set({ signalByEdgeId: {}, status: "paused" });
  },

  setSpeed: (speed) => set({ speed: Math.max(0.1, speed) }),
  setError: (message) => set({ error: message, status: message ? "error" : "paused" }),
}));

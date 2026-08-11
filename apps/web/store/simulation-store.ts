import { create } from "zustand";
import {
  Simulator,
  SignalState,
  seedInputs,
  settleCombinational,
  type GateId,
  type NetId,
} from "@nandscape/engine";
import { compileEditorGraph } from "@/lib/editor/compile-circuit";
import { flattenSubcircuits } from "@/lib/editor/subcircuit-flatten";
import { createScopeAwareResolver } from "@/lib/editor/scope-block";
import { useEditorStore } from "./editor-store";
import type { BusInputNodeData, IoNodeData } from "@/types/editor";

export type SimulationStatus = "idle" | "compiling" | "running" | "error";

export interface SimulationState {
  status: SimulationStatus;
  simulator: Simulator | null;
  /** Node id -> GateId, for anything (like an input toggle) that needs to drive the running simulator directly. */
  nodeGateMap: Map<string, GateId> | null;
  /** Node id -> per-lane GateId, the Bus Input equivalent of nodeGateMap
   *  (one gate per lane instead of one gate per node),  see driveInputLane. */
  laneGateMap: Map<string, GateId[]> | null;
  /** Edge id -> NetId, so wire coloring can probe the real simulator instead of the instant preview. */
  edgeNetMap: Map<string, NetId> | null;
  signalByEdgeId: Record<string, SignalState>;
  speed: number; // simulation time units advanced per real second
  error: string | null;

  /**
   * Builds a fresh Simulator from whatever's currently in editor-store,
   * seeds every INPUT_PIN with the value the editor already shows for it
   * (see engine's seedInputs()), and lets combinational logic settle to a
   * steady state (see engine's settleCombinational()) before ever attaching
   * it,  so a freshly-compiled circuit shows correct wire colors
   * immediately instead of FLOAT/gray until each input happens to be
   * toggled by hand. Leaves status "running" immediately: simulation is
   * always live, there's no separate Play step,  any CLOCK gate in the
   * circuit starts ticking the moment it's wired up, same as combinational
   * logic updates the moment you edit it. Returns whether it succeeded.
   */
  compile: () => boolean;
  setSignals: (signals: Record<string, SignalState>) => void;
  /** Drives one input's value directly. If a session is attached but the
   *  animation-frame loop isn't driving it (compiling/error), also
   *  re-settles and refreshes signals immediately, since nothing else is
   *  advancing time to pick the change up. Uses settleCombinational rather
   *  than a time-boxed settle so this never lets a CLOCK gate in the
   *  circuit sneak in extra ticks outside of normal real-time playback. */
  driveInput: (nodeId: string, value: SignalState) => void;
  /** Lane-indexed equivalent of driveInput, for Bus Input's per-lane toggles. */
  driveInputLane: (nodeId: string, laneIndex: number, value: SignalState) => void;
  /** Advances the simulator by exactly one delta-cycle (all events at the
   *  earliest pending time), independent of whether it's currently running,
   *  matching a "step"/"tick once" control  it doesn't pause anything, it
   *  just nudges the event queue forward by one batch right now. */
  step: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setError: (message: string | null) => void;
}

function probeAll(simulator: Simulator, edgeNetMap: Map<string, NetId>): Record<string, SignalState> {
  const signals: Record<string, SignalState> = {};
  for (const [edgeId, netId] of edgeNetMap) signals[edgeId] = simulator.probeNet(netId);
  return signals;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  status: "idle",
  simulator: null,
  nodeGateMap: null,
  laneGateMap: null,
  edgeNetMap: null,
  signalByEdgeId: {},
  speed: 120,
  error: null,

  compile: () => {
    set({ status: "compiling", error: null });
    const { nodes: rawNodes, edges: rawEdges } = useEditorStore.getState();

    // Subcircuit blocks aren't part of this compiler at all (see
    // compile-circuit.ts's own comment) - inline every instance into plain
    // gates/wires first, resolving each against this project's own tabs,
    // then the global block library (see scope-block.ts).
    const flattened = flattenSubcircuits(rawNodes, rawEdges, createScopeAwareResolver());
    if (!flattened.ok) {
      set({
        status: "error",
        error: flattened.issues.join(" "),
        simulator: null,
        nodeGateMap: null,
        laneGateMap: null,
        edgeNetMap: null,
      });
      return false;
    }

    const { nodes, edges } = flattened;
    const outcome = compileEditorGraph(nodes, edges);

    if (!outcome.ok) {
      set({
        status: "error",
        error: outcome.issues.join(" "),
        simulator: null,
        nodeGateMap: null,
        laneGateMap: null,
        edgeNetMap: null,
      });
      return false;
    }

    const { circuit, topology, gateByNodeId, netByEdgeId, laneGatesByNodeId } = outcome.result;
    const simulator = new Simulator(circuit, topology);

    const initialInputs: Array<[GateId, SignalState]> = [];
    for (const node of nodes) {
      if (node.data.kind === "input") {
        const gateId = gateByNodeId.get(node.id);
        if (gateId === undefined) continue;
        initialInputs.push([gateId, (node.data as IoNodeData).value ?? SignalState.LOW]);
      } else if (node.data.kind === "bus-input") {
        const laneGates = laneGatesByNodeId.get(node.id);
        if (!laneGates) continue;
        const values = (node.data as BusInputNodeData).values;
        laneGates.forEach((gateId, i) => initialInputs.push([gateId, values[i] ?? SignalState.LOW]));
      }
    }
    seedInputs(simulator, initialInputs);
    settleCombinational(simulator);

    set({
      simulator,
      nodeGateMap: gateByNodeId,
      laneGateMap: laneGatesByNodeId,
      edgeNetMap: netByEdgeId,
      signalByEdgeId: probeAll(simulator, netByEdgeId),
      status: "running",
      error: null,
    });
    return true;
  },

  setSignals: (signals) =>
    set((state) => ({ signalByEdgeId: { ...state.signalByEdgeId, ...signals } })),

  driveInput: (nodeId, value) => {
    const { simulator, nodeGateMap, edgeNetMap, status } = get();
    if (!simulator || !nodeGateMap) return;
    const gateId = nodeGateMap.get(nodeId);
    if (gateId === undefined) return;

    simulator.setInput(gateId, value, simulator.state.currentTime);

    // While running, the next animation frame (use-engine-simulation.ts)
    // picks this up naturally. Otherwise (compiling/error) nothing else is
    // advancing time, so settle and refresh right here,  toggling an input
    // should feel instant regardless of what's driving the clock.
    if (status !== "running" && edgeNetMap) {
      settleCombinational(simulator);
      set({ signalByEdgeId: probeAll(simulator, edgeNetMap) });
    }
  },

  driveInputLane: (nodeId, laneIndex, value) => {
    const { simulator, laneGateMap, edgeNetMap, status } = get();
    if (!simulator || !laneGateMap) return;
    const gateId = laneGateMap.get(nodeId)?.[laneIndex];
    if (gateId === undefined) return;

    simulator.setInput(gateId, value, simulator.state.currentTime);

    if (status !== "running" && edgeNetMap) {
      settleCombinational(simulator);
      set({ signalByEdgeId: probeAll(simulator, edgeNetMap) });
    }
  },

  step: () => {
    const { simulator, compile } = get();
    const active = simulator ?? (compile() ? get().simulator : null);
    if (!active) return;
    active.step();
    const { edgeNetMap } = get();
    if (edgeNetMap) set({ signalByEdgeId: probeAll(active, edgeNetMap) });
  },

  reset: () => {
    // Fully drops the compiled circuit and rewinds to idle rather than just
    // rewinding its clock, so editing the graph always reflects the latest
    // wiring. The auto-compile effect (use-engine-simulation.ts) picks idle
    // back up and recompiles+reruns from scratch shortly after.
    set({
      simulator: null,
      nodeGateMap: null,
      laneGateMap: null,
      edgeNetMap: null,
      signalByEdgeId: {},
      status: "idle",
      error: null,
    });
  },

  setSpeed: (speed) => set({ speed: Math.max(0.1, speed) }),
  setError: (message) => set({ error: message, status: message ? "error" : "running" }),
}));

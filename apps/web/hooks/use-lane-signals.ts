"use client";

import { useMemo } from "react";
import { SignalState } from "@nandscape/engine";
import { useEditorStore } from "@/store/editor-store";
import { useLiveSignalsStore } from "@/store/live-signals-store";
import { useSimulationStore } from "@/store/simulation-store";

/**
 * Reads the live signal on each of a node's numbered target handles
 * (in-0..in-(count-1)) — the same signal source io-node.tsx uses for its
 * single output pin: the real engine while a session's running, otherwise
 * the always-on instant preview. Used by multi-pin display nodes (Bus
 * Output, Seven-Segment) that need one value per lane instead of just one.
 */
export function useLaneSignals(nodeId: string, count: number): SignalState[] {
  const edges = useEditorStore((s) => s.edges);
  const edgeSignals = useLiveSignalsStore((s) => s.edgeSignals);
  const engineStatus = useSimulationStore((s) => s.status);
  const engineSignalByEdge = useSimulationStore((s) => s.signalByEdgeId);
  const engineActive = engineStatus === "running";

  return useMemo(() => {
    const values: SignalState[] = [];
    for (let i = 0; i < count; i++) {
      const handle = `in-${i}`;
      const incoming = edges.find((e) => e.target === nodeId && e.targetHandle === handle);
      const previewSignal = incoming ? edgeSignals[incoming.id] : undefined;
      const engineSignal = incoming && engineActive ? engineSignalByEdge[incoming.id] : undefined;
      values.push(engineSignal ?? previewSignal ?? SignalState.FLOAT);
    }
    return values;
  }, [edges, edgeSignals, engineSignalByEdge, engineActive, nodeId, count]);
}

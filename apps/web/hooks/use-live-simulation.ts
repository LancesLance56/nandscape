"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/editor-store";
import { useLiveSignalsStore } from "@/store/live-signals-store";
import { evaluateLiveCircuit } from "@/lib/editor/live-simulate";

/**
 * Runs unconditionally, independent of simulation-store's Play/Pause state
 * — that store is reserved for the future event-driven engine run (clocks,
 * flip-flops, timing). This is the always-on combinational preview: wires
 * and I/O LEDs update the instant an input is toggled or a wire is drawn.
 */
export function useLiveSimulation(): void {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const setEdgeSignals = useLiveSignalsStore((s) => s.setEdgeSignals);

  useEffect(() => {
    setEdgeSignals(evaluateLiveCircuit(nodes, edges));
  }, [nodes, edges, setEdgeSignals]);
}

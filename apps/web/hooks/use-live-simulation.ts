"use client";

import {useEffect} from "react";
import {useEditorStore} from "@/store/editor-store";
import {useLiveSignalsStore} from "@/store/live-signals-store";
import {evaluateLiveCircuit} from "@/lib/editor/live-simulate";

export function useLiveSimulation(): void {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const setEdgeSignals = useLiveSignalsStore((s) => s.setEdgeSignals);

  useEffect(() => {
    const previous = useLiveSignalsStore.getState().edgeSignals;
    setEdgeSignals(evaluateLiveCircuit(nodes, edges, previous));
  }, [nodes, edges, setEdgeSignals]);
}
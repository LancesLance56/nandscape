"use client";

import {useEffect} from "react";
import {useEditorStore} from "@/store/editor-store";
import {useLiveSignalsStore} from "@/store/live-signals-store";
import {evaluateLiveCircuit} from "@/lib/editor/live-simulate";
import {createScopeAwareResolver} from "@/lib/editor/scope-block";

export function useLiveSimulation(): void {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const setEdgeSignals = useLiveSignalsStore((s) => s.setEdgeSignals);

  useEffect(() => {
    const previous = useLiveSignalsStore.getState().edgeSignals;
    // Resolves subcircuit instances against this project's own tabs first,
    // then the global block library - see scope-block.ts.
    setEdgeSignals(evaluateLiveCircuit(nodes, edges, previous, 0, createScopeAwareResolver()));
  }, [nodes, edges, setEdgeSignals]);
}
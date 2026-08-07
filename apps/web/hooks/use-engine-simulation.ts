"use client";

import { useEffect, useRef } from "react";
import { advanceSimulatorRealtime, type SignalState } from "@nandscape/engine";
import { useSimulationStore } from "@/store/simulation-store";
import { useEditorStore } from "@/store/editor-store";

const AUTO_COMPILE_DEBOUNCE_MS = 400;

export function useEngineSimulation(): void {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const status = useSimulationStore((s) => s.status);
  const speed = useSimulationStore((s) => s.speed);

  useEffect(() => {
    if (status !== "idle" && status !== "error") return;
    const timeout = window.setTimeout(() => {
      useSimulationStore.getState().compile();
    }, AUTO_COMPILE_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [nodes, edges, status]);

  const frameRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "running") {
      lastWallTimeRef.current = null;
      return;
    }

    const tick = (wallTime: number) => {
      const { simulator, edgeNetMap, setSignals, setError } = useSimulationStore.getState();
      if (!simulator || !edgeNetMap) return;

      if (lastWallTimeRef.current === null) lastWallTimeRef.current = wallTime;
      const elapsedMs = wallTime - lastWallTimeRef.current;
      lastWallTimeRef.current = wallTime;

      try {
        const { stopReason } = advanceSimulatorRealtime(simulator, elapsedMs, speed);
        if (stopReason === "MAX_EVENTS" || stopReason === "MAX_TIME") {
          setError(
            `Simulation hit its safety limit (${stopReason}),  this circuit likely oscillates forever without settling.`,
          );
          return;
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
        return;
      }

      const signals: Record<string, SignalState> = {};
      for (const [edgeId, netId] of edgeNetMap) {
        signals[edgeId] = simulator.probeNet(netId);
      }
      setSignals(signals);

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [status, speed]);
}

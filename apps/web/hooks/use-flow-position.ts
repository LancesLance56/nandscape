"use client";

import { useCallback } from "react";
import { useViewport } from "@xyflow/react";

export interface FlowPoint {
  x: number;
  y: number;
}

export function useScreenToFlowPosition() {
  const viewport = useViewport();

  return useCallback(
    (clientPoint: FlowPoint): FlowPoint => {
      const pane = document.querySelector(".react-flow");
      const rect = pane?.getBoundingClientRect();
      if (!rect) return clientPoint;

      return {
        x: (clientPoint.x - rect.left - viewport.x) / viewport.zoom,
        y: (clientPoint.y - rect.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport],
  );
}
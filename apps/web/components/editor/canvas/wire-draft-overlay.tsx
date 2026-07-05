"use client";

import { ViewportPortal } from "@xyflow/react";
import { useWireDraftStore } from "@/store/wire-draft-store";
import { buildOrthogonalPath, type Point } from "@/lib/editor/edge-path";

export function WireDraftOverlay() {
  const draft = useWireDraftStore((s) => s.draft);
  if (!draft) return null;

  const points: Point[] = [draft.origin, ...draft.waypoints, ...(draft.cursor ? [draft.cursor] : [])];
  const path = buildOrthogonalPath(points);

  return (
    <ViewportPortal>
      <svg style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "none" }}>
        <path d={path} fill="none" stroke="var(--copper)" strokeWidth={2} strokeDasharray="6 4" />
        <circle cx={draft.origin.x} cy={draft.origin.y} r={4} fill="var(--copper)" />
        {draft.waypoints.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={4} fill="var(--copper)" />
        ))}
      </svg>
    </ViewportPortal>
  );
}

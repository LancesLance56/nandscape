"use client";

/**
 * Everything drawn on top of the page: selection handles, connection dots, the
 * line being drawn, alignment guides, the marquee.
 *
 * Purely presentational. It takes positions and emits nothing - the canvas
 * owns every gesture - which is what keeps the interaction state machine in
 * one file instead of spread across the things it draws.
 */

import type { Line, Page, Point, Shape } from "@/lib/flowchart-editor/model";
import {
  linePoints,
  shapeBounds,
  shapePorts,
  type Guide,
  type Rect,
} from "@/lib/flowchart-editor/geometry";
import { PRIMARY_PORTS } from "@/lib/flowchart-editor/symbols";
import type { LineDraft } from "@/lib/flowchart-editor/store";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const RESIZE_HANDLES: { id: ResizeHandle; fx: number; fy: number; cursor: string }[] = [
  { id: "nw", fx: 0, fy: 0, cursor: "nwse-resize" },
  { id: "n", fx: 0.5, fy: 0, cursor: "ns-resize" },
  { id: "ne", fx: 1, fy: 0, cursor: "nesw-resize" },
  { id: "e", fx: 1, fy: 0.5, cursor: "ew-resize" },
  { id: "se", fx: 1, fy: 1, cursor: "nwse-resize" },
  { id: "s", fx: 0.5, fy: 1, cursor: "ns-resize" },
  { id: "sw", fx: 0, fy: 1, cursor: "nesw-resize" },
  { id: "w", fx: 0, fy: 0.5, cursor: "ew-resize" },
];

/** Handles keep their screen size, so they stay grabbable at any zoom. */
const HANDLE = 8;

export function SelectionFrame({
  rect,
  zoom,
  resizable,
  rotatable,
}: {
  rect: Rect;
  zoom: number;
  resizable: boolean;
  rotatable: boolean;
}) {
  const s = HANDLE / zoom;
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill="none"
        stroke="var(--fe-accent)"
        strokeWidth={1 / zoom}
        strokeDasharray={resizable ? undefined : `${4 / zoom} ${3 / zoom}`}
      />
      {rotatable && (
        <>
          <line
            x1={rect.x + rect.width / 2}
            y1={rect.y}
            x2={rect.x + rect.width / 2}
            y2={rect.y - 22 / zoom}
            stroke="var(--fe-accent)"
            strokeWidth={1 / zoom}
          />
          <circle
            data-handle="rotate"
            cx={rect.x + rect.width / 2}
            cy={rect.y - 22 / zoom}
            r={s * 0.6}
            fill="var(--fe-page)"
            stroke="var(--fe-accent)"
            strokeWidth={1.5 / zoom}
            style={{ cursor: "grab", pointerEvents: "all" }}
          />
        </>
      )}
      {resizable &&
        RESIZE_HANDLES.map((h) => (
          <rect
            key={h.id}
            data-handle={h.id}
            x={rect.x + rect.width * h.fx - s / 2}
            y={rect.y + rect.height * h.fy - s / 2}
            width={s}
            height={s}
            fill="var(--fe-page)"
            stroke="var(--fe-accent)"
            strokeWidth={1.5 / zoom}
            style={{ cursor: h.cursor, pointerEvents: "all" }}
          />
        ))}
    </g>
  );
}

/**
 * The handles that make a connector editable: a square at each end, a diamond
 * at every bend the user placed, and a hollow dot in the middle of each
 * segment. Dragging a segment dot moves that whole run; dragging a diamond
 * moves one bend; double-clicking a diamond removes it.
 */
export function LineHandles({ line, page, zoom }: { line: Line; page: Page; zoom: number }) {
  const pts = linePoints(line, page);
  const s = HANDLE / zoom;
  const mids = pts.slice(0, -1).map((p, i) => ({
    x: (p.x + pts[i + 1].x) / 2,
    y: (p.y + pts[i + 1].y) / 2,
    i,
  }));

  return (
    <g>
      {mids.map((m) => (
        <circle
          key={`seg-${m.i}`}
          data-segment={m.i}
          cx={m.x}
          cy={m.y}
          r={s * 0.42}
          fill="var(--fe-page)"
          stroke="var(--fe-accent)"
          strokeWidth={1.2 / zoom}
          style={{ cursor: "move", pointerEvents: "all" }}
        />
      ))}
      {line.waypoints.map((p, i) => (
        <rect
          key={`wp-${i}`}
          data-waypoint={i}
          x={p.x - s * 0.55}
          y={p.y - s * 0.55}
          width={s * 1.1}
          height={s * 1.1}
          transform={`rotate(45 ${p.x} ${p.y})`}
          fill="var(--fe-accent)"
          stroke="var(--fe-page)"
          strokeWidth={1.2 / zoom}
          style={{ cursor: "move", pointerEvents: "all" }}
        />
      ))}
      {(["from", "to"] as const).map((which, i) => {
        const p = i === 0 ? pts[0] : pts[pts.length - 1];
        const attached = line[which].kind === "shape";
        return (
          <rect
            key={which}
            data-endpoint={which}
            x={p.x - s / 2}
            y={p.y - s / 2}
            width={s}
            height={s}
            fill={attached ? "var(--fe-accent)" : "var(--fe-page)"}
            stroke="var(--fe-accent)"
            strokeWidth={1.5 / zoom}
            style={{ cursor: "crosshair", pointerEvents: "all" }}
          />
        );
      })}
    </g>
  );
}

/**
 * The quick-draw dots.
 *
 * SmartDraw's signature gesture: hover a shape, dots appear on its perimeter,
 * drag from one and you are drawing a connector. Shown on hover and while a
 * line is in flight, never at rest, so an idle drawing stays a drawing.
 */
export function ConnectionDots({
  shape,
  zoom,
  all,
  activePort,
}: {
  shape: Shape;
  zoom: number;
  /** Show all sixteen rather than the eight primaries. */
  all?: boolean;
  activePort?: number | null;
}) {
  const ports = shapePorts(shape);
  const indices = all ? ports.map((_, i) => i) : PRIMARY_PORTS;
  const r = 4.5 / zoom;
  return (
    <g>
      {indices.map((i) => (
        <circle
          key={i}
          data-port={i}
          data-port-shape={shape.id}
          cx={ports[i].x}
          cy={ports[i].y}
          r={activePort === i ? r * 1.6 : r}
          fill={activePort === i ? "var(--fe-accent)" : "var(--fe-dot)"}
          stroke="var(--fe-page)"
          strokeWidth={1.2 / zoom}
          style={{ cursor: "crosshair", pointerEvents: "all" }}
        />
      ))}
    </g>
  );
}

/** The line being drawn, from its origin through every bend to the cursor. */
export function DraftLine({ draft, page, zoom }: { draft: LineDraft; page: Page; zoom: number }) {
  const from =
    draft.from.kind === "free"
      ? { x: draft.from.x, y: draft.from.y }
      : resolvePortPoint(draft.from.shapeId, draft.from.port, page);
  const end = draft.snap ? draft.snap.point : draft.cursor;
  const pts: Point[] = [from, ...draft.waypoints, end];
  const d = `M${pts.map((p) => `${p.x},${p.y}`).join(" L")}`;

  return (
    <g pointerEvents="none">
      <path
        d={d}
        fill="none"
        stroke="var(--fe-accent)"
        strokeWidth={1.8 / zoom}
        strokeDasharray={draft.snap ? undefined : `${6 / zoom} ${4 / zoom}`}
      />
      <circle cx={from.x} cy={from.y} r={3.5 / zoom} fill="var(--fe-accent)" />
      {draft.waypoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3 / zoom} fill="var(--fe-accent)" />
      ))}
      <circle
        cx={end.x}
        cy={end.y}
        r={(draft.snap ? 5.5 : 3.5) / zoom}
        fill={draft.snap ? "var(--fe-accent)" : "none"}
        stroke="var(--fe-accent)"
        strokeWidth={1.6 / zoom}
      />
    </g>
  );
}

function resolvePortPoint(shapeId: string, port: number, page: Page): Point {
  const shape = page.elements.find((e) => e.id === shapeId);
  if (!shape || shape.kind !== "shape") return { x: 0, y: 0 };
  const ports = shapePorts(shape);
  return ports[port] ?? { x: shape.x, y: shape.y };
}

export function Marquee({ rect, zoom }: { rect: Rect; zoom: number }) {
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill="var(--fe-accent)"
      fillOpacity={0.08}
      stroke="var(--fe-accent)"
      strokeWidth={1 / zoom}
      strokeDasharray={`${4 / zoom} ${3 / zoom}`}
      pointerEvents="none"
    />
  );
}

export function Guides({ guides, zoom }: { guides: Guide[]; zoom: number }) {
  return (
    <g pointerEvents="none">
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <line
            key={i}
            x1={g.position}
            y1={g.from - 12}
            x2={g.position}
            y2={g.to + 12}
            stroke="var(--fe-guide)"
            strokeWidth={1 / zoom}
          />
        ) : (
          <line
            key={i}
            x1={g.from - 12}
            y1={g.position}
            x2={g.to + 12}
            y2={g.position}
            stroke="var(--fe-guide)"
            strokeWidth={1 / zoom}
          />
        ),
      )}
    </g>
  );
}

/** Bounds of every selected shape, faintly, so a multi-selection reads. */
export function SelectionOutlines({ shapes, zoom }: { shapes: Shape[]; zoom: number }) {
  return (
    <g pointerEvents="none">
      {shapes.map((s) => {
        const b = shapeBounds(s);
        return (
          <rect
            key={s.id}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            fill="none"
            stroke="var(--fe-accent)"
            strokeWidth={1 / zoom}
            strokeOpacity={0.6}
          />
        );
      })}
    </g>
  );
}

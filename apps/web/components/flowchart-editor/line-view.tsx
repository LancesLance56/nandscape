"use client";

/**
 * A connector on the page.
 *
 * The path comes straight from `linePath`, which is to say straight from the
 * points the user placed. Arrowheads are drawn as explicit geometry rather
 * than SVG markers: a marker inherits neither the line's colour nor its width
 * without a separate `<marker>` per line, and the id churn that causes is
 * worse than ten lines of trigonometry.
 */

import { memo } from "react";

import type { ArrowHead, Line, Page, Point } from "@/lib/flowchart-editor/model";
import { linePath, lineLabelAnchor, linePoints } from "@/lib/flowchart-editor/geometry";

function headPath(kind: ArrowHead, tip: Point, from: Point, size: number): { d: string; filled: boolean } | null {
  if (kind === "none") return null;
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const at = (dist: number, spread: number): Point => ({
    x: tip.x - Math.cos(angle - spread) * dist,
    y: tip.y - Math.sin(angle - spread) * dist,
  });

  switch (kind) {
    case "arrow": {
      const a = at(size, 0.42);
      const b = at(size, -0.42);
      return { d: `M${tip.x},${tip.y} L${a.x},${a.y} L${b.x},${b.y} Z`, filled: true };
    }
    case "open": {
      const a = at(size, 0.5);
      const b = at(size, -0.5);
      return { d: `M${a.x},${a.y} L${tip.x},${tip.y} L${b.x},${b.y}`, filled: false };
    }
    case "circle": {
      const r = size * 0.34;
      const c = { x: tip.x - Math.cos(angle) * r, y: tip.y - Math.sin(angle) * r };
      return { d: `M${c.x - r},${c.y} a${r},${r} 0 1 0 ${r * 2},0 a${r},${r} 0 1 0 ${-r * 2},0`, filled: true };
    }
    case "diamond": {
      const back = { x: tip.x - Math.cos(angle) * size, y: tip.y - Math.sin(angle) * size };
      const mid = { x: (tip.x + back.x) / 2, y: (tip.y + back.y) / 2 };
      const half = size * 0.3;
      const nx = -Math.sin(angle) * half;
      const ny = Math.cos(angle) * half;
      return {
        d: `M${tip.x},${tip.y} L${mid.x + nx},${mid.y + ny} L${back.x},${back.y} L${mid.x - nx},${mid.y - ny} Z`,
        filled: true,
      };
    }
    case "bar": {
      const half = size * 0.45;
      const nx = -Math.sin(angle) * half;
      const ny = Math.cos(angle) * half;
      return { d: `M${tip.x + nx},${tip.y + ny} L${tip.x - nx},${tip.y - ny}`, filled: false };
    }
    default:
      return null;
  }
}

export const LineView = memo(function LineView({
  line,
  page,
  selected,
  dim,
}: {
  line: Line;
  page: Page;
  selected: boolean;
  dim?: boolean;
}) {
  const pts = linePoints(line, page);
  if (pts.length < 2) return null;

  const d = linePath(line, page);
  const s = line.style;
  const size = Math.max(8, s.strokeWidth * 5);

  const end = headPath(s.endArrow, pts[pts.length - 1], pts[pts.length - 2], size);
  const start = headPath(s.startArrow, pts[0], pts[1], size);
  const label = line.label ? lineLabelAnchor(line, page) : null;

  return (
    <svg
      className="absolute left-0 top-0"
      width={page.width}
      height={page.height}
      style={{ zIndex: line.z, overflow: "visible", pointerEvents: "none", opacity: dim ? 0.4 : s.opacity }}
      aria-hidden
    >
      {/* A 1.5px line is not a click target. The invisible band under it is
          what makes a connector something a person can actually hit. */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(14, s.strokeWidth + 12)}
        strokeLinecap="round"
        style={{ pointerEvents: "stroke" }}
        data-element-id={line.id}
        data-element-kind="line"
      />
      {selected && (
        <path
          d={d}
          fill="none"
          stroke="var(--fe-accent)"
          strokeWidth={s.strokeWidth + 4}
          strokeOpacity={0.28}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={s.stroke}
        strokeWidth={s.strokeWidth}
        strokeDasharray={s.dash || undefined}
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
      {end && (
        <path
          d={end.d}
          fill={end.filled ? s.stroke : "none"}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          strokeLinejoin="round"
        />
      )}
      {start && (
        <path
          d={start.d}
          fill={start.filled ? s.stroke : "none"}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          strokeLinejoin="round"
        />
      )}
      {label && (
        <>
          <rect
            x={label.x - line.label.length * s.fontSize * 0.29 - 4}
            y={label.y - s.fontSize * 0.75 - 2}
            width={line.label.length * s.fontSize * 0.58 + 8}
            height={s.fontSize * 1.5 + 4}
            rx={3}
            fill="var(--fe-page)"
            stroke="none"
          />
          <text
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={s.textColor}
            fontFamily={s.fontFamily}
            fontSize={s.fontSize}
          >
            {line.label}
          </text>
        </>
      )}
    </svg>
  );
});

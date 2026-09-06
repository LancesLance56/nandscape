"use client";

/**
 * Drawing a symbol, once, for both places that need one.
 *
 * `SymbolGlyph` is the geometry alone, sized to whatever box it is given - the
 * library thumbnails, the quick-draw menu and the shape on the page are all
 * the same code, so a symbol can never look like one thing in the panel and
 * another on the canvas.
 */

import { memo } from "react";

import { cn } from "@/lib/cn";
import { fontStack, type Shape } from "@/lib/flowchart-editor/model";
import { symbolFor } from "@/lib/flowchart-editor/symbols";

export const SymbolGlyph = memo(function SymbolGlyph({
  symbol,
  width,
  height,
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 1.5,
  dash = "",
  radius = 8,
  className,
}: {
  symbol: string;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
  radius?: number;
  className?: string;
}) {
  const def = symbolFor(symbol);
  const geo = def.geometry(width, height, radius);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      // Strokes sit on the geometry's edge, so half of one hangs outside the
      // box. Without this the outline is shaved on every side.
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <path
        d={geo.outline}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash || undefined}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {geo.details?.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash || undefined}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
});

/** A library tile: the symbol drawn to fit, with its name as the tooltip. */
export function SymbolTile({
  symbol,
  selected,
  onPick,
  onDragStart,
  size = 44,
}: {
  symbol: string;
  selected?: boolean;
  onPick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  size?: number;
}) {
  const def = symbolFor(symbol);
  const ratio = def.defaultSize.width / def.defaultSize.height;
  const w = ratio >= 1 ? size : size * ratio;
  const h = ratio >= 1 ? size / ratio : size;

  return (
    <button
      type="button"
      title={def.name}
      aria-label={def.name}
      aria-pressed={selected}
      draggable
      onDragStart={onDragStart}
      onClick={onPick}
      className={cn(
        "flex h-[52px] w-[58px] items-center justify-center rounded border transition-colors",
        selected
          ? "border-fe-accent bg-fe-accent-soft"
          : "border-transparent hover:border-fe-line hover:bg-fe-hover",
      )}
    >
      <SymbolGlyph
        symbol={symbol}
        width={Math.max(10, w - 6)}
        height={Math.max(10, h - 6)}
        stroke="var(--fe-symbol)"
        fill="var(--fe-symbol-fill)"
        strokeWidth={1.4}
        radius={6}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------
 * A shape on the page
 * ---------------------------------------------------------------------- */

export const ShapeView = memo(function ShapeView({
  shape,
  selected,
  dim,
}: {
  shape: Shape;
  selected: boolean;
  /** Faded because a marquee is running and this one is not in it. */
  dim?: boolean;
}) {
  const def = symbolFor(shape.symbol);
  const geo = def.geometry(shape.width, shape.height, shape.style.radius);
  const inset = def.textInset?.(shape.width, shape.height) ?? { top: 6, right: 8, bottom: 6, left: 8 };
  const s = shape.style;

  return (
    <div
      data-element-id={shape.id}
      data-element-kind="shape"
      className="absolute"
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
        zIndex: shape.z,
        opacity: dim ? 0.4 : s.opacity,
      }}
    >
      <svg
        width={shape.width}
        height={shape.height}
        viewBox={`0 0 ${shape.width} ${shape.height}`}
        className="absolute inset-0"
        style={{ overflow: "visible", filter: s.shadow ? "drop-shadow(2px 3px 3px rgba(0,0,0,0.25))" : undefined }}
        aria-hidden
      >
        <path
          d={geo.outline}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          strokeDasharray={s.dash || undefined}
          strokeLinejoin="round"
        />
        {geo.details?.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={s.stroke}
            strokeWidth={s.strokeWidth}
            strokeDasharray={s.dash || undefined}
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {shape.text && (
        <div
          className="pointer-events-none absolute flex"
          style={{
            left: inset.left,
            top: inset.top,
            right: inset.right,
            bottom: inset.bottom,
            alignItems: s.valign === "top" ? "flex-start" : s.valign === "bottom" ? "flex-end" : "center",
            justifyContent: s.align === "left" ? "flex-start" : s.align === "right" ? "flex-end" : "center",
          }}
        >
          <span
            style={{
              color: s.textColor,
              fontFamily: fontStack(s.fontFamily),
              fontSize: s.fontSize,
              fontWeight: s.bold ? 700 : 400,
              fontStyle: s.italic ? "italic" : undefined,
              textDecoration: s.underline ? "underline" : undefined,
              textAlign: s.align,
              lineHeight: 1.25,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              width: "100%",
            }}
          >
            {shape.text}
          </span>
        </div>
      )}

      {/* A stage number, when the drawing is numbered. Sits outside the
          outline so it never eats into the label's room. */}
      {shape.badge && (
        <span
          className="pointer-events-none absolute -left-2 -top-2 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
          style={{ background: s.stroke, color: s.fill === "transparent" ? "#ffffff" : s.fill }}
        >
          {shape.badge}
        </span>
      )}

      {/* There is a note behind this box. A dot is the whole affordance: it
          says "there is more here" without spending any of the box on it. */}
      {shape.note && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full"
          style={{ background: s.stroke }}
        />
      )}

      {selected && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[2px]"
          style={{ outline: "1px solid var(--fe-accent, #2b8341)", outlineOffset: 1 }}
        />
      )}
    </div>
  );
});

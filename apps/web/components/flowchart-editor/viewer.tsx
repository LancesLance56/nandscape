"use client";

/**
 * A drawing, for reading.
 *
 * Everything the old chart widget could do, done against a drawing instead of
 * a spec: play a recorded walkthrough, dim everything not adjacent to the
 * selection, open a note, show a legend, go fullscreen, download a PNG. Losing
 * any of those in the move would have quietly cost every tutorial the thing
 * that made its diagrams teach rather than decorate.
 *
 * What is *not* here is a layout engine. The drawing is drawn exactly as it
 * was saved, cropped to its own ink and scaled to the column it sits in.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Maximize2, X } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  isLine,
  isShape,
  type Doc,
  type Element,
  type Page,
  type Shape,
  type WalkStep,
} from "@/lib/flowchart-editor/model";
import { elementBounds, type Rect } from "@/lib/flowchart-editor/geometry";
import { exportPng } from "@/lib/flowchart-editor/export";
import { symbolFor } from "@/lib/flowchart-editor/symbols";
import { LineView } from "./line-view";
import { ShapeView, SymbolGlyph } from "./shape-view";
import { StepCaption, StepControls, useStepPlayer } from "@/components/content/blocks/interactive/shared/step-player";

const EMPTY: ReadonlySet<string> = new Set();
const NO_MOVES: Readonly<Record<string, { x: number; y: number }>> = {};
const NO_STEPS: readonly WalkStep[] = [];
const PAD = 24;

export interface DiagramViewerProps {
  doc: Doc;
  /** Which page. Multi-page drawings embed one page at a time. */
  pageIndex?: number;
  /** Play the recorded walkthrough, when the drawing has one. */
  walkthrough?: boolean;
  /** Clicking an element opens its note. */
  notes?: boolean;
  /** Selecting an element fades everything not touching it. */
  focus?: boolean;
  /** Let a reader nudge a box to see behind it. Nothing is saved. */
  draggable?: boolean;
  legend?: boolean;
  download?: boolean;
  fullscreen?: boolean;
  /** Cap the drawing's on-screen height. */
  maxHeight?: number;
  className?: string;
}

export function DiagramViewer({
  doc,
  pageIndex = 0,
  walkthrough = true,
  notes = true,
  focus = false,
  draggable = true,
  legend = true,
  download = true,
  fullscreen = true,
  maxHeight = 560,
  className,
}: DiagramViewerProps) {
  const page = doc.pages[Math.min(pageIndex, doc.pages.length - 1)];
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [tracing, setTracing] = useState(true);
  const [focusOn, setFocusOn] = useState(focus);

  /**
   * Boxes this reader has nudged.
   *
   * Kept here rather than written into the drawing: the drawing is what its
   * author published, and a reader moving a box to see behind it is not an
   * edit to it. Nothing is saved and a reload brings it back as drawn. Stored
   * with the page it belongs to so swapping diagrams drops the offsets rather
   * than applying one drawing's nudges to the next.
   */
  const [nudges, setNudges] = useState<{ page: Page; moves: Record<string, { x: number; y: number }> }>(
    () => ({ page, moves: {} }),
  );
  // Stable identities: both feed memos below, and `?? {}` / `?? []` would
  // hand them a fresh object every render and defeat the memo entirely.
  const moves = useMemo(
    () => (nudges.page === page ? nudges.moves : NO_MOVES),
    [nudges, page],
  );
  const hasMoved = Object.keys(moves).length > 0;

  const steps = useMemo(() => page.walkthrough ?? NO_STEPS, [page.walkthrough]);
  const player = useStepPlayer(Math.max(steps.length, 1));

  /* --- what the walkthrough is pointing at ----------------------------- */

  const { visited, active } = useMemo(() => {
    if (!tracing || steps.length === 0) return { visited: EMPTY, active: EMPTY };
    const seen = new Set<string>();
    for (let i = 0; i <= player.index && i < steps.length; i++) {
      if (steps[i].target) seen.add(steps[i].target!);
    }
    const current = steps[Math.min(player.index, steps.length - 1)];
    return { visited: seen, active: current.target ? new Set([current.target]) : EMPTY };
  }, [tracing, steps, player.index]);

  /* --- what to fade ---------------------------------------------------- */

  const dimmed = useMemo(() => {
    const hide = new Set<string>();
    // Containers and lanes are scenery. Fading one because its contents are
    // not the current step just makes the drawing look broken.
    const targets = page.elements.filter((e) => !isScenery(e)).map((e) => e.id);

    if (focusOn && selected) {
      const keep = new Set<string>([selected]);
      for (const el of page.elements) {
        if (!isLine(el)) continue;
        const a = el.from.kind === "shape" ? el.from.shapeId : null;
        const b = el.to.kind === "shape" ? el.to.shapeId : null;
        if (a === selected || b === selected || el.id === selected) {
          keep.add(el.id);
          if (a) keep.add(a);
          if (b) keep.add(b);
        }
      }
      for (const id of targets) if (!keep.has(id)) hide.add(id);
    }
    if (tracing && steps.length > 0) {
      for (const id of targets) if (!visited.has(id)) hide.add(id);
    }
    return hide;
  }, [page, focusOn, selected, tracing, steps.length, visited]);

  /* --- geometry -------------------------------------------------------- */

  const shown = useMemo((): Page => {
    if (!hasMoved) return page;
    return {
      ...page,
      elements: page.elements.map((e) =>
        isShape(e) && moves[e.id] ? { ...e, x: moves[e.id].x, y: moves[e.id].y } : e,
      ),
    };
  }, [page, moves, hasMoved]);

  const bounds = useMemo(() => contentBounds(shown), [shown]);

  const hostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(0);
  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => setHostWidth(entry.contentRect.width));
    ro.observe(node);
    setHostWidth(node.clientWidth);
    return () => ro.disconnect();
  }, [expanded]);

  const scale = useMemo(() => {
    if (!hostWidth || bounds.width <= 0) return 1;
    const byWidth = (hostWidth - PAD * 2) / bounds.width;
    const byHeight = ((expanded ? window.innerHeight * 0.72 : maxHeight) - PAD * 2) / bounds.height;
    return Math.max(0.15, Math.min(1.1, byWidth, byHeight));
  }, [hostWidth, bounds, maxHeight, expanded]);

  const selectedEl = selected ? page.elements.find((e) => e.id === selected) : undefined;
  const noteCount = page.elements.filter((e) => e.note).length;
  const legendItems = useMemo(() => (legend ? deriveLegend(page) : []), [legend, page]);

  /* --- reader drag ------------------------------------------------------ */

  const dragRef = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null);

  const onShapePointerDown = useCallback(
    (e: React.PointerEvent, shape: Shape) => {
      if (!draggable) return;
      dragRef.current = {
        id: shape.id,
        startX: e.clientX,
        startY: e.clientY,
        ox: moves[shape.id]?.x ?? shape.x,
        oy: moves[shape.id]?.y ?? shape.y,
      };
    },
    [draggable, moves],
  );

  useEffect(() => {
    if (!draggable) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setNudges((prev) => ({
        page,
        moves: {
          ...(prev.page === page ? prev.moves : {}),
          [d.id]: {
            x: Math.round(d.ox + (e.clientX - d.startX) / scale),
            y: Math.round(d.oy + (e.clientY - d.startY) / scale),
          },
        },
      }));
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggable, page, scale]);

  /* --- render ---------------------------------------------------------- */

  const surface = (
    <div
      ref={hostRef}
      className="relative w-full overflow-hidden rounded-lg border border-border bg-paper"
      style={{ height: Math.min(expanded ? window.innerHeight * 0.75 : maxHeight, bounds.height * scale + PAD * 2) }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-element-id]")) return;
        setSelected(null);
      }}
    >
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${PAD}px, ${PAD}px) scale(${scale})`,
          width: bounds.width,
          height: bounds.height,
        }}
      >
        <div
          className="absolute"
          style={{ left: -bounds.x, top: -bounds.y, width: shown.width, height: shown.height }}
        >
          {shown.elements.map((el) =>
            isShape(el) ? (
              <div
                key={el.id}
                onPointerDown={(e) => onShapePointerDown(e, el)}
                onClick={() => notes && setSelected(el.id === selected ? null : el.id)}
                className={cn(
                  "contents",
                  notes && !isScenery(el) && "cursor-pointer",
                )}
              >
                <ShapeView shape={el} selected={selected === el.id || active.has(el.id)} dim={dimmed.has(el.id)} />
              </div>
            ) : (
              <div key={el.id} onClick={() => notes && setSelected(el.id === selected ? null : el.id)} className="contents">
                <LineView line={el} page={shown} selected={selected === el.id || active.has(el.id)} dim={dimmed.has(el.id)} />
              </div>
            ),
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-center gap-1.5">
        {steps.length > 0 && walkthrough && (
          <Chip active={tracing} onClick={() => setTracing((v) => !v)}>
            {tracing ? "Tracing" : "Trace it"}
          </Chip>
        )}
        {focus && (
          <Chip active={focusOn} onClick={() => setFocusOn((v) => !v)}>
            Focus
          </Chip>
        )}
        {hasMoved && <Chip onClick={() => setNudges({ page, moves: {} })}>Reset layout</Chip>}
        <span className="ml-auto flex gap-1.5">
          {download && (
            <Chip onClick={() => exportPng(shown, doc.title)} title="Download a PNG">
              <Download className="h-3 w-3" />
            </Chip>
          )}
          {fullscreen && !expanded && (
            <Chip onClick={() => setExpanded(true)} title="Expand">
              <Maximize2 className="h-3 w-3" />
            </Chip>
          )}
          {expanded && (
            <Chip onClick={() => setExpanded(false)} title="Close">
              <X className="h-3 w-3" />
            </Chip>
          )}
        </span>
      </div>

      {legendItems.length > 0 && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-paper/85 px-2 py-1 backdrop-blur-sm">
          {legendItems.map((item) => (
            <span key={item.key} className="flex items-center gap-1.5 text-[11px] text-paper-muted">
              <SymbolGlyph
                symbol={item.symbol}
                width={16}
                height={11}
                stroke={item.stroke}
                fill={item.fill}
                strokeWidth={1.2}
                radius={3}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const body = (
    // `fe-root` for the tokens, not the chrome: ShapeView and LineView are
    // shared with the editor and paint the selection halo and a label's
    // knock-out with --fe-*. Outside that scope they resolve to nothing, which
    // renders as black boxes scattered over the diagram.
    <div className={cn("fe-root flex flex-col gap-3 bg-transparent", className)}>
      {surface}

      {steps.length > 0 && walkthrough && tracing && (
        <>
          <StepCaption text={steps[Math.min(player.index, steps.length - 1)]?.caption ?? ""} />
          <StepControls
            index={player.index}
            total={steps.length}
            playing={player.playing}
            onPlay={player.play}
            onPause={player.pause}
            onNext={player.next}
            onPrev={player.prev}
            onReset={player.reset}
            onScrub={player.setIndex}
          />
        </>
      )}

      {notes && noteCount > 0 && (
        <NotePanel
          title={selectedEl && isShape(selectedEl) ? selectedEl.text : selectedEl?.label}
          note={selectedEl?.note}
          placeholder={
            selectedEl
              ? "No note on this one."
              : `Click a box with a dot in the corner to read why it is there. ${noteCount} of them have one.`
          }
        />
      )}
    </div>
  );

  if (!expanded) return body;

  return (
    <>
      {body}
      <Fullscreen onClose={() => setExpanded(false)}>{body}</Fullscreen>
    </>
  );
}

/* -------------------------------------------------------------------------
 * Pieces
 * ---------------------------------------------------------------------- */

function Chip({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "pointer-events-auto flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold backdrop-blur-sm transition-colors",
        active
          ? "border-paper-accent bg-paper-accent text-white"
          : "border-paper-line bg-paper/85 text-paper-ink-soft hover:bg-paper-line/40",
      )}
    >
      {children}
    </button>
  );
}

function NotePanel({ title, note, placeholder }: { title?: string; note?: string; placeholder: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      {/* Fixed height plus scroll, so notes of different lengths and the
          no-selection placeholder all leave the panel the same size. */}
      <div className="h-16 overflow-y-auto">
        {note ? (
          <>
            {title && (
              <div className="mb-1 text-[11px] font-semibold text-copper-dark">{title.replace(/\n/g, " · ")}</div>
            )}
            <p className="text-xs leading-relaxed text-ink-soft">{note}</p>
          </>
        ) : (
          <p className="text-xs italic text-slate">{placeholder}</p>
        )}
      </div>
    </div>
  );
}

function Fullscreen({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------- */

/** Containers and lanes: drawn behind, never dimmed, never a note target. */
function isScenery(el: Element): boolean {
  return isShape(el) && symbolFor(el.symbol).container === true;
}

function contentBounds(page: Page): Rect {
  const rects = page.elements.map((e) => elementBounds(e, page));
  if (rects.length === 0) return { x: 0, y: 0, width: page.width, height: page.height };
  const x1 = Math.min(...rects.map((r) => r.x)) - 12;
  const y1 = Math.min(...rects.map((r) => r.y)) - 12;
  const x2 = Math.max(...rects.map((r) => r.x + r.width)) + 12;
  const y2 = Math.max(...rects.map((r) => r.y + r.height)) + 12;
  return { x: x1, y: y1, width: Math.max(1, x2 - x1), height: Math.max(1, y2 - y1) };
}

interface LegendItem {
  /** Symbol plus ink: two accents of one symbol are two entries. */
  key: string;
  label: string;
  symbol: string;
  stroke: string;
  fill: string;
}

/**
 * The legend, derived rather than authored.
 *
 * One entry per symbol actually on the page, in the order a reader meets them.
 * Authoring a legend by hand is how a legend ends up describing a shape the
 * diagram no longer contains.
 */
function deriveLegend(page: Page): LegendItem[] {
  const seen = new Map<string, LegendItem>();
  for (const el of page.elements) {
    if (!isShape(el) || isScenery(el)) continue;
    const def = symbolFor(el.symbol);
    const key = `${el.symbol}:${el.style.stroke}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      key,
      label: def.name,
      symbol: el.symbol,
      stroke: el.style.stroke,
      fill: el.style.fill,
    });
  }
  return [...seen.values()].slice(0, 6);
}

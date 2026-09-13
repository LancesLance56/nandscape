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
 * What is *not* here is a layout engine, and not a single way to move
 * anything. A published diagram is fixed: it is what its author drew, and a
 * reader dragging a box around a tutorial changes what the prose beside it is
 * pointing at. Editing happens in the editor.
 *
 * What the reader *can* move is the camera. The surface is a viewport, not a
 * scroller: drag to pan, wheel to zoom, double-click to go back to the fitted
 * view - the same gestures the editor canvas uses, so a diagram behaves the
 * same on both sides of the site. There are no zoom buttons on purpose; the
 * chrome over a diagram should be the things a mouse cannot say.
 *
 * The one thing that does change is the ink. A drawing stores literal colours,
 * which is right for the document and wrong for a dark page, so the reading
 * surface re-inks a copy - see theme-ink.ts. An export runs from the original,
 * because a downloaded diagram is a document rather than a view of one.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Maximize2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  isLine,
  isShape,
  type Doc,
  type Element,
  type Page,
  type WalkStep,
} from "@/lib/flowchart-editor/model";
import { elementBounds, type Rect } from "@/lib/flowchart-editor/geometry";
import { exportPng } from "@/lib/flowchart-editor/export";
import { symbolFor } from "@/lib/flowchart-editor/symbols";
import { darkPage } from "@/lib/flowchart-editor/theme-ink";
import { useIsDark } from "@/lib/flowchart-editor/use-dark";
import { LineView } from "./line-view";
import { ShapeView, SymbolGlyph } from "./shape-view";
import { StepControls, useStepPlayer } from "@/components/content/blocks/interactive/shared/step-player";

const EMPTY: ReadonlySet<string> = new Set();
const NO_STEPS: readonly WalkStep[] = [];
const PAD = 24;

/** How far the reader may zoom, either side of whatever the fit turned out to be. */
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

/** Pointer travel, in screen pixels, before a press counts as a pan and not a click. */
const DRAG_THRESHOLD = 3;

/**
 * How much bigger than a pure width-fit a diagram is allowed to be drawn.
 *
 * A flowchart of an algorithm is intrinsically wide - eleven boxes in a chain
 * is eleven box widths - so shrinking one until it fits an article column
 * leaves it short, and its 12px labels somewhere near illegible. Drawing it a
 * third larger and letting the reader push it sideways is the better trade,
 * and pushing is now a drag rather than a scrollbar.
 *
 * A chart that is tall rather than wide never reaches this: the height budget
 * binds first, and nothing overflows.
 */
const ZOOM_BOOST = 1.3;

/**
 * The absolute ceiling on `fit`, regardless of how much room is going spare.
 *
 * Without one, a two-box diagram alone in a wide frame would zoom to fill it
 * and read as a poster rather than a flowchart. This is the number that
 * actually governs how big a diagram whose own aspect ratio does not force it
 * smaller gets drawn - raising it is what "flowcharts as a whole, bigger"
 * means, more than either ZOOM_BOOST or maxHeight below, both of which only
 * matter once something else is already the binding constraint.
 */
const MAX_FIT = 2.1;

/** Room kept clear at the top of the frame for the walkthrough caption. */
const CAPTION_INSET = 64;

interface View {
  x: number;
  y: number;
  zoom: number;
}

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
  legend?: boolean;
  download?: boolean;
  fullscreen?: boolean;
  /** Cap the drawing's on-screen height. */
  maxHeight?: number;
  /**
   * Multiplies the inline fit's zoom ceilings (MAX_FIT, ZOOM_BOOST). Pass a
   * matching `maxHeight` too, or a height-bound chart cannot grow. The dialog
   * ignores it.
   */
  scale?: number;
  className?: string;
}

/**
 * The embedded diagram, plus the dialog it opens into.
 *
 * The two are separate `Reader` instances rather than one element rendered
 * twice: each owns its own camera, so opening the dialog gives a fresh fitted
 * view of a much larger box, and closing it leaves the article's copy exactly
 * where the reader had pushed it.
 */
export function DiagramViewer(props: DiagramViewerProps) {
  const { fullscreen = true, doc } = props;
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Reader {...props} onExpand={fullscreen ? () => setExpanded(true) : undefined} />

      {fullscreen && (
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-3 p-4 sm:max-w-[1600px]">
            <DialogHeader>
              <DialogTitle className="pr-10">{doc.title?.trim() || "Diagram"}</DialogTitle>
            </DialogHeader>
            <Reader {...props} expanded className="min-h-0 flex-1" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------
 * The reading surface
 * ---------------------------------------------------------------------- */

function Reader({
  doc,
  pageIndex = 0,
  walkthrough = true,
  notes = true,
  focus = false,
  legend = true,
  download = true,
  // Diagrams are wider than they are tall, so height is what a flowchart runs
  // out of first. Worth about a third more of it than a widget would normally
  // take - a chart that fits is a chart somebody reads. Kept in step with the
  // matching default in flowchart-widgets.tsx's readOptions().
  maxHeight = 1205,
  scale = 1,
  className,
  expanded = false,
  onExpand,
}: DiagramViewerProps & { expanded?: boolean; onExpand?: () => void }) {
  const page = doc.pages[Math.min(pageIndex, doc.pages.length - 1)];
  const [selected, setSelected] = useState<string | null>(null);
  const [tracing, setTracing] = useState(true);
  const [focusOn, setFocusOn] = useState(focus);

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

  // What gets drawn: the same drawing, re-inked for the current theme. The
  // original is kept for export, which should hand back the document rather
  // than this reader's view of it.
  const dark = useIsDark();
  const shown = useMemo(() => (dark ? darkPage(page) : page), [dark, page]);

  const bounds = useMemo(() => contentBounds(shown), [shown]);

  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) =>
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    ro.observe(node);
    setBox({ w: node.clientWidth, h: node.clientHeight });
    return () => ro.disconnect();
  }, []);

  /**
   * The zoom the drawing opens at.
   *
   * Inline this is measured against `maxHeight` rather than against the box's
   * own height, because the box's height is derived from this number - asking
   * an element how tall it is in order to decide how tall it should be is how
   * a resize loop starts. Expanded, the dialog fixes the height in CSS, so the
   * measurement is safe and the fit uses all of it.
   */
  // The walkthrough's narration rides inside the frame, under the chip row, so
  // the drawing's home view starts below it rather than behind it.
  const captioning = steps.length > 0 && walkthrough && tracing;
  const topInset = captioning ? CAPTION_INSET : 0;
  const boost = expanded ? 1 : scale;

  const fit = useMemo(() => {
    const availW = box.w - PAD * 2;
    const availH = (expanded ? box.h : maxHeight) - PAD * 2 - topInset;
    if (availW <= 0 || availH <= 0 || bounds.width <= 0 || bounds.height <= 0) return 1;
    return Math.max(
      0.15,
      Math.min(MAX_FIT * boost, (availW / bounds.width) * ZOOM_BOOST * boost, availH / bounds.height),
    );
  }, [box.w, box.h, expanded, maxHeight, topInset, boost, bounds]);

  // Short diagrams get a short frame; nobody wants 1205px of background under
  // a four-box chart. Expanded, the dialog owns the height.
  const frameHeight = expanded ? undefined : Math.min(maxHeight, bounds.height * fit + PAD * 2 + topInset);

  const home = useMemo<View>(() => {
    const h = (expanded ? box.h : (frameHeight ?? 0)) - topInset;
    return {
      zoom: fit,
      x: (box.w - bounds.width * fit) / 2 - bounds.x * fit,
      y: topInset + (h - bounds.height * fit) / 2 - bounds.y * fit,
    };
  }, [box.w, box.h, expanded, frameHeight, topInset, fit, bounds]);

  /**
   * `null` means nobody has touched the camera, which is what lets a resize
   * re-fit the drawing and a resize after a drag leave it alone.
   */
  const [view, setView] = useState<View | null>(null);
  const v = view ?? home;

  // The committed camera, for handlers that have to read it rather than be
  // re-created every time it moves.
  const vRef = useRef(v);
  useEffect(() => {
    vRef.current = v;
  });

  /* --- pan and zoom ---------------------------------------------------- */

  /**
   * Whether a bare wheel belongs to the diagram or to the page under it.
   *
   * A diagram sits in the middle of an article, and one that swallowed every
   * wheel event would be a hole the reader's scroll falls into. So a bare
   * wheel only zooms once this particular diagram has been touched - a press,
   * or a modifier-zoom - and stops again the moment the reader clicks
   * anywhere else. Ctrl/Cmd-wheel, and a trackpad pinch, which arrives as the
   * same thing, always zoom. Inside the dialog there is no page left to
   * scroll, so everything zooms.
   */
  const [engaged, setEngaged] = useState(false);
  const engagedRef = useRef(engaged);
  useEffect(() => {
    engagedRef.current = engaged;
  });

  useEffect(() => {
    if (!engaged) return;
    const off = (e: PointerEvent) => {
      if (!hostRef.current?.contains(e.target as Node)) setEngaged(false);
    };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [engaged]);

  const [panning, setPanning] = useState(false);
  // A drag that ends over a shape must not also count as a click on it.
  const draggedRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    // Chips sit inside the viewport so they stay put while it moves; pressing
    // one is not the start of a pan.
    if ((e.target as HTMLElement).closest("button, [data-chrome]")) return;
    if (e.button === 1) e.preventDefault();

    // A drag that ended off the surface never produced a click to consume the
    // flag, and a stale one would swallow the next real click.
    draggedRef.current = false;
    setEngaged(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = vRef.current;
    let moved = false;

    // Document listeners rather than pointer capture: capturing would retarget
    // the pointerup and take the element's click with it, and the click is how
    // a note opens.
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        moved = true;
        setPanning(true);
      }
      setView({ zoom: origin.zoom, x: origin.x + dx, y: origin.y + dy });
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      if (!moved) return;
      draggedRef.current = true;
      setPanning(false);
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  }, []);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      const modified = e.ctrlKey || e.metaKey;
      // The caption scrolls itself.
      if ((e.target as HTMLElement).closest("[data-chrome]")) return;
      if (!expanded && !modified && !engagedRef.current) return;
      e.preventDefault();
      if (modified) setEngaged(true);

      const r = node.getBoundingClientRect();
      const fx = e.clientX - r.left;
      const fy = e.clientY - r.top;

      // Exponential in the delta, so a mouse notch and a hundred trackpad
      // crumbs travel the same distance per unit of scroll, and clamped so one
      // very large delta cannot jump across the whole range.
      const step = Math.min(1.5, Math.max(1 / 1.5, Math.exp(-e.deltaY * 0.002)));

      // Composed against the previous camera rather than the rendered one: a
      // trackpad emits wheel events faster than React commits, and reading the
      // committed value would make every event in a flick zoom from the same
      // starting point.
      setView((prev) => {
        const cur = prev ?? vRef.current;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * step));
        if (next === cur.zoom) return prev;
        // Hold the point under the cursor still.
        const k = next / cur.zoom;
        return { zoom: next, x: fx - (fx - cur.x) * k, y: fy - (fy - cur.y) * k };
      });
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [expanded]);

  /* --- the rest -------------------------------------------------------- */

  const selectedEl = selected ? page.elements.find((e) => e.id === selected) : undefined;

  // Nothing selected, or a selection that carries no note, draws no panel at
  // all. The reserved strip that used to sit under every diagram explaining
  // that notes existed is gone: the dot ShapeView paints in the corner of a
  // box that has one already says so, and it says it on the box rather than in
  // a caption the eye has to travel to.
  const openNote = selectedEl?.note;
  const noteTitle = selectedEl && isShape(selectedEl) ? selectedEl.text : selectedEl?.label;

  const legendItems = useMemo(() => (legend ? deriveLegend(shown) : []), [legend, shown]);

  return (
    // `fe-root` for the tokens, not the chrome: ShapeView and LineView are
    // shared with the editor and paint the selection halo and a label's
    // knock-out with --fe-*. Outside that scope they resolve to nothing, which
    // renders as black boxes scattered over the diagram.
    <div className={cn("fe-root flex flex-col gap-3 bg-transparent", className)}>
      <div
        ref={hostRef}
        className={cn(
          "relative w-full overflow-hidden rounded-lg border border-border",
          expanded && "min-h-0 flex-1",
        )}
        style={{
          background: shown.background,
          height: frameHeight,
          cursor: panning ? "grabbing" : "grab",
          // Vertical drags stay the page's, so an article still scrolls under a
          // finger. Horizontal ones are the diagram's, which is the axis a
          // flowchart overflows on. In the dialog there is nothing else to
          // scroll, so the surface takes both.
          touchAction: expanded ? "none" : "pan-y",
        }}
        onPointerDown={onPointerDown}
        onClickCapture={(e) => {
          if (!draggedRef.current) return;
          draggedRef.current = false;
          e.stopPropagation();
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-element-id], [data-chrome]")) return;
          setSelected(null);
        }}
        onDoubleClick={() => setView(null)}
      >
        {/*
          `will-change: transform` only while the pointer is actually dragging.
          Left on permanently - which is how this started - it pins the drawing
          to its own compositor layer, and the compositor rasterizes that layer
          once and then scales the bitmap. Every diagram on the site was being
          drawn as a stretched image of itself rather than as vectors, which is
          the blur. Dropped at rest, the browser re-rasterizes at the zoom
          actually in effect and the strokes and 12px labels come back sharp.
          During a pan the layer buys smoothness and nobody can see detail in a
          moving diagram anyway, so it goes back on for exactly that long.
        */}
        <div
          className={cn("absolute left-0 top-0 origin-top-left", panning && "will-change-transform")}
          style={{
            transform: `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`,
            width: shown.width,
            height: shown.height,
          }}
        >
          {shown.elements.map((el) =>
            isShape(el) ? (
              <div
                key={el.id}
                onClick={() => notes && setSelected(el.id === selected ? null : el.id)}
                className={cn("contents", notes && el.note && "cursor-pointer")}
              >
                <ShapeView shape={el} selected={selected === el.id || active.has(el.id)} dim={dimmed.has(el.id)} />
              </div>
            ) : (
              <div
                key={el.id}
                onClick={() => notes && setSelected(el.id === selected ? null : el.id)}
                className="contents"
              >
                <LineView line={el} page={shown} selected={selected === el.id || active.has(el.id)} dim={dimmed.has(el.id)} />
              </div>
            ),
          )}
        </div>

        {/* Chrome is pinned to the frame, never to the drawing - a "Tracing"
            button that pans away with the chart is a button you go looking
            for. */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start gap-1.5">
          {steps.length > 0 && walkthrough && (
            <Chip active={tracing} onClick={() => setTracing((value) => !value)}>
              {tracing ? "Tracing" : "Trace it"}
            </Chip>
          )}
          {captioning && (
            <p
              data-chrome
              aria-live="polite"
              className="pointer-events-auto max-h-12 min-w-0 flex-1 basis-48 cursor-auto overflow-y-auto rounded-md border border-border bg-surface-card/95 px-2.5 py-1 text-xs leading-relaxed text-ink-soft backdrop-blur-sm"
            >
              {steps[Math.min(player.index, steps.length - 1)]?.caption ?? ""}
            </p>
          )}
          {focus && (
            <Chip active={focusOn} onClick={() => setFocusOn((value) => !value)}>
              Focus
            </Chip>
          )}
          <span className="ml-auto flex gap-1.5">
            {download && (
              <Chip onClick={() => exportPng(page, doc.title)} title="Download a PNG">
                <Download className="h-3 w-3" />
              </Chip>
            )}
            {onExpand && (
              <Chip onClick={onExpand} title="Open larger">
                <Maximize2 className="h-3 w-3" />
              </Chip>
            )}
          </span>
        </div>

        {/* The floor of the frame: an open note, and the legend under it. Both
            are chrome over the drawing rather than panels beneath it, so the
            diagram gets the whole frame and a note appears where the reader is
            already looking instead of below the thing they just clicked. */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col gap-1.5">
          {notes && openNote && (
            <div className="pointer-events-auto max-h-24 overflow-y-auto rounded-md border border-border bg-surface-card/95 px-2.5 py-1.5 backdrop-blur-sm">
              {noteTitle && (
                <div className="mb-0.5 text-[11px] font-semibold text-copper-dark">
                  {noteTitle.replace(/\n/g, " · ")}
                </div>
              )}
              <p className="text-xs leading-relaxed text-ink-soft">{openNote}</p>
            </div>
          )}

          {legendItems.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-surface-card/85 px-2 py-1 backdrop-blur-sm">
              {legendItems.map((item) => (
                <span key={item.key} className="flex items-center gap-1.5 text-[11px] text-slate">
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
      </div>

      {captioning && (
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
      )}

    </div>
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
        "pointer-events-auto flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold backdrop-blur-sm transition-colors",
        active
          ? "border-copper bg-copper text-copper-ink"
          : "border-border bg-surface-card/85 text-ink-soft hover:bg-surface-2",
      )}
    >
      {children}
    </button>
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

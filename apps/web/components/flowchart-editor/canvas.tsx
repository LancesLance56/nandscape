"use client";

/**
 * The drawing surface, and every gesture that happens on it.
 *
 * One file on purpose: selecting, moving, resizing, drawing a connector and
 * dragging one of its bends are not five features, they are five branches of
 * one pointer state machine, and splitting them across components is how an
 * editor ends up with two gestures fighting over the same mousedown.
 *
 * The thing to hold on to while reading: no code path here ever computes a
 * connector's shape. Drawing appends the point under the cursor; dragging a
 * handle edits one point. The path between points is always and only the
 * polyline the user built.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import {
  isLine,
  isShape,
  type Element,
  type Endpoint,
  fontStack,
  type Line,
  type Point,
  type Shape,
} from "@/lib/flowchart-editor/model";
import {
  alignmentGuides,
  constrainAngle,
  constrainOrthogonal,
  hitTest,
  linePoints,
  shapeAt,
  shapeBounds,
  shapePorts,
  snapToGrid,
  snapToPort,
  type Guide,
  type Rect,
} from "@/lib/flowchart-editor/geometry";
import { symbolFor } from "@/lib/flowchart-editor/symbols";
import { useEditor } from "@/lib/flowchart-editor/store";
import { LineView } from "./line-view";
import { ShapeView, SymbolGlyph } from "./shape-view";
import {
  ConnectionDots,
  DraftLine,
  Guides,
  LineHandles,
  Marquee,
  SelectionFrame,
  SelectionOutlines,
  type ResizeHandle,
} from "./overlay";

/** How close the pointer must come to a connection point for it to take. */
const PORT_SNAP = 14;
/** Movement past which a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4;

type Drag =
  | { mode: "none" }
  | { mode: "marquee"; start: Point; current: Point; additive: boolean }
  | { mode: "move"; start: Point; last: Point; moved: boolean }
  | { mode: "resize"; handle: ResizeHandle; start: Point; origin: Shape }
  | { mode: "rotate"; id: string; centre: Point; startAngle: number; origin: number }
  | { mode: "waypoint"; lineId: string; index: number }
  | { mode: "segment-pending"; lineId: string; index: number; start: Point }
  | { mode: "segment"; lineId: string; a: number; b: number; axis: "x" | "y" | "free"; start: Point; origin: Point[] }
  | { mode: "endpoint"; lineId: string; end: "from" | "to" }
  | { mode: "pan"; start: Point; origin: { x: number; y: number } };

export function Canvas() {
  const doc = useEditor((s) => s.doc);
  const pageIndex = useEditor((s) => s.pageIndex);
  const page = doc.pages[Math.min(pageIndex, doc.pages.length - 1)];
  const selection = useEditor((s) => s.selection);
  const tool = useEditor((s) => s.tool);
  const draft = useEditor((s) => s.draft);
  const editingId = useEditor((s) => s.editingId);
  const viewport = useEditor((s) => s.viewport);
  const gridSize = useEditor((s) => s.gridSize);
  const snapOn = useEditor((s) => s.snapToGrid);
  const showGrid = useEditor((s) => s.showGrid);
  const smartGuides = useEditor((s) => s.smartGuides);
  const recentSymbols = useEditor((s) => s.recentSymbols);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag>({ mode: "none" });
  const pressRef = useRef<{ start: Point; moved: boolean }>({ start: { x: 0, y: 0 }, moved: false });

  const [, forceRender] = useState(0);
  const [hoverShape, setHoverShape] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [prompt, setPrompt] = useState<{ at: Point; screen: Point } | null>(null);
  const [menu, setMenu] = useState<{ screen: Point; target: Element | null } | null>(null);

  const zoom = viewport.zoom;

  /* --- coordinates ----------------------------------------------------- */

  const toPage = useCallback(
    (clientX: number, clientY: number): Point => {
      const r = surfaceRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return {
        x: (clientX - r.left - viewport.x) / zoom,
        y: (clientY - r.top - viewport.y) / zoom,
      };
    },
    [viewport.x, viewport.y, zoom],
  );

  const toScreen = useCallback(
    (p: Point): Point => ({ x: p.x * zoom + viewport.x, y: p.y * zoom + viewport.y }),
    [viewport.x, viewport.y, zoom],
  );

  /* --- derived --------------------------------------------------------- */

  const selectedSet = useMemo(() => new Set(selection), [selection]);
  const selectedElements = useMemo(
    () => page.elements.filter((e) => selectedSet.has(e.id)),
    [page.elements, selectedSet],
  );
  const selectedShapes = selectedElements.filter(isShape);
  const singleShape = selectedShapes.length === 1 && selectedElements.length === 1 ? selectedShapes[0] : null;
  const singleLine =
    selectedElements.length === 1 && isLine(selectedElements[0]) ? (selectedElements[0] as Line) : null;

  const selectionRect = useMemo((): Rect | null => {
    if (selectedShapes.length === 0) return null;
    const rects = selectedShapes.map(shapeBounds);
    const x1 = Math.min(...rects.map((r) => r.x));
    const y1 = Math.min(...rects.map((r) => r.y));
    const x2 = Math.max(...rects.map((r) => r.x + r.width));
    const y2 = Math.max(...rects.map((r) => r.y + r.height));
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }, [selectedShapes]);

  const hoverShapeEl = hoverShape ? page.elements.find((e) => e.id === hoverShape) : null;
  const showDotsFor = hoverShapeEl && isShape(hoverShapeEl) && !editingId ? hoverShapeEl : null;

  /* --- drafting a connector -------------------------------------------- */

  const st = useEditor;

  const snapPoint = useCallback(
    (raw: Point, e: { shiftKey: boolean }, anchor?: Point): { point: Point; snap: ReturnType<typeof snapToPort> } => {
      const port = snapToPort(page, raw, PORT_SNAP / zoom);
      if (port) return { point: port.point, snap: port };
      let p = raw;
      if (e.shiftKey && anchor) {
        p = st.getState().tool.lineKind === "orthogonal" ? constrainOrthogonal(anchor, p) : constrainAngle(anchor, p);
      } else if (anchor && st.getState().tool.lineKind === "orthogonal") {
        // Orthogonal is the default flavour, so it assists without a modifier:
        // the segment being drawn holds to horizontal or vertical unless the
        // pointer clearly wants a diagonal.
        const oc = constrainOrthogonal(anchor, p);
        if (Math.min(Math.abs(p.x - anchor.x), Math.abs(p.y - anchor.y)) < 24 / zoom) p = oc;
      }
      return { point: snapToGrid(p, gridSize, snapOn && !e.shiftKey), snap: null };
    },
    [page, zoom, gridSize, snapOn, st],
  );

  const beginDraft = useCallback(
    (from: Endpoint, cursor: Point, quick: boolean) => {
      st.getState().startDraft({
        lineKind: st.getState().tool.lineKind,
        from,
        waypoints: [],
        cursor,
        snap: null,
        quick,
      });
    },
    [st],
  );

  const finishDraft = useCallback(
    (end: Endpoint) => {
      const id = st.getState().commitDraft(end);
      if (id) st.getState().resetTool();
      else st.getState().cancelDraft();
    },
    [st],
  );

  /**
   * Dragging a segment moves the whole run, which means moving the two points
   * that define it. An endpoint attached to a shape cannot move, so a bend is
   * materialised on top of it first and that is what travels - the connection
   * survives, and the segment still slides.
   *
   * None of that happens on the press. A click that never moves must leave the
   * connector exactly as it was, so the press only arms the gesture and the
   * first real movement is what edits the line.
   */
  const materialiseSegmentDrag = useCallback(
    (lineId: string, index: number, at: Point): Drag => {
      const current = st.getState().page();
      const line = current.elements.find((el) => el.id === lineId);
      if (!line || !isLine(line)) return { mode: "none" };

      const pts = linePoints(line, current);
      const a = pts[index];
      const b = pts[index + 1];
      if (!a || !b) return { mode: "none" };

      const axis: "x" | "y" | "free" =
        Math.abs(a.x - b.x) < 0.75 ? "x" : Math.abs(a.y - b.y) < 0.75 ? "y" : "free";

      if (axis === "free") {
        // A diagonal has no "perpendicular"; the useful gesture there is to add
        // a bend where the pointer is and drag that.
        const next = [...line.waypoints];
        next.splice(index, 0, at);
        st.getState().updateLines([lineId], { waypoints: next });
        return { mode: "waypoint", lineId, index };
      }

      const waypoints = [...line.waypoints];
      // Waypoint indices for pts[index] and pts[index+1]: pts[0] is the start
      // endpoint, so waypoint i lives at pts[i + 1].
      let ai = index - 1;
      let bi = index;
      if (ai < 0) {
        waypoints.unshift({ ...a });
        ai = 0;
        bi += 1;
      }
      if (bi > waypoints.length - 1) {
        waypoints.push({ ...b });
        bi = waypoints.length - 1;
      }

      st.getState().updateLines([lineId], { waypoints });
      return {
        mode: "segment",
        lineId,
        a: ai,
        b: bi,
        axis,
        start: at,
        origin: waypoints.map((p) => ({ ...p })),
      };
    },
    [st],
  );

  /* --- pointer down ---------------------------------------------------- */

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1) {
        dragRef.current = { mode: "pan", start: { x: e.clientX, y: e.clientY }, origin: { ...viewport } };
        e.preventDefault();
        return;
      }
      if (e.button === 2) return;

      setMenu(null);
      setPrompt(null);
      const raw = toPage(e.clientX, e.clientY);
      const target = e.target as HTMLElement;
      const s = st.getState();

      /* A connector already in flight owns the click. */
      if (s.draft) {
        const anchor = s.draft.waypoints.at(-1) ?? draftOrigin(s.draft, page);
        const { point, snap } = snapPoint(raw, e, anchor);
        if (snap) {
          finishDraft({ kind: "shape", shapeId: snap.shapeId, port: snap.port });
          return;
        }
        const landed = shapeAt(page, point);
        if (landed) {
          const nearest = nearestPortOf(landed, point);
          finishDraft({ kind: "shape", shapeId: landed.id, port: nearest });
          return;
        }
        s.pushWaypoint(point);
        pressRef.current = { start: point, moved: false };
        return;
      }

      /* Quick-draw: a press on one of a hovered shape's connection dots. */
      const portAttr = target.getAttribute?.("data-port");
      const portShape = target.getAttribute?.("data-port-shape");
      if (portAttr && portShape) {
        beginDraft({ kind: "shape", shapeId: portShape, port: Number(portAttr) }, raw, true);
        pressRef.current = { start: raw, moved: false };
        return;
      }

      /* Handles on the current selection. */
      const handle = target.getAttribute?.("data-handle");
      if (handle && singleShape) {
        if (handle === "rotate") {
          const centre = { x: singleShape.x + singleShape.width / 2, y: singleShape.y + singleShape.height / 2 };
          dragRef.current = {
            mode: "rotate",
            id: singleShape.id,
            centre,
            startAngle: Math.atan2(raw.y - centre.y, raw.x - centre.x),
            origin: singleShape.rotation,
          };
        } else {
          dragRef.current = { mode: "resize", handle: handle as ResizeHandle, start: raw, origin: { ...singleShape } };
        }
        return;
      }

      const wp = target.getAttribute?.("data-waypoint");
      if (wp && singleLine) {
        dragRef.current = { mode: "waypoint", lineId: singleLine.id, index: Number(wp) };
        return;
      }

      const seg = target.getAttribute?.("data-segment");
      if (seg && singleLine) {
        dragRef.current = { mode: "segment-pending", lineId: singleLine.id, index: Number(seg), start: raw };
        return;
      }

      const endpoint = target.getAttribute?.("data-endpoint");
      if (endpoint && singleLine) {
        dragRef.current = { mode: "endpoint", lineId: singleLine.id, end: endpoint as "from" | "to" };
        return;
      }

      /* Tools that place something. */
      if (s.tool.kind === "shape") {
        const def = symbolFor(s.tool.symbol);
        const at = snapToGrid(raw, gridSize, snapOn);
        const id = s.addShape(s.tool.symbol, at, def.defaultSize);
        s.select([id]);
        s.setEditing(id);
        s.resetTool();
        return;
      }

      if (s.tool.kind === "line") {
        const { point, snap } = snapPoint(raw, e);
        const from: Endpoint = snap
          ? { kind: "shape", shapeId: snap.shapeId, port: snap.port }
          : { kind: "free", x: point.x, y: point.y };
        beginDraft(from, point, false);
        pressRef.current = { start: point, moved: false };
        return;
      }

      if (s.tool.kind === "text") {
        const at = snapToGrid(raw, gridSize, snapOn);
        const id = s.addShape("rectangle", at, { width: 140, height: 44 });
        s.styleShapes([id], { fill: "transparent", stroke: "transparent" });
        s.select([id]);
        s.setEditing(id);
        s.resetTool();
        return;
      }

      if (s.tool.kind === "pan") {
        dragRef.current = { mode: "pan", start: { x: e.clientX, y: e.clientY }, origin: { ...viewport } };
        return;
      }

      /* Select. */
      const hit = hitTest(page, raw, 8 / zoom);
      if (hit) {
        const ids = hit.groupId
          ? page.elements.filter((el) => el.groupId === hit.groupId).map((el) => el.id)
          : [hit.id];
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          const next = new Set(selection);
          for (const id of ids) {
            if (next.has(id)) next.delete(id);
            else next.add(id);
          }
          s.select([...next]);
        } else if (!selectedSet.has(hit.id)) {
          s.select(ids);
        }
        dragRef.current = { mode: "move", start: raw, last: raw, moved: false };
      } else {
        if (!e.shiftKey) s.select([]);
        dragRef.current = { mode: "marquee", start: raw, current: raw, additive: e.shiftKey };
        setMarquee({ x: raw.x, y: raw.y, width: 0, height: 0 });
      }
    },
    [
      toPage, page, zoom, viewport, selection, selectedSet, singleShape, singleLine,
      snapPoint, beginDraft, finishDraft, gridSize, snapOn, st,
    ],
  );

  /* --- pointer move ---------------------------------------------------- */

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = st.getState();
      const raw = toPage(e.clientX, e.clientY);
      const d = dragRef.current;

      if (s.draft) {
        const anchor = s.draft.waypoints.at(-1) ?? draftOrigin(s.draft, s.page());
        const { point, snap } = snapPoint(raw, e, anchor);
        s.updateDraft({ cursor: point, snap });
        if (Math.hypot(point.x - pressRef.current.start.x, point.y - pressRef.current.start.y) > DRAG_THRESHOLD / zoom) {
          pressRef.current.moved = true;
        }
        return;
      }

      switch (d.mode) {
        case "none":
          return;

        case "pan": {
          s.setViewport({
            x: d.origin.x + (e.clientX - d.start.x),
            y: d.origin.y + (e.clientY - d.start.y),
          });
          return;
        }

        case "marquee": {
          const rect = {
            x: Math.min(d.start.x, raw.x),
            y: Math.min(d.start.y, raw.y),
            width: Math.abs(raw.x - d.start.x),
            height: Math.abs(raw.y - d.start.y),
          };
          dragRef.current = { ...d, current: raw };
          setMarquee(rect);
          return;
        }

        case "move": {
          const dx = raw.x - d.last.x;
          const dy = raw.y - d.last.y;
          if (!d.moved && Math.hypot(raw.x - d.start.x, raw.y - d.start.y) < DRAG_THRESHOLD / zoom) return;
          d.moved = true;

          let ox = dx;
          let oy = dy;
          const page0 = s.page();
          const moving = page0.elements.filter((el) => s.selection.includes(el.id));
          const movingShapes = moving.filter(isShape);

          if (smartGuides && movingShapes.length > 0 && !e.altKey) {
            const rects = movingShapes.map(shapeBounds);
            const box = {
              x: Math.min(...rects.map((r) => r.x)) + dx,
              y: Math.min(...rects.map((r) => r.y)) + dy,
              width: Math.max(...rects.map((r) => r.x + r.width)) - Math.min(...rects.map((r) => r.x)),
              height: Math.max(...rects.map((r) => r.y + r.height)) - Math.min(...rects.map((r) => r.y)),
            };
            const others = page0.elements
              .filter((el) => isShape(el) && !s.selection.includes(el.id))
              .map((el) => shapeBounds(el as Shape));
            const g = alignmentGuides(box, others, 6 / zoom);
            ox += g.dx;
            oy += g.dy;
            setGuides(g.guides);
          }

          s.nudge(s.selection, ox, oy);
          dragRef.current = { ...d, last: { x: raw.x, y: raw.y }, moved: true };
          return;
        }

        case "resize": {
          const o = d.origin;
          let { x, y, width, height } = o;
          const dx = raw.x - d.start.x;
          const dy = raw.y - d.start.y;
          const h = d.handle;
          if (h.includes("e")) width = o.width + dx;
          if (h.includes("s")) height = o.height + dy;
          if (h.includes("w")) {
            width = o.width - dx;
            x = o.x + dx;
          }
          if (h.includes("n")) {
            height = o.height - dy;
            y = o.y + dy;
          }
          if (e.shiftKey && h.length === 2) {
            // Corner drag with Shift keeps the aspect ratio the shape started at.
            const ratio = o.width / o.height;
            if (Math.abs(width / ratio) > Math.abs(height)) height = width / ratio;
            else width = height * ratio;
            if (h.includes("n")) y = o.y + o.height - height;
            if (h.includes("w")) x = o.x + o.width - width;
          }
          const min = 16;
          if (width < min) {
            width = min;
            if (h.includes("w")) x = o.x + o.width - min;
          }
          if (height < min) {
            height = min;
            if (h.includes("n")) y = o.y + o.height - min;
          }
          const snapped = snapToGrid({ x, y }, gridSize, snapOn && !e.altKey);
          s.updateShapes(
            [o.id],
            {
              x: Math.round(snapped.x),
              y: Math.round(snapped.y),
              width: Math.round(width),
              height: Math.round(height),
            },
            `resize:${o.id}`,
          );
          return;
        }

        case "rotate": {
          const angle = Math.atan2(raw.y - d.centre.y, raw.x - d.centre.x);
          let deg = d.origin + ((angle - d.startAngle) * 180) / Math.PI;
          if (e.shiftKey) deg = Math.round(deg / 15) * 15;
          s.updateShapes([d.id], { rotation: Math.round(deg) }, `rotate:${d.id}`);
          return;
        }

        case "segment-pending": {
          if (Math.hypot(raw.x - d.start.x, raw.y - d.start.y) < DRAG_THRESHOLD / zoom) return;
          dragRef.current = materialiseSegmentDrag(d.lineId, d.index, d.start);
          return;
        }

        case "waypoint": {
          const line = s.page().elements.find((el) => el.id === d.lineId);
          if (!line || !isLine(line)) return;
          const point = snapToGrid(raw, gridSize, snapOn && !e.altKey);
          const waypoints = [...line.waypoints];
          waypoints[d.index] = point;
          s.updateLines([d.lineId], { waypoints }, `wp:${d.lineId}:${d.index}`);
          return;
        }

        case "segment": {
          const line = s.page().elements.find((el) => el.id === d.lineId);
          if (!line || !isLine(line)) return;
          const waypoints = d.origin.map((p) => ({ ...p }));
          const delta = d.axis === "x" ? raw.x - d.start.x : raw.y - d.start.y;
          for (const i of [d.a, d.b]) {
            if (!waypoints[i]) continue;
            if (d.axis === "x") waypoints[i].x = d.origin[i].x + delta;
            else waypoints[i].y = d.origin[i].y + delta;
          }
          s.updateLines([d.lineId], { waypoints }, `seg:${d.lineId}:${d.a}`);
          return;
        }

        case "endpoint": {
          const line = s.page().elements.find((el) => el.id === d.lineId);
          if (!line || !isLine(line)) return;
          const port = snapToPort(s.page(), raw, PORT_SNAP / zoom);
          const next: Endpoint = port
            ? { kind: "shape", shapeId: port.shapeId, port: port.port }
            : { kind: "free", ...snapToGrid(raw, gridSize, snapOn && !e.altKey) };
          s.updateLines([d.lineId], { [d.end]: next } as Partial<Line>, `end:${d.lineId}:${d.end}`);
          setHoverShape(port ? port.shapeId : null);
          return;
        }
      }
    };

    const onUp = (e: PointerEvent) => {
      const s = st.getState();
      const d = dragRef.current;

      if (s.draft) {
        // A press-and-drag draws a two-point line and ends on release, the way
        // SmartDraw's line tool does. A plain click leaves the line in flight
        // so the next clicks can place bends - which is the only way to route
        // one by hand.
        if (pressRef.current.moved) {
          const end: Endpoint = s.draft.snap
            ? { kind: "shape", shapeId: s.draft.snap.shapeId, port: s.draft.snap.port }
            : { kind: "free", x: s.draft.cursor.x, y: s.draft.cursor.y };
          const landed = end.kind === "free" ? shapeAt(s.page(), s.draft.cursor) : null;
          if (landed) {
            finishDraft({ kind: "shape", shapeId: landed.id, port: nearestPortOf(landed, s.draft.cursor) });
          } else if (end.kind === "free" && s.draft.quick) {
            // SmartDraw's auto-prompt: a quick-draw that lands on empty canvas
            // offers the symbols you have been using, and wires the new one up.
            setPrompt({ at: s.draft.cursor, screen: toScreen(s.draft.cursor) });
          } else {
            finishDraft(end);
          }
        }
        dragRef.current = { mode: "none" };
        return;
      }

      if (d.mode === "marquee") {
        const rect = {
          x: Math.min(d.start.x, d.current.x),
          y: Math.min(d.start.y, d.current.y),
          width: Math.abs(d.current.x - d.start.x),
          height: Math.abs(d.current.y - d.start.y),
        };
        if (rect.width > 3 || rect.height > 3) {
          const inside = s
            .page()
            .elements.filter((el) => {
              const b = isShape(el) ? shapeBounds(el) : null;
              if (b) {
                return (
                  b.x >= rect.x && b.y >= rect.y &&
                  b.x + b.width <= rect.x + rect.width && b.y + b.height <= rect.y + rect.height
                );
              }
              return linePoints(el as Line, s.page()).every(
                (p) => p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height,
              );
            })
            .map((el) => el.id);
          s.select(d.additive ? [...new Set([...s.selection, ...inside])] : inside);
        }
        setMarquee(null);
      }

      if (d.mode === "move" && !d.moved && !e.shiftKey) {
        // A press that never moved is a click, and a click on an already
        // selected shape narrows the selection to it.
        const raw = toPage(e.clientX, e.clientY);
        const hit = hitTest(s.page(), raw, 8 / zoom);
        if (hit && s.selection.length > 1 && !hit.groupId) s.select([hit.id]);
      }

      setGuides([]);
      dragRef.current = { mode: "none" };
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [toPage, toScreen, snapPoint, finishDraft, materialiseSegmentDrag, zoom, gridSize, snapOn, smartGuides, st]);

  /* --- hover ----------------------------------------------------------- */

  const onPointerMoveSurface = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current.mode !== "none") return;
      const raw = toPage(e.clientX, e.clientY);
      const s = st.getState();
      if (s.draft) {
        const near = snapToPort(page, raw, PORT_SNAP / zoom);
        setHoverShape(near ? near.shapeId : shapeAt(page, raw)?.id ?? null);
        return;
      }
      if (s.tool.kind !== "select" && s.tool.kind !== "line") {
        setHoverShape(null);
        return;
      }
      const over = shapeAt(page, raw, 6 / zoom);
      setHoverShape(over?.id ?? null);
    },
    [toPage, page, zoom, st],
  );

  /* --- double click ---------------------------------------------------- */

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const s = st.getState();
      const raw = toPage(e.clientX, e.clientY);

      if (s.draft) {
        // The first click of the double-click already dropped a bend; take it
        // back off and end the line there.
        const last = s.draft.waypoints.at(-1);
        s.popWaypoint();
        finishDraft({ kind: "free", x: last?.x ?? raw.x, y: last?.y ?? raw.y });
        return;
      }

      const target = e.target as HTMLElement;
      const wp = target.getAttribute?.("data-waypoint");
      if (wp && singleLine) {
        const waypoints = singleLine.waypoints.filter((_, i) => i !== Number(wp));
        s.updateLines([singleLine.id], { waypoints });
        return;
      }

      const hit = hitTest(page, raw, 8 / zoom);
      if (hit) {
        s.select([hit.id]);
        s.setEditing(hit.id);
      }
    },
    [toPage, page, zoom, singleLine, finishDraft, st],
  );

  /* --- context menu ---------------------------------------------------- */

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const s = st.getState();
      if (s.draft) {
        s.cancelDraft();
        return;
      }
      const raw = toPage(e.clientX, e.clientY);
      const hit = hitTest(page, raw, 8 / zoom);
      if (hit && !s.selection.includes(hit.id)) s.select([hit.id]);
      const r = surfaceRef.current!.getBoundingClientRect();
      setMenu({ screen: { x: e.clientX - r.left, y: e.clientY - r.top }, target: hit });
    },
    [toPage, page, zoom, st],
  );

  /* --- keyboard -------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      const s = st.getState();
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === "Escape") {
        if (s.draft) s.cancelDraft();
        else if (s.tool.kind !== "select") s.setTool({ kind: "select", sticky: false });
        else s.select([]);
        setPrompt(null);
        setMenu(null);
        return;
      }

      if (s.draft) {
        if (e.key === "Enter") {
          e.preventDefault();
          finishDraft({ kind: "free", x: s.draft.cursor.x, y: s.draft.cursor.y });
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          if (s.draft.waypoints.length > 0) s.popWaypoint();
          else s.cancelDraft();
          return;
        }
      }

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        s.selectAll();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        s.copy();
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        s.cut();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        s.paste();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        s.duplicateSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) s.ungroup(s.selection);
        else s.group(s.selection);
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && s.selection.length > 0) {
        e.preventDefault();
        s.deleteElements(s.selection);
        return;
      }

      if (e.key === "Enter" && s.selection.length === 1) {
        e.preventDefault();
        s.setEditing(s.selection[0]);
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      if (arrows[e.key] && s.selection.length > 0) {
        e.preventDefault();
        s.nudge(s.selection, ...arrows[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishDraft, st]);

  /* --- opening view ----------------------------------------------------- */

  /**
   * Centre the page the first time the surface has a size.
   *
   * Once only: after that the viewport belongs to whoever is scrolling it, and
   * a canvas that re-centres itself when the window changes shape is a canvas
   * that moves your work out from under you.
   */
  const centred = useRef(false);
  useEffect(() => {
    if (centred.current) return;
    const node = surfaceRef.current;
    if (!node || node.clientWidth === 0) return;
    centred.current = true;
    const s = st.getState();
    const fitted = Math.min(
      (node.clientWidth - 80) / page.width,
      (node.clientHeight - 80) / page.height,
      1,
    );
    const next = Math.max(0.25, Math.round(fitted * 20) / 20);
    s.setViewport({
      zoom: next,
      x: Math.round((node.clientWidth - page.width * next) / 2),
      y: 24,
    });
  }, [page.width, page.height, st]);

  /* --- wheel ----------------------------------------------------------- */

  useEffect(() => {
    const node = surfaceRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      const s = st.getState();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const r = node.getBoundingClientRect();
        const focus = { x: e.clientX - r.left, y: e.clientY - r.top };
        s.zoomTo(s.viewport.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), focus);
      } else {
        e.preventDefault();
        s.setViewport({
          x: s.viewport.x - (e.shiftKey ? e.deltaY : e.deltaX),
          y: s.viewport.y - (e.shiftKey ? 0 : e.deltaY),
        });
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [st]);

  /* --- library drop ---------------------------------------------------- */

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const symbol = e.dataTransfer.getData("application/x-nandscape-symbol");
      if (!symbol) return;
      const s = st.getState();
      const at = snapToGrid(toPage(e.clientX, e.clientY), gridSize, snapOn);
      const id = s.addShape(symbol, at);
      s.select([id]);
      s.setEditing(id);
    },
    [toPage, gridSize, snapOn, st],
  );

  /* --- render ---------------------------------------------------------- */

  const cursor =
    tool.kind === "line" || draft
      ? "crosshair"
      : tool.kind === "shape" || tool.kind === "text"
        ? "copy"
        : tool.kind === "pan"
          ? "grab"
          : "default";

  return (
    <div
      ref={surfaceRef}
      data-fe-surface
      className="relative min-h-0 flex-1 overflow-hidden bg-fe-canvas"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMoveSurface}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${zoom})`,
          width: page.width,
          height: page.height,
        }}
      >
        <div
          className="absolute inset-0 shadow-[0_1px_6px_rgba(0,0,0,0.18)]"
          style={{ background: page.background }}
        />
        {showGrid && (
          <svg className="absolute inset-0" width={page.width} height={page.height} aria-hidden>
            <defs>
              <pattern id="fe-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path
                  d={`M${gridSize},0 L0,0 L0,${gridSize}`}
                  fill="none"
                  stroke="var(--fe-grid)"
                  strokeWidth={0.5}
                />
              </pattern>
            </defs>
            <rect width={page.width} height={page.height} fill="url(#fe-grid)" />
          </svg>
        )}

        {page.elements.map((el) =>
          isShape(el) ? (
            <ShapeView key={el.id} shape={el} selected={selectedSet.has(el.id)} />
          ) : (
            <LineView key={el.id} line={el} page={page} selected={selectedSet.has(el.id)} />
          ),
        )}

        {editingId && <TextEditor id={editingId} />}

        <svg
          className="pointer-events-none absolute inset-0"
          width={page.width}
          height={page.height}
          style={{ overflow: "visible", zIndex: 10000 }}
        >
          {guides.length > 0 && <Guides guides={guides} zoom={zoom} />}
          {marquee && <Marquee rect={marquee} zoom={zoom} />}

          {selectedShapes.length > 1 && <SelectionOutlines shapes={selectedShapes} zoom={zoom} />}
          {selectionRect && (
            <SelectionFrame
              rect={selectionRect}
              zoom={zoom}
              resizable={Boolean(singleShape) && !singleShape?.locked}
              rotatable={Boolean(singleShape) && !singleShape?.locked}
            />
          )}
          {singleLine && !editingId && <LineHandles line={singleLine} page={page} zoom={zoom} />}

          {showDotsFor && !draft && (
            <ConnectionDots shape={showDotsFor} zoom={zoom} activePort={null} />
          )}
          {draft && showDotsFor && (
            <ConnectionDots
              shape={showDotsFor}
              zoom={zoom}
              all
              activePort={draft.snap?.shapeId === showDotsFor.id ? draft.snap.port : null}
            />
          )}
          {draft && <DraftLine draft={draft} page={page} zoom={zoom} />}
        </svg>
      </div>

      {prompt && (
        <AutoPrompt
          at={prompt.at}
          screen={prompt.screen}
          symbols={recentSymbols}
          onPick={(symbol) => {
            const s = st.getState();
            const def = symbolFor(symbol);
            const id = s.addShape(symbol, prompt.at, def.defaultSize);
            const shape = s.page().elements.find((el) => el.id === id);
            const port = shape && isShape(shape) ? nearestPortOf(shape, prompt.at) : 0;
            finishDraft({ kind: "shape", shapeId: id, port });
            setPrompt(null);
            s.setEditing(id);
          }}
          onDismiss={() => {
            const s = st.getState();
            if (s.draft) finishDraft({ kind: "free", x: prompt.at.x, y: prompt.at.y });
            setPrompt(null);
          }}
        />
      )}

      {menu && (
        <ContextMenu
          screen={menu.screen}
          target={menu.target}
          onClose={() => setMenu(null)}
          onRerender={() => forceRender((n) => n + 1)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------- */

function draftOrigin(draft: { from: Endpoint }, page: { elements: Element[] }): Point {
  if (draft.from.kind === "free") return { x: draft.from.x, y: draft.from.y };
  const shape = page.elements.find((e) => e.id === (draft.from as { shapeId: string }).shapeId);
  if (!shape || !isShape(shape)) return { x: 0, y: 0 };
  return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
}

/** Which of a shape's sixteen connection points a landing point is nearest. */
function nearestPortOf(shape: Shape, at: Point): number {
  const list = shapePorts(shape);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < list.length; i++) {
    const d = Math.hypot(list[i].x - at.x, list[i].y - at.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/* -------------------------------------------------------------------------
 * In-place text editing
 * ---------------------------------------------------------------------- */

function TextEditor({ id }: { id: string }) {
  const page = useEditor((s) => s.doc.pages[s.pageIndex]);
  const setText = useEditor((s) => s.setText);
  const setEditing = useEditor((s) => s.setEditing);
  const ref = useRef<HTMLTextAreaElement>(null);
  const el = page.elements.find((e) => e.id === id);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  if (!el) return null;

  if (isLine(el)) {
    const pts = linePoints(el, page);
    const mid = pts[Math.floor(pts.length / 2)] ?? pts[0];
    return (
      <textarea
        ref={ref}
        value={el.label}
        onChange={(e) => setText(id, e.target.value)}
        onBlur={() => setEditing(null)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
            e.preventDefault();
            setEditing(null);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        rows={1}
        className="absolute resize-none rounded border border-fe-accent bg-fe-page px-1 text-center outline-none"
        style={{
          left: mid.x - 50,
          top: mid.y - 12,
          width: 100,
          zIndex: 20000,
          fontFamily: fontStack(el.style.fontFamily),
          fontSize: el.style.fontSize,
          color: el.style.textColor,
        }}
      />
    );
  }

  const shape = el as Shape;
  const def = symbolFor(shape.symbol);
  const inset = def.textInset?.(shape.width, shape.height) ?? { top: 6, right: 8, bottom: 6, left: 8 };
  const s = shape.style;

  return (
    <textarea
      ref={ref}
      value={shape.text}
      onChange={(e) => setText(id, e.target.value)}
      onBlur={() => setEditing(null)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          setEditing(null);
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute resize-none border border-fe-accent bg-fe-page/95 outline-none"
      style={{
        left: shape.x + inset.left,
        top: shape.y + inset.top,
        width: Math.max(24, shape.width - inset.left - inset.right),
        height: Math.max(20, shape.height - inset.top - inset.bottom),
        zIndex: 20000,
        transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
        fontFamily: fontStack(s.fontFamily),
        fontSize: s.fontSize,
        fontWeight: s.bold ? 700 : 400,
        fontStyle: s.italic ? "italic" : undefined,
        color: s.textColor,
        textAlign: s.align,
        lineHeight: 1.25,
        padding: 0,
      }}
    />
  );
}

/* -------------------------------------------------------------------------
 * Auto-prompt
 * ---------------------------------------------------------------------- */

function AutoPrompt({
  screen,
  symbols,
  onPick,
  onDismiss,
}: {
  at: Point;
  screen: Point;
  symbols: string[];
  onPick: (symbol: string) => void;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onDismiss();
    };
    const t = window.setTimeout(() => document.addEventListener("pointerdown", onDown, true), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      className="absolute z-[30000] rounded-md border border-fe-line bg-fe-panel p-1.5 shadow-xl"
      style={{ left: screen.x + 12, top: screen.y + 12 }}
    >
      <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-fe-muted">
        Add a shape here
      </p>
      <div className="grid grid-cols-3 gap-0.5">
        {symbols.slice(0, 6).map((key) => (
          <button
            key={key}
            type="button"
            title={symbolFor(key).name}
            onClick={() => onPick(key)}
            className="flex h-11 w-12 items-center justify-center rounded border border-transparent hover:border-fe-line hover:bg-fe-hover"
          >
            <SymbolGlyph
              symbol={key}
              width={30}
              height={20}
              stroke="var(--fe-symbol)"
              fill="var(--fe-symbol-fill)"
              strokeWidth={1.3}
              radius={4}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Context menu
 * ---------------------------------------------------------------------- */

function ContextMenu({
  screen,
  target,
  onClose,
}: {
  screen: Point;
  target: Element | null;
  onClose: () => void;
  onRerender: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const store = useEditor;

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const t = window.setTimeout(() => document.addEventListener("pointerdown", onDown, true), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [onClose]);

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const s = store.getState();
  const item = (label: string, fn: () => void, shortcut?: string, disabled?: boolean) => (
    <button
      key={label}
      type="button"
      disabled={disabled}
      onClick={run(fn)}
      className={cn(
        "flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-xs",
        disabled ? "text-fe-disabled" : "text-fe-ink hover:bg-fe-hover",
      )}
    >
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-[10px] text-fe-muted">{shortcut}</span>}
    </button>
  );

  return (
    <div
      ref={ref}
      className="absolute z-[30000] min-w-48 rounded-md border border-fe-line bg-fe-panel p-1 shadow-xl"
      style={{ left: screen.x, top: screen.y }}
      role="menu"
    >
      {target ? (
        <>
          {item("Cut", () => s.cut(), "Ctrl+X")}
          {item("Copy", () => s.copy(), "Ctrl+C")}
          {item("Duplicate", () => s.duplicateSelection(), "Ctrl+D")}
          {item("Delete", () => s.deleteElements(s.selection), "Del")}
          <div className="my-1 h-px bg-fe-line" />
          {item("Edit text", () => s.setEditing(target.id), "Enter")}
          <div className="my-1 h-px bg-fe-line" />
          {item("Bring to Front", () => s.order(s.selection, "front"))}
          {item("Bring Forward", () => s.order(s.selection, "forward"))}
          {item("Send Backward", () => s.order(s.selection, "backward"))}
          {item("Send to Back", () => s.order(s.selection, "back"))}
          <div className="my-1 h-px bg-fe-line" />
          {item("Group", () => s.group(s.selection), "Ctrl+G", s.selection.length < 2)}
          {item("Ungroup", () => s.ungroup(s.selection), "Ctrl+Shift+G")}
        </>
      ) : (
        <>
          {item("Paste", () => s.paste(), "Ctrl+V", s.clipboard.length === 0)}
          {item("Select All", () => s.selectAll(), "Ctrl+A")}
          <div className="my-1 h-px bg-fe-line" />
          {item(s.showGrid ? "Hide grid" : "Show grid", () => s.setGrid({ showGrid: !s.showGrid }))}
          {item(s.snapToGrid ? "Turn off snap" : "Snap to grid", () => s.setGrid({ snapToGrid: !s.snapToGrid }))}
        </>
      )}
    </div>
  );
}

"use client";

/**
 * Editor state.
 *
 * One store for the whole tool. The document is the only thing under undo;
 * selection, tool and viewport are not, because rewinding a drag should not
 * also rewind which shape you had highlighted or how far you had scrolled.
 *
 * Every mutation goes through `mutate`, which clones, applies, and pushes onto
 * the history stack with an optional coalescing tag. A drag emits one mutation
 * per pointer move and a keystroke one per character; the tag is what turns
 * those back into a single undo step.
 */

import { create } from "zustand";

import {
  DEFAULT_LINE_STYLE,
  DEFAULT_SHAPE_STYLE,
  deepClone,
  emptyDoc,
  emptyPage,
  findShape,
  isLine,
  isShape,
  newId,
  topZ,
  type Doc,
  type Element,
  type Endpoint,
  type Line,
  type LineKind,
  type LineStyle,
  type Page,
  type Point,
  type Shape,
  type ShapeStyle,
} from "./model";
import { elementBounds, shapeBounds, type Rect } from "./geometry";
import { DEFAULT_RECENT, symbolFor } from "./symbols";

export type ToolKind = "select" | "shape" | "line" | "text" | "pan";

export interface Tool {
  kind: ToolKind;
  /** Symbol to stamp, when kind is "shape". */
  symbol: string;
  /** Line flavour to draw, when kind is "line". */
  lineKind: LineKind;
  /**
   * Stay armed after one use.
   *
   * SmartDraw arms this by holding Shift while picking the tool, and Escape
   * disarms it. Worth having: placing eight boxes should not mean eight trips
   * back to the panel.
   */
  sticky: boolean;
}

/** A connector mid-draw. Lives outside the document until it is committed. */
export interface LineDraft {
  lineKind: LineKind;
  from: Endpoint;
  /** Bends committed so far, in page coordinates. */
  waypoints: Point[];
  /** Where the pointer is, already snapped/constrained. */
  cursor: Point;
  /** The connection point the pointer is over, if any. */
  snap: { shapeId: string; port: number; point: Point } | null;
  /**
   * True when the gesture began on a shape's quick-draw dot rather than with
   * the Line tool, which is what decides whether releasing the button ends the
   * line or merely places a bend.
   */
  quick: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface HistoryEntry {
  doc: Doc;
  pageIndex: number;
}

export interface EditorState {
  doc: Doc;
  pageIndex: number;
  selection: string[];
  tool: Tool;
  draft: LineDraft | null;
  /** Element whose text is being edited in place. */
  editingId: string | null;
  viewport: Viewport;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  smartGuides: boolean;
  recentSymbols: string[];
  clipboard: Element[];
  past: HistoryEntry[];
  future: HistoryEntry[];
  historyTag: string | null;
  /** Bumped whenever the document changes, for the autosave effect. */
  revision: number;

  /* --- document -------------------------------------------------------- */
  page: () => Page;
  mutate: (recipe: (page: Page, doc: Doc) => void, tag?: string) => void;
  replaceDoc: (doc: Doc) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  /* --- elements -------------------------------------------------------- */
  addShape: (symbol: string, at: Point, size?: { width: number; height: number }) => string;
  addLine: (line: Omit<Line, "id" | "kind" | "z">) => string;
  updateShapes: (ids: string[], patch: Partial<Shape>, tag?: string) => void;
  updateLines: (ids: string[], patch: Partial<Line>, tag?: string) => void;
  styleShapes: (ids: string[], patch: Partial<ShapeStyle>, tag?: string) => void;
  styleLines: (ids: string[], patch: Partial<LineStyle>, tag?: string) => void;
  setText: (id: string, text: string) => void;
  deleteElements: (ids: string[]) => void;
  duplicateSelection: () => void;

  /* --- selection ------------------------------------------------------- */
  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  selectedElements: () => Element[];
  selectionBounds: () => Rect | null;

  /* --- tools ----------------------------------------------------------- */
  setTool: (tool: Partial<Tool>) => void;
  resetTool: () => void;
  setEditing: (id: string | null) => void;

  /* --- line drafting --------------------------------------------------- */
  startDraft: (draft: LineDraft) => void;
  updateDraft: (patch: Partial<LineDraft>) => void;
  pushWaypoint: (p: Point) => void;
  popWaypoint: () => void;
  cancelDraft: () => void;
  commitDraft: (end: Endpoint) => string | null;

  /* --- arrangement ----------------------------------------------------- */
  order: (ids: string[], where: "front" | "back" | "forward" | "backward") => void;
  align: (ids: string[], how: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => void;
  distribute: (ids: string[], axis: "h" | "v") => void;
  makeSame: (ids: string[], what: "width" | "height" | "both") => void;
  group: (ids: string[]) => void;
  ungroup: (ids: string[]) => void;
  flip: (ids: string[], axis: "h" | "v") => void;
  rotateBy: (ids: string[], degrees: number) => void;
  nudge: (ids: string[], dx: number, dy: number) => void;

  /* --- clipboard ------------------------------------------------------- */
  copy: () => void;
  cut: () => void;
  paste: (at?: Point) => void;

  /* --- pages ----------------------------------------------------------- */
  addPage: () => void;
  removePage: (index: number) => void;
  renamePage: (index: number, name: string) => void;
  gotoPage: (index: number) => void;

  /* --- view ------------------------------------------------------------ */
  setViewport: (v: Partial<Viewport>) => void;
  zoomTo: (zoom: number, focus?: Point) => void;
  setGrid: (patch: { gridSize?: number; snapToGrid?: boolean; showGrid?: boolean; smartGuides?: boolean }) => void;

  noteSymbolUse: (symbol: string) => void;
  setTitle: (title: string) => void;
}

const HISTORY_LIMIT = 120;

export const useEditor = create<EditorState>((set, get) => ({
  doc: emptyDoc(),
  pageIndex: 0,
  selection: [],
  tool: { kind: "select", symbol: "process", lineKind: "orthogonal", sticky: false },
  draft: null,
  editingId: null,
  viewport: { x: 40, y: 24, zoom: 1 },
  gridSize: 10,
  snapToGrid: true,
  showGrid: true,
  smartGuides: true,
  recentSymbols: [...DEFAULT_RECENT],
  clipboard: [],
  past: [],
  future: [],
  historyTag: null,
  revision: 0,

  /* --- document -------------------------------------------------------- */

  page: () => {
    const { doc, pageIndex } = get();
    return doc.pages[Math.min(pageIndex, doc.pages.length - 1)];
  },

  mutate: (recipe, tag) =>
    set((s) => {
      const doc = deepClone(s.doc);
      const page = doc.pages[Math.min(s.pageIndex, doc.pages.length - 1)];
      recipe(page, doc);
      const merge = tag !== undefined && tag === s.historyTag;
      const past = merge ? s.past : [...s.past, { doc: s.doc, pageIndex: s.pageIndex }].slice(-HISTORY_LIMIT);
      return { doc, past, future: [], historyTag: tag ?? null, revision: s.revision + 1 };
    }),

  replaceDoc: (doc) =>
    set((s) => ({
      doc,
      pageIndex: 0,
      selection: [],
      past: [...s.past, { doc: s.doc, pageIndex: s.pageIndex }].slice(-HISTORY_LIMIT),
      future: [],
      historyTag: null,
      revision: s.revision + 1,
    })),

  undo: () =>
    set((s) => {
      const previous = s.past[s.past.length - 1];
      if (!previous) return s;
      return {
        doc: previous.doc,
        pageIndex: previous.pageIndex,
        past: s.past.slice(0, -1),
        future: [{ doc: s.doc, pageIndex: s.pageIndex }, ...s.future].slice(0, HISTORY_LIMIT),
        historyTag: null,
        selection: [],
        editingId: null,
        revision: s.revision + 1,
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return s;
      return {
        doc: next.doc,
        pageIndex: next.pageIndex,
        past: [...s.past, { doc: s.doc, pageIndex: s.pageIndex }].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        historyTag: null,
        selection: [],
        editingId: null,
        revision: s.revision + 1,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  /* --- elements -------------------------------------------------------- */

  addShape: (symbol, at, size) => {
    const def = symbolFor(symbol);
    const width = size?.width ?? def.defaultSize.width;
    const height = size?.height ?? def.defaultSize.height;
    const id = newId("s");
    get().mutate((page) => {
      const shape: Shape = {
        id,
        kind: "shape",
        symbol,
        x: Math.round(at.x - width / 2),
        y: Math.round(at.y - height / 2),
        width,
        height,
        rotation: 0,
        text: "",
        style: { ...DEFAULT_SHAPE_STYLE },
        z: topZ(page),
      };
      page.elements.push(shape);
    });
    get().noteSymbolUse(symbol);
    return id;
  },

  addLine: (line) => {
    const id = newId("l");
    get().mutate((page) => {
      page.elements.push({ ...line, id, kind: "line", z: topZ(page) } as Line);
    });
    return id;
  },

  updateShapes: (ids, patch, tag) => {
    if (ids.length === 0) return;
    const set0 = new Set(ids);
    get().mutate((page) => {
      for (const el of page.elements) {
        if (set0.has(el.id) && isShape(el) && !el.locked) Object.assign(el, patch);
      }
    }, tag);
  },

  updateLines: (ids, patch, tag) => {
    if (ids.length === 0) return;
    const set0 = new Set(ids);
    get().mutate((page) => {
      for (const el of page.elements) {
        if (set0.has(el.id) && isLine(el) && !el.locked) Object.assign(el, patch);
      }
    }, tag);
  },

  styleShapes: (ids, patch, tag) => {
    const set0 = new Set(ids);
    get().mutate((page) => {
      for (const el of page.elements) {
        if (set0.has(el.id) && isShape(el) && !el.locked) Object.assign(el.style, patch);
      }
    }, tag);
  },

  styleLines: (ids, patch, tag) => {
    const set0 = new Set(ids);
    get().mutate((page) => {
      for (const el of page.elements) {
        if (set0.has(el.id) && isLine(el) && !el.locked) Object.assign(el.style, patch);
      }
    }, tag);
  },

  setText: (id, text) =>
    get().mutate((page) => {
      const el = page.elements.find((e) => e.id === id);
      if (!el) return;
      if (isShape(el)) el.text = text;
      else el.label = text;
    }, `text:${id}`),

  deleteElements: (ids) => {
    if (ids.length === 0) return;
    const doomed = new Set(ids);
    get().mutate((page) => {
      // A connector whose shape is gone would keep an endpoint pointing at
      // nothing, so it is released back to a free point where that end was.
      const removed = page.elements.filter((e) => doomed.has(e.id));
      const removedShapes = new Set(removed.filter(isShape).map((e) => e.id));
      for (const el of page.elements) {
        if (!isLine(el) || doomed.has(el.id)) continue;
        for (const key of ["from", "to"] as const) {
          const end = el[key];
          if (end.kind === "shape" && removedShapes.has(end.shapeId)) {
            const shape = removed.find((e) => e.id === end.shapeId);
            const at =
              shape && isShape(shape)
                ? { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 }
                : { x: 0, y: 0 };
            el[key] = { kind: "free", ...at };
          }
        }
      }
      page.elements = page.elements.filter((e) => !doomed.has(e.id));
    });
    set((s) => ({ selection: s.selection.filter((id) => !doomed.has(id)), editingId: null }));
  },

  duplicateSelection: () => {
    const { selection } = get();
    if (selection.length === 0) return;
    const chosen = new Set(selection);
    const idMap = new Map<string, string>();
    const created: string[] = [];
    get().mutate((page) => {
      const originals = page.elements.filter((e) => chosen.has(e.id));
      for (const el of originals) idMap.set(el.id, newId(el.kind === "shape" ? "s" : "l"));
      let z = topZ(page);
      for (const el of originals) {
        const copy = deepClone(el);
        copy.id = idMap.get(el.id)!;
        copy.z = z++;
        if (isShape(copy)) {
          copy.x += 20;
          copy.y += 20;
        } else {
          copy.waypoints = copy.waypoints.map((p) => ({ x: p.x + 20, y: p.y + 20 }));
          for (const key of ["from", "to"] as const) {
            const end = copy[key];
            if (end.kind === "free") copy[key] = { kind: "free", x: end.x + 20, y: end.y + 20 };
            else if (idMap.has(end.shapeId)) copy[key] = { ...end, shapeId: idMap.get(end.shapeId)! };
            else copy[key] = { ...end };
          }
        }
        created.push(copy.id);
        page.elements.push(copy);
      }
    });
    set({ selection: created });
  },

  /* --- selection ------------------------------------------------------- */

  select: (ids) => set({ selection: ids, editingId: null }),
  toggleSelect: (id) =>
    set((s) => ({
      selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id],
    })),
  selectAll: () => set((s) => ({ selection: s.doc.pages[s.pageIndex].elements.map((e) => e.id) })),
  clearSelection: () => set({ selection: [], editingId: null }),

  selectedElements: () => {
    const { selection } = get();
    const page = get().page();
    const chosen = new Set(selection);
    return page.elements.filter((e) => chosen.has(e.id));
  },

  selectionBounds: () => {
    const page = get().page();
    const els = get().selectedElements();
    if (els.length === 0) return null;
    const rects = els.map((e) => elementBounds(e, page));
    const x1 = Math.min(...rects.map((r) => r.x));
    const y1 = Math.min(...rects.map((r) => r.y));
    const x2 = Math.max(...rects.map((r) => r.x + r.width));
    const y2 = Math.max(...rects.map((r) => r.y + r.height));
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  },

  /* --- tools ----------------------------------------------------------- */

  setTool: (tool) => set((s) => ({ tool: { ...s.tool, ...tool }, draft: null, editingId: null })),
  resetTool: () =>
    set((s) => (s.tool.sticky ? { draft: null } : { tool: { ...s.tool, kind: "select" }, draft: null })),
  setEditing: (id) => set({ editingId: id }),

  /* --- line drafting --------------------------------------------------- */

  startDraft: (draft) => set({ draft, selection: [], editingId: null }),
  updateDraft: (patch) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : s)),
  pushWaypoint: (p) =>
    set((s) => (s.draft ? { draft: { ...s.draft, waypoints: [...s.draft.waypoints, p] } } : s)),
  popWaypoint: () =>
    set((s) => (s.draft ? { draft: { ...s.draft, waypoints: s.draft.waypoints.slice(0, -1) } } : s)),
  cancelDraft: () => set({ draft: null }),

  commitDraft: (end) => {
    const { draft } = get();
    if (!draft) return null;
    // A line that goes nowhere is a stray click, not a connector.
    const start = draft.from.kind === "free" ? { x: draft.from.x, y: draft.from.y } : null;
    const endPoint = end.kind === "free" ? { x: end.x, y: end.y } : null;
    if (draft.waypoints.length === 0 && start && endPoint) {
      if (Math.hypot(endPoint.x - start.x, endPoint.y - start.y) < 6) {
        set({ draft: null });
        return null;
      }
    }
    const id = get().addLine({
      lineKind: draft.lineKind,
      from: draft.from,
      to: end,
      waypoints: draft.waypoints,
      style: { ...DEFAULT_LINE_STYLE },
      label: "",
    });
    set({ draft: null, selection: [id] });
    return id;
  },

  /* --- arrangement ----------------------------------------------------- */

  order: (ids, where) => {
    if (ids.length === 0) return;
    const chosen = new Set(ids);
    get().mutate((page) => {
      const sorted = [...page.elements].sort((a, b) => a.z - b.z);
      const moving = sorted.filter((e) => chosen.has(e.id));
      const rest = sorted.filter((e) => !chosen.has(e.id));
      let next: Element[];
      if (where === "front") next = [...rest, ...moving];
      else if (where === "back") next = [...moving, ...rest];
      else {
        next = sorted;
        const step = where === "forward" ? 1 : -1;
        const order = where === "forward" ? [...moving].reverse() : moving;
        for (const el of order) {
          const i = next.indexOf(el);
          const j = i + step;
          if (j < 0 || j >= next.length || chosen.has(next[j].id)) continue;
          next = [...next];
          [next[i], next[j]] = [next[j], next[i]];
        }
      }
      next.forEach((el, i) => {
        const target = page.elements.find((e) => e.id === el.id);
        if (target) target.z = i + 1;
      });
    });
  },

  align: (ids, how) => {
    if (ids.length < 2) return;
    const page = get().page();
    const shapes = page.elements.filter((e) => ids.includes(e.id) && isShape(e)) as Shape[];
    if (shapes.length < 2) return;
    const rects = shapes.map(shapeBounds);
    const x1 = Math.min(...rects.map((r) => r.x));
    const x2 = Math.max(...rects.map((r) => r.x + r.width));
    const y1 = Math.min(...rects.map((r) => r.y));
    const y2 = Math.max(...rects.map((r) => r.y + r.height));
    const chosen = new Set(shapes.map((s) => s.id));
    get().mutate((p) => {
      for (const el of p.elements) {
        if (!chosen.has(el.id) || !isShape(el) || el.locked) continue;
        switch (how) {
          case "left": el.x = x1; break;
          case "right": el.x = x2 - el.width; break;
          case "hcenter": el.x = (x1 + x2) / 2 - el.width / 2; break;
          case "top": el.y = y1; break;
          case "bottom": el.y = y2 - el.height; break;
          case "vcenter": el.y = (y1 + y2) / 2 - el.height / 2; break;
        }
        el.x = Math.round(el.x);
        el.y = Math.round(el.y);
      }
    });
  },

  distribute: (ids, axis) => {
    const page = get().page();
    const shapes = (page.elements.filter((e) => ids.includes(e.id) && isShape(e)) as Shape[]).sort(
      (a, b) => (axis === "h" ? a.x - b.x : a.y - b.y),
    );
    if (shapes.length < 3) return;
    const first = shapes[0];
    const last = shapes[shapes.length - 1];
    const span =
      axis === "h" ? last.x + last.width - first.x : last.y + last.height - first.y;
    const used = shapes.reduce((sum, s) => sum + (axis === "h" ? s.width : s.height), 0);
    const gap = (span - used) / (shapes.length - 1);
    let cursor = axis === "h" ? first.x : first.y;
    const positions = new Map<string, number>();
    for (const s of shapes) {
      positions.set(s.id, Math.round(cursor));
      cursor += (axis === "h" ? s.width : s.height) + gap;
    }
    get().mutate((p) => {
      for (const el of p.elements) {
        const at = positions.get(el.id);
        if (at === undefined || !isShape(el) || el.locked) continue;
        if (axis === "h") el.x = at;
        else el.y = at;
      }
    });
  },

  makeSame: (ids, what) => {
    const page = get().page();
    const shapes = page.elements.filter((e) => ids.includes(e.id) && isShape(e)) as Shape[];
    if (shapes.length < 2) return;
    // The first-selected shape is the reference, which is what every desktop
    // tool does and what people expect when they shift-click a "model" first.
    const model = shapes[0];
    const chosen = new Set(shapes.map((s) => s.id));
    get().mutate((p) => {
      for (const el of p.elements) {
        if (!chosen.has(el.id) || !isShape(el) || el.locked || el.id === model.id) continue;
        if (what === "width" || what === "both") el.width = model.width;
        if (what === "height" || what === "both") el.height = model.height;
      }
    });
  },

  group: (ids) => {
    if (ids.length < 2) return;
    const gid = newId("g");
    const chosen = new Set(ids);
    get().mutate((page) => {
      for (const el of page.elements) if (chosen.has(el.id)) el.groupId = gid;
    });
  },

  ungroup: (ids) => {
    const page = get().page();
    const groups = new Set(
      page.elements.filter((e) => ids.includes(e.id) && e.groupId).map((e) => e.groupId!),
    );
    if (groups.size === 0) return;
    get().mutate((p) => {
      for (const el of p.elements) if (el.groupId && groups.has(el.groupId)) delete el.groupId;
    });
  },

  flip: (ids, axis) => {
    const page = get().page();
    const els = page.elements.filter((e) => ids.includes(e.id));
    if (els.length === 0) return;
    const rects = els.map((e) => elementBounds(e, page));
    const x1 = Math.min(...rects.map((r) => r.x));
    const x2 = Math.max(...rects.map((r) => r.x + r.width));
    const y1 = Math.min(...rects.map((r) => r.y));
    const y2 = Math.max(...rects.map((r) => r.y + r.height));
    const chosen = new Set(ids);
    const mirror = (p: Point): Point =>
      axis === "h" ? { x: x1 + x2 - p.x, y: p.y } : { x: p.x, y: y1 + y2 - p.y };
    get().mutate((p) => {
      for (const el of p.elements) {
        if (!chosen.has(el.id) || el.locked) continue;
        if (isShape(el)) {
          if (axis === "h") el.x = Math.round(x1 + x2 - (el.x + el.width));
          else el.y = Math.round(y1 + y2 - (el.y + el.height));
          el.rotation = -el.rotation;
        } else {
          el.waypoints = el.waypoints.map(mirror);
          for (const key of ["from", "to"] as const) {
            const end = el[key];
            if (end.kind === "free") el[key] = { kind: "free", ...mirror({ x: end.x, y: end.y }) };
          }
        }
      }
    });
  },

  rotateBy: (ids, degrees) => {
    const chosen = new Set(ids);
    get().mutate((page) => {
      for (const el of page.elements) {
        if (chosen.has(el.id) && isShape(el) && !el.locked) {
          el.rotation = (((el.rotation + degrees) % 360) + 360) % 360;
        }
      }
    });
  },

  nudge: (ids, dx, dy) => {
    const chosen = new Set(ids);
    get().mutate((page) => {
      for (const el of page.elements) {
        if (!chosen.has(el.id) || el.locked) continue;
        if (isShape(el)) {
          el.x += dx;
          el.y += dy;
        } else {
          el.waypoints = el.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy }));
          for (const key of ["from", "to"] as const) {
            const end = el[key];
            if (end.kind === "free") el[key] = { kind: "free", x: end.x + dx, y: end.y + dy };
          }
        }
      }
    }, `nudge:${ids.join(",")}`);
  },

  /* --- clipboard ------------------------------------------------------- */

  copy: () => {
    const els = get().selectedElements();
    if (els.length > 0) set({ clipboard: deepClone(els) });
  },

  cut: () => {
    const { selection } = get();
    get().copy();
    get().deleteElements(selection);
  },

  paste: (at) => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;
    const rects = clipboard.filter(isShape).map(shapeBounds);
    const originX = rects.length ? Math.min(...rects.map((r) => r.x)) : 0;
    const originY = rects.length ? Math.min(...rects.map((r) => r.y)) : 0;
    const dx = at ? at.x - originX : 24;
    const dy = at ? at.y - originY : 24;
    const idMap = new Map<string, string>();
    for (const el of clipboard) idMap.set(el.id, newId(el.kind === "shape" ? "s" : "l"));
    const created: string[] = [];
    get().mutate((page) => {
      let z = topZ(page);
      for (const el of clipboard) {
        const copy = deepClone(el);
        copy.id = idMap.get(el.id)!;
        copy.z = z++;
        if (isShape(copy)) {
          copy.x += dx;
          copy.y += dy;
        } else {
          copy.waypoints = copy.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy }));
          for (const key of ["from", "to"] as const) {
            const end = copy[key];
            if (end.kind === "free") copy[key] = { kind: "free", x: end.x + dx, y: end.y + dy };
            else if (idMap.has(end.shapeId)) copy[key] = { ...end, shapeId: idMap.get(end.shapeId)! };
            else copy[key] = { kind: "free", x: 0, y: 0 };
          }
        }
        created.push(copy.id);
        page.elements.push(copy);
      }
    });
    set({ selection: created });
  },

  /* --- pages ----------------------------------------------------------- */

  addPage: () =>
    set((s) => {
      const doc = deepClone(s.doc);
      doc.pages.push(emptyPage(`Page ${doc.pages.length + 1}`));
      return {
        doc,
        pageIndex: doc.pages.length - 1,
        selection: [],
        past: [...s.past, { doc: s.doc, pageIndex: s.pageIndex }].slice(-HISTORY_LIMIT),
        future: [],
        historyTag: null,
        revision: s.revision + 1,
      };
    }),

  removePage: (index) =>
    set((s) => {
      if (s.doc.pages.length <= 1) return s;
      const doc = deepClone(s.doc);
      doc.pages.splice(index, 1);
      return {
        doc,
        pageIndex: Math.max(0, Math.min(s.pageIndex, doc.pages.length - 1)),
        selection: [],
        past: [...s.past, { doc: s.doc, pageIndex: s.pageIndex }].slice(-HISTORY_LIMIT),
        future: [],
        historyTag: null,
        revision: s.revision + 1,
      };
    }),

  renamePage: (index, name) =>
    set((s) => {
      const doc = deepClone(s.doc);
      if (doc.pages[index]) doc.pages[index].name = name;
      return { doc, revision: s.revision + 1 };
    }),

  gotoPage: (index) =>
    set((s) => ({
      pageIndex: Math.max(0, Math.min(index, s.doc.pages.length - 1)),
      selection: [],
      editingId: null,
      draft: null,
    })),

  /* --- view ------------------------------------------------------------ */

  setViewport: (v) => set((s) => ({ viewport: { ...s.viewport, ...v } })),

  zoomTo: (zoom, focus) =>
    set((s) => {
      const next = Math.max(0.1, Math.min(4, zoom));
      if (!focus) return { viewport: { ...s.viewport, zoom: next } };
      // Keep the point under the cursor fixed while the scale changes.
      const k = next / s.viewport.zoom;
      return {
        viewport: {
          zoom: next,
          x: focus.x - (focus.x - s.viewport.x) * k,
          y: focus.y - (focus.y - s.viewport.y) * k,
        },
      };
    }),

  setGrid: (patch) => set(patch),

  noteSymbolUse: (symbol) =>
    set((s) => ({ recentSymbols: [symbol, ...s.recentSymbols.filter((k) => k !== symbol)].slice(0, 7) })),

  setTitle: (title) => set((s) => ({ doc: { ...s.doc, title }, revision: s.revision + 1 })),
}));

/** Shape under a selection, when exactly one shape is selected. */
export function useSelectedShape(): Shape | null {
  const selection = useEditor((s) => s.selection);
  const doc = useEditor((s) => s.doc);
  const pageIndex = useEditor((s) => s.pageIndex);
  if (selection.length !== 1) return null;
  const page = doc.pages[pageIndex];
  return page ? findShape(page, selection[0]) ?? null : null;
}

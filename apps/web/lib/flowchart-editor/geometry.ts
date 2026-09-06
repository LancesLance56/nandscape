/**
 * Geometry the canvas needs, and the one place a connector's on-screen path is
 * produced.
 *
 * `linePoints` is the whole routing story: endpoints resolved from wherever
 * they are anchored, then the user's bends, in order, untouched. There is no
 * obstacle avoidance, no side-picking, no corridor assignment - if a line runs
 * through a box it is because someone drew it that way, and it will still run
 * through that box tomorrow. Every other function here is measurement,
 * snapping or hit-testing in service of a gesture.
 */

import {
  isShape,
  type Doc,
  type Element,
  type Endpoint,
  type Line,
  type Page,
  type Point,
  type Shape,
} from "./model";
import { portsFor } from "./symbols";

/* -------------------------------------------------------------------------
 * Points and boxes
 * ---------------------------------------------------------------------- */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export function rotatePoint(p: Point, origin: Point, degrees: number): Point {
  if (!degrees) return p;
  const a = (degrees * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return { x: origin.x + dx * cos - dy * sin, y: origin.y + dx * sin + dy * cos };
}

export function shapeCentre(s: Shape): Point {
  return { x: s.x + s.width / 2, y: s.y + s.height / 2 };
}

/** A shape's connection points in page coordinates, rotation included. */
export function shapePorts(s: Shape): Point[] {
  const local = portsFor(s.symbol, s.width, s.height);
  const centre = shapeCentre(s);
  return local.map((p) => rotatePoint({ x: s.x + p.x, y: s.y + p.y }, centre, s.rotation));
}

export function shapeRect(s: Shape): Rect {
  return { x: s.x, y: s.y, width: s.width, height: s.height };
}

/** Axis-aligned bounds of a rotated shape - what selection and marquee use. */
export function shapeBounds(s: Shape): Rect {
  if (!s.rotation) return shapeRect(s);
  const c = shapeCentre(s);
  const corners: Point[] = [
    { x: s.x, y: s.y },
    { x: s.x + s.width, y: s.y },
    { x: s.x + s.width, y: s.y + s.height },
    { x: s.x, y: s.y + s.height },
  ].map((p) => rotatePoint(p, c, s.rotation));
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

export function unionRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const x1 = Math.min(...rects.map((r) => r.x));
  const y1 = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export const pointInRect = (p: Point, r: Rect, pad = 0): boolean =>
  p.x >= r.x - pad && p.x <= r.x + r.width + pad && p.y >= r.y - pad && p.y <= r.y + r.height + pad;

/* -------------------------------------------------------------------------
 * Connectors
 * ---------------------------------------------------------------------- */

export function resolveEndpoint(end: Endpoint, page: Page): Point {
  if (end.kind === "free") return { x: end.x, y: end.y };
  const shape = page.elements.find((e) => e.id === end.shapeId);
  if (!shape || !isShape(shape)) return { x: 0, y: 0 };
  const ports = shapePorts(shape);
  return ports[Math.max(0, Math.min(ports.length - 1, end.port))] ?? shapeCentre(shape);
}

/**
 * The complete polyline for a connector: start, the user's bends, end.
 *
 * This is the function that would have been the router. It is nine lines long
 * because it is not one.
 */
export function linePoints(line: Line, page: Page): Point[] {
  return [resolveEndpoint(line.from, page), ...line.waypoints, resolveEndpoint(line.to, page)];
}

/** Bounding box of a connector, used for marquee selection and grouping. */
export function lineBounds(line: Line, page: Page): Rect {
  const pts = linePoints(line, page);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

export function elementBounds(el: Element, page: Page): Rect {
  return el.kind === "shape" ? shapeBounds(el) : lineBounds(el, page);
}

/* -------------------------------------------------------------------------
 * Path data
 * ---------------------------------------------------------------------- */

const fmt = (n: number) => Math.round(n * 100) / 100;

function polyline(pts: Point[]): string {
  return `M${pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" L")}`;
}

/** Sharp polyline with the corners filleted. The points are unchanged. */
function roundedPolyline(pts: Point[], radius: number): string {
  if (pts.length < 3) return polyline(pts);
  let d = `M${fmt(pts[0].x)},${fmt(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    const d1 = dist(prev, cur);
    const d2 = dist(cur, next);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    if (r < 0.5) {
      d += ` L${fmt(cur.x)},${fmt(cur.y)}`;
      continue;
    }
    const into = { x: cur.x - ((cur.x - prev.x) / d1) * r, y: cur.y - ((cur.y - prev.y) / d1) * r };
    const out = { x: cur.x + ((next.x - cur.x) / d2) * r, y: cur.y + ((next.y - cur.y) / d2) * r };
    d += ` L${fmt(into.x)},${fmt(into.y)} Q${fmt(cur.x)},${fmt(cur.y)} ${fmt(out.x)},${fmt(out.y)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${fmt(last.x)},${fmt(last.y)}`;
}

/** Catmull-Rom through every point, converted to cubics. Passes through each. */
function smoothPolyline(pts: Point[]): string {
  if (pts.length < 3) return polyline(pts);
  let d = `M${fmt(pts[0].x)},${fmt(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${fmt(c1.x)},${fmt(c1.y)} ${fmt(c2.x)},${fmt(c2.y)} ${fmt(p2.x)},${fmt(p2.y)}`;
  }
  return d;
}

/** A single circular-ish arc bulging toward the one waypoint, if there is one. */
function arcPath(pts: Point[]): string {
  const a = pts[0];
  const b = pts[pts.length - 1];
  const mid = pts.length > 2 ? pts[1] : null;
  if (!mid) {
    const bulge = 0.25;
    const c = { x: (a.x + b.x) / 2 - (b.y - a.y) * bulge, y: (a.y + b.y) / 2 + (b.x - a.x) * bulge };
    return `M${fmt(a.x)},${fmt(a.y)} Q${fmt(c.x)},${fmt(c.y)} ${fmt(b.x)},${fmt(b.y)}`;
  }
  // Pull the quadratic control out so the curve actually passes through the
  // bend the user placed, rather than merely leaning toward it.
  const c = { x: 2 * mid.x - (a.x + b.x) / 2, y: 2 * mid.y - (a.y + b.y) / 2 };
  return `M${fmt(a.x)},${fmt(a.y)} Q${fmt(c.x)},${fmt(c.y)} ${fmt(b.x)},${fmt(b.y)}`;
}

export function linePath(line: Line, page: Page): string {
  const pts = linePoints(line, page);
  if (pts.length < 2) return "";
  switch (line.lineKind) {
    case "curved":
      return smoothPolyline(pts);
    case "rounded":
      return roundedPolyline(pts, line.style.radius);
    case "arc":
      return arcPath(pts);
    // `straight` and `orthogonal` differ only in how the points were placed
    // while drawing. Once placed they are the same polyline, which is exactly
    // the promise: what you drew is what is drawn.
    default:
      return polyline(pts);
  }
}

/** Where a connector's label sits: the midpoint of its longest segment. */
export function lineLabelAnchor(line: Line, page: Page): Point {
  const pts = linePoints(line, page);
  let best = 0;
  let bestLen = -1;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = dist(pts[i], pts[i + 1]);
    if (len > bestLen) {
      bestLen = len;
      best = i;
    }
  }
  const a = pts[best];
  const b = pts[best + 1] ?? a;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/* -------------------------------------------------------------------------
 * Hit testing
 * ---------------------------------------------------------------------- */

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function distanceToPolyline(p: Point, pts: Point[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, distanceToSegment(p, pts[i], pts[i + 1]));
  return best;
}

/** Index of the segment nearest `p`, for inserting a bend where it was asked for. */
export function nearestSegment(p: Point, pts: Point[]): { index: number; distance: number } {
  let index = 0;
  let distance = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distanceToSegment(p, pts[i], pts[i + 1]);
    if (d < distance) {
      distance = d;
      index = i;
    }
  }
  return { index, distance };
}

/**
 * The topmost element under a point.
 *
 * Shapes hit on their bounding box rather than their outline: aiming at the
 * corner of a diamond to select it is a worse experience than occasionally
 * selecting one from slightly outside its ink, and every editor worth using
 * makes the same trade.
 */
export function hitTest(page: Page, p: Point, tolerance = 6): Element | null {
  const ordered = [...page.elements].sort((a, b) => b.z - a.z);
  for (const el of ordered) {
    if (el.kind === "line") {
      if (distanceToPolyline(p, linePoints(el, page)) <= tolerance + el.style.strokeWidth) return el;
    } else if (pointInRect(p, shapeBounds(el))) {
      return el;
    }
  }
  return null;
}

/** The topmost *shape* under a point - what a connector looks for when it lands. */
export function shapeAt(page: Page, p: Point, pad = 0): Shape | null {
  const ordered = [...page.elements].sort((a, b) => b.z - a.z);
  for (const el of ordered) {
    if (isShape(el) && pointInRect(p, shapeBounds(el), pad)) return el;
  }
  return null;
}

/** The connection point a drawing gesture should snap to, if any is near enough. */
export function snapToPort(
  page: Page,
  p: Point,
  radius: number,
  excludeShapeId?: string,
): { shapeId: string; port: number; point: Point } | null {
  let best: { shapeId: string; port: number; point: Point } | null = null;
  let bestDistance = radius;
  for (const el of page.elements) {
    if (!isShape(el) || el.id === excludeShapeId || el.locked) continue;
    const ports = shapePorts(el);
    for (let i = 0; i < ports.length; i++) {
      const d = dist(p, ports[i]);
      if (d < bestDistance) {
        bestDistance = d;
        best = { shapeId: el.id, port: i, point: ports[i] };
      }
    }
  }
  return best;
}

/* -------------------------------------------------------------------------
 * Snapping and constraints
 * ---------------------------------------------------------------------- */

export function snapToGrid(p: Point, grid: number, enabled: boolean): Point {
  if (!enabled || grid <= 0) return p;
  return { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid };
}

/**
 * Shift-constrain: hold the pointer to the nearest 45° from the anchor.
 *
 * An assist while a person is drawing, not a router deciding a path. The point
 * that gets stored is still the one under the cursor when they clicked.
 */
export function constrainAngle(anchor: Point, p: Point): Point {
  const dx = p.x - anchor.x;
  const dy = p.y - anchor.y;
  const angle = Math.atan2(dy, dx);
  const step = Math.PI / 4;
  const snapped = Math.round(angle / step) * step;
  const len = Math.hypot(dx, dy);
  return { x: anchor.x + Math.cos(snapped) * len, y: anchor.y + Math.sin(snapped) * len };
}

/** Hold the pointer to a horizontal or vertical run from the anchor. */
export function constrainOrthogonal(anchor: Point, p: Point): Point {
  return Math.abs(p.x - anchor.x) >= Math.abs(p.y - anchor.y)
    ? { x: p.x, y: anchor.y }
    : { x: anchor.x, y: p.y };
}

/* -------------------------------------------------------------------------
 * Alignment guides
 * ---------------------------------------------------------------------- */

export interface Guide {
  axis: "x" | "y";
  position: number;
  /** Extent to draw the guide over, so it visibly touches both shapes. */
  from: number;
  to: number;
}

/**
 * Edge- and centre-alignment guides against every other shape on the page.
 *
 * Returns the offset to apply as well as the guides to draw, so the caller
 * nudges the drag by a pixel or two rather than the guide being decorative.
 */
export function alignmentGuides(
  moving: Rect,
  others: Rect[],
  threshold: number,
): { dx: number; dy: number; guides: Guide[] } {
  const guides: Guide[] = [];
  const candX = [moving.x, moving.x + moving.width / 2, moving.x + moving.width];
  const candY = [moving.y, moving.y + moving.height / 2, moving.y + moving.height];

  let dx = 0;
  let dy = 0;
  let bestX = threshold;
  let bestY = threshold;

  for (const other of others) {
    const oX = [other.x, other.x + other.width / 2, other.x + other.width];
    const oY = [other.y, other.y + other.height / 2, other.y + other.height];

    for (const a of candX) {
      for (const b of oX) {
        const d = Math.abs(a - b);
        if (d < bestX) {
          bestX = d;
          dx = b - a;
        }
      }
    }
    for (const a of candY) {
      for (const b of oY) {
        const d = Math.abs(a - b);
        if (d < bestY) {
          bestY = d;
          dy = b - a;
        }
      }
    }
  }

  const snapped = { ...moving, x: moving.x + dx, y: moving.y + dy };
  const snappedX = [snapped.x, snapped.x + snapped.width / 2, snapped.x + snapped.width];
  const snappedY = [snapped.y, snapped.y + snapped.height / 2, snapped.y + snapped.height];

  for (const other of others) {
    for (const a of snappedX) {
      for (const b of [other.x, other.x + other.width / 2, other.x + other.width]) {
        if (Math.abs(a - b) < 0.5) {
          guides.push({
            axis: "x",
            position: b,
            from: Math.min(snapped.y, other.y),
            to: Math.max(snapped.y + snapped.height, other.y + other.height),
          });
        }
      }
    }
    for (const a of snappedY) {
      for (const b of [other.y, other.y + other.height / 2, other.y + other.height]) {
        if (Math.abs(a - b) < 0.5) {
          guides.push({
            axis: "y",
            position: b,
            from: Math.min(snapped.x, other.x),
            to: Math.max(snapped.x + snapped.width, other.x + other.width),
          });
        }
      }
    }
  }

  return { dx, dy, guides };
}

/* -------------------------------------------------------------------------
 * Misc
 * ---------------------------------------------------------------------- */

export function activePage(doc: Doc, index: number): Page {
  return doc.pages[Math.max(0, Math.min(doc.pages.length - 1, index))];
}

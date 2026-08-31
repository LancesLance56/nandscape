/**
 * Arrow routing geometry.
 *
 * `layout.ts` decides where every box goes and which side of it each arrow
 * uses. This file answers the remaining question: given those two attachment
 * points, what path does the arrow take, and how does it get there without
 * being drawn straight over a box on the way.
 *
 * Split out because it is pure geometry with no idea what a flowchart is -
 * points, rectangles and paths - and because the collision tests and the
 * search are the parts most worth being able to reason about, and test, on
 * their own.
 */

import type { FlowSide } from "./types";

/** Clearance kept between an arrow and any box it is not attached to. */
export const NODE_CLEARANCE = 6;

/** How far an arrow travels straight out of a box before it may turn. */
export const ESCAPE_STUB = 12;

/**
 * What a corner costs, in pixels of equivalent length.
 *
 * The search would otherwise happily trade a long detour for a marginally
 * shorter one with five extra bends. A flowchart arrow with two corners reads
 * better than a shorter one with six, so bends are made genuinely expensive.
 */
const TURN_COST = 26;

/**
 * How much cheaper travel along a preferred line is.
 *
 * Detours are given their own corridor line as a preference, so a re-routed
 * detour still runs along the corridor the layout assigned it - staying
 * parallel to the other detours rather than wandering off on its own - and
 * only leaves it to get around whatever was in the way.
 */
const PREFERRED_DISCOUNT = 0.25;

export interface Point {
  x: number;
  y: number;
}

/** A box an arrow has to stay out of, already grown by the clearance. */
export interface Obstacle extends Point {
  id: string;
  w: number;
  h: number;
}

export function isVerticalSide(side: FlowSide): boolean {
  return side === "top" || side === "bottom";
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Does the segment a-b pass through the box?
 *
 * Liang-Barsky rather than four segment-segment tests: it handles the
 * diagonal stub a nudged detour produces as readily as an axis-aligned run,
 * and it answers "passes through" rather than "crosses an edge", so a
 * segment lying wholly inside a box is caught too.
 */
export function segmentHitsBox(a: Point, b: Point, box: Obstacle): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - box.x, box.x + box.w - a.x, a.y - box.y, box.y + box.h - a.y];

  let t0 = 0;
  let t1 = 1;

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      // Parallel to this pair of edges: outside the slab means it can never
      // enter, inside means this pair simply does not constrain it.
      if (q[i] < 0) return false;
      continue;
    }
    const t = q[i] / p[i];
    if (p[i] < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }

  return t0 <= t1;
}

export function pathHitsBoxes(
  points: Point[],
  boxes: Obstacle[],
  skip: ReadonlySet<string>,
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    for (const box of boxes) {
      if (skip.has(box.id)) continue;
      if (segmentHitsBox(points[i], points[i + 1], box)) return true;
    }
  }
  return false;
}

/** A point the given distance outside a node, along the normal of its side. */
export function stubPoint(p: Point, side: FlowSide, len: number): Point {
  if (side === "top") return { x: p.x, y: p.y - len };
  if (side === "bottom") return { x: p.x, y: p.y + len };
  if (side === "left") return { x: p.x - len, y: p.y };
  return { x: p.x + len, y: p.y };
}

/**
 * Drops duplicate and collinear points, so a path draws as few corners as its
 * shape actually needs.
 */
export function simplifyPath(points: Point[]): Point[] {
  const out: Point[] = [];

  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    out.push(p);
  }

  for (let i = 1; i < out.length - 1; ) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    if (Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) < 0.5) out.splice(i, 1);
    else i++;
  }

  return out;
}

/**
 * The ordinary route between two attachment points: straight when they line
 * up, a Z through the midline when they do not, and a single corner when one
 * end leaves along the flow and the other across it.
 *
 * This is what every arrow gets unless it turns out to cross a box.
 */
export function simpleRoute(
  p0: Point,
  p1: Point,
  fromSide: FlowSide,
  toSide: FlowSide,
): { points: Point[]; labelAt: Point } {
  const v0 = isVerticalSide(fromSide);
  const v1 = isVerticalSide(toSide);

  if (v0 === v1) {
    // Both stubs leave along the same axis: bend through the shared midline
    // on the other axis, or go straight if already aligned.
    if (v0) {
      if (Math.abs(p0.x - p1.x) < 2) return { points: [p0, p1], labelAt: midpoint(p0, p1) };
      const y = (p0.y + p1.y) / 2;
      const m0 = { x: p0.x, y };
      const m1 = { x: p1.x, y };
      return { points: [p0, m0, m1, p1], labelAt: midpoint(m0, m1) };
    }
    if (Math.abs(p0.y - p1.y) < 2) return { points: [p0, p1], labelAt: midpoint(p0, p1) };
    const x = (p0.x + p1.x) / 2;
    const m0 = { x, y: p0.y };
    const m1 = { x, y: p1.y };
    return { points: [p0, m0, m1, p1], labelAt: midpoint(m0, m1) };
  }

  // One stub vertical, one horizontal: a single corner where they meet
  // connects them with exactly one bend. The corner has to share the
  // vertical-tangent point's x (so that first leg is vertical) and the
  // horizontal-tangent point's y (so the second leg is horizontal).
  const corner = v0 ? { x: p0.x, y: p1.y } : { x: p1.x, y: p0.y };
  return { points: [p0, corner, p1], labelAt: corner };
}

/* -------------------------------------------------------------------------
 * Obstacle-avoiding router
 * ---------------------------------------------------------------------- */

function dedupeSorted(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) {
    if (out.length === 0 || Math.abs(out[out.length - 1] - v) > 0.5) out.push(v);
  }
  return out;
}

function indexOfNearest(values: number[], target: number): number {
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < values.length; i++) {
    const gap = Math.abs(values[i] - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

/** Binary min-heap. The grid is small, but this runs per re-routed arrow on
 *  every frame of a drag, so an O(n) scan for the next node is not free. */
class MinHeap {
  private keys: number[] = [];
  private items: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(key: number, item: number): void {
    this.keys.push(key);
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= this.keys[i]) break;
      this.swap(parent, i);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastKey = this.keys.pop()!;
    const lastItem = this.items.pop()!;
    if (this.items.length > 0) {
      this.keys[0] = lastKey;
      this.items[0] = lastItem;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.keys.length && this.keys[left] < this.keys[smallest]) smallest = left;
        if (right < this.keys.length && this.keys[right] < this.keys[smallest]) smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
  }
}

/**
 * Routes an arrow around the boxes instead of over them.
 *
 * A shortest-path search on the grid formed by every obstacle's own edges,
 * offset just clear of them, plus the two endpoints' lines. That grid is the
 * standard construction for this problem and it has the property that
 * matters here: if any rectilinear path exists, one exists on the grid, so a
 * "no route" answer is real rather than an artefact of where the lines were
 * put. Travel costs its own length, corners cost `TURN_COST`, and a
 * preferred line - a detour's assigned corridor - is discounted so a
 * re-routed detour still runs where the layout meant it to.
 *
 * Both ends step straight out of their box first, which settles the two
 * tangents before the search starts; from there the search is free.
 *
 * Returns null when the boxes genuinely enclose one of the endpoints, which
 * is the caller's signal to fall back to whatever it had.
 */
export function routeAroundBoxes(
  p0: Point,
  fromSide: FlowSide,
  p1: Point,
  toSide: FlowSide,
  obstacles: Obstacle[],
  /**
   * The arrow's own two boxes.
   *
   * Excluded, and it has to be: an attachment point on a diamond sits on the
   * inscribed rhombus, well inside the bounding rectangle, so stepping out of
   * it lands the search's first cell *inside* its own obstacle and every move
   * from there is blocked. It also matches how the result is judged - a path
   * is allowed to touch the boxes it is attached to, and nothing else.
   */
  skip: ReadonlySet<string>,
  preferred?: { axis: "x" | "y"; value: number },
): Point[] | null {
  const q0 = stubPoint(p0, fromSide, ESCAPE_STUB);
  const q1 = stubPoint(p1, toSide, ESCAPE_STUB);

  // A hair outside each box, so a grid line never grazes the thing it is
  // meant to be clear of.
  const off = 1;
  const xs = dedupeSorted([
    q0.x,
    q1.x,
    ...obstacles.flatMap((b) => [b.x - off, b.x + b.w + off]),
    ...(preferred?.axis === "x" ? [preferred.value] : []),
  ]);
  const ys = dedupeSorted([
    q0.y,
    q1.y,
    ...obstacles.flatMap((b) => [b.y - off, b.y + b.h + off]),
    ...(preferred?.axis === "y" ? [preferred.value] : []),
  ]);

  const nx = xs.length;
  const ny = ys.length;
  if (nx === 0 || ny === 0) return null;

  const clear = (ax: number, ay: number, bx: number, by: number): boolean => {
    const a = { x: xs[ax], y: ys[ay] };
    const b = { x: xs[bx], y: ys[by] };
    for (const box of obstacles) {
      if (skip.has(box.id)) continue;
      if (segmentHitsBox(a, b, box)) return false;
    }
    return true;
  };

  const startX = indexOfNearest(xs, q0.x);
  const startY = indexOfNearest(ys, q0.y);
  const goalX = indexOfNearest(xs, q1.x);
  const goalY = indexOfNearest(ys, q1.y);

  // State is (cell, heading), because what a step costs depends on whether it
  // continues in the direction the last one went or turns out of it.
  const HORIZONTAL = 0;
  const VERTICAL = 1;
  const stateCount = nx * ny * 2;
  const stateAt = (ix: number, iy: number, dir: number) => (iy * nx + ix) * 2 + dir;

  const dist = new Float64Array(stateCount).fill(Infinity);
  const cameFrom = new Int32Array(stateCount).fill(-1);
  const heap = new MinHeap();

  // Leaving along the stub is free; turning immediately is not.
  const startDir = isVerticalSide(fromSide) ? VERTICAL : HORIZONTAL;
  for (const dir of [HORIZONTAL, VERTICAL]) {
    const state = stateAt(startX, startY, dir);
    dist[state] = dir === startDir ? 0 : TURN_COST;
    heap.push(dist[state], state);
  }

  const arriveDir = isVerticalSide(toSide) ? VERTICAL : HORIZONTAL;
  let best = -1;
  let bestCost = Infinity;

  while (heap.size > 0) {
    const state = heap.pop();
    const dir = state % 2;
    const cell = (state - dir) / 2;
    const ix = cell % nx;
    const iy = (cell - ix) / nx;
    const here = dist[state];
    if (here === Infinity) continue;

    if (ix === goalX && iy === goalY) {
      // The arrow has to arrive along its own stub, so a final turn is part
      // of the price of getting here.
      const total = here + (dir === arriveDir ? 0 : TURN_COST);
      if (total < bestCost) {
        bestCost = total;
        best = state;
      }
      continue;
    }
    if (here >= bestCost) continue;

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const jx = ix + dx;
      const jy = iy + dy;
      if (jx < 0 || jx >= nx || jy < 0 || jy >= ny) continue;
      if (!clear(ix, iy, jx, jy)) continue;

      const nextDir = dx !== 0 ? HORIZONTAL : VERTICAL;
      const length = dx !== 0 ? Math.abs(xs[jx] - xs[ix]) : Math.abs(ys[jy] - ys[iy]);

      // A run along the preferred line is the corridor doing its job.
      const onPreferred =
        preferred !== undefined &&
        ((preferred.axis === "y" && nextDir === HORIZONTAL && Math.abs(ys[iy] - preferred.value) < 0.5) ||
          (preferred.axis === "x" && nextDir === VERTICAL && Math.abs(xs[ix] - preferred.value) < 0.5));

      const step = length * (onPreferred ? PREFERRED_DISCOUNT : 1) + (nextDir === dir ? 0 : TURN_COST);
      const nextState = stateAt(jx, jy, nextDir);
      if (here + step < dist[nextState]) {
        dist[nextState] = here + step;
        cameFrom[nextState] = state;
        heap.push(dist[nextState], nextState);
      }
    }
  }

  if (best < 0) return null;

  const cells: Point[] = [];
  for (let state = best; state !== -1; state = cameFrom[state]) {
    const dir = state % 2;
    const cell = (state - dir) / 2;
    const ix = cell % nx;
    const iy = (cell - ix) / nx;
    cells.push({ x: xs[ix], y: ys[iy] });
  }
  cells.reverse();

  return simplifyPath([p0, q0, ...cells, q1, p1]);
}

/**
 * Where a re-routed arrow's label goes: the middle of its longest run, which
 * is the one stretch of it with room for a label.
 */
export function longestRunMidpoint(points: Point[]): Point {
  let best = points[0] ?? { x: 0, y: 0 };
  let bestLength = -1;

  for (let i = 0; i < points.length - 1; i++) {
    const length = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    if (length > bestLength) {
      bestLength = length;
      best = midpoint(points[i], points[i + 1]);
    }
  }

  return best;
}

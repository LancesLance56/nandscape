export interface Point {
  x: number;
  y: number;
}

/** Elbow-routes through an ordered list of points: horizontal-then-vertical between each consecutive pair. */
export function buildOrthogonalPath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    d += ` L ${curr.x} ${prev.y} L ${curr.x} ${curr.y}`;
  }
  return d;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Finds which logical segment of `points` (source, ...waypoints, target) a
 * click landed nearest to, measured against the straight line between each
 * consecutive pair (not the rendered elbow) — close enough to pick a
 * sensible insertion point without the cost of elbow-aware geometry. The
 * returned index doubles as the splice index into the *waypoints* array
 * (points[0] is the source, so segment i sits directly before waypoints[i]).
 */
export function nearestSegmentIndex(points: Point[], click: Point): number {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const distance = distanceToSegment(click, points[i], points[i + 1]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

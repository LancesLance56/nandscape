export interface Point {
  x: number;
  y: number;
}

const DEFAULT_CORNER_RADIUS = 8;

export function snapPoint(point: Point, gridSize: number, enabled: boolean): Point {
  if (!enabled) return point;
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

function pointTowards(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return {...from};
  const t = Math.min(distance, len) / len;
  return {x: from.x + dx * t, y: from.y + dy * t};
}

function buildElbowVertices(points: Point[]): Point[] {
  const vertices: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev.x !== curr.x && prev.y !== curr.y) {
      vertices.push({x: curr.x, y: prev.y});
    }
    vertices.push(curr);
  }
  return vertices;
}

export function buildOrthogonalPath(points: Point[], radius: number = DEFAULT_CORNER_RADIUS): string {
  if (points.length < 2) return "";

  const vertices = buildElbowVertices(points);
  if (vertices.length === 2) {
    return `M ${vertices[0].x} ${vertices[0].y} L ${vertices[1].x} ${vertices[1].y}`;
  }

  let d = `M ${vertices[0].x} ${vertices[0].y}`;
  for (let i = 1; i < vertices.length - 1; i++) {
    const prev = vertices[i - 1];
    const curr = vertices[i];
    const next = vertices[i + 1];

    const distPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const distNext = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, distPrev / 2, distNext / 2);

    const beforeCorner = pointTowards(curr, prev, r);
    const afterCorner = pointTowards(curr, next, r);

    d += ` L ${beforeCorner.x} ${beforeCorner.y}`;
    d += ` Q ${curr.x} ${curr.y} ${afterCorner.x} ${afterCorner.y}`;
  }
  const last = vertices[vertices.length - 1];
  d += ` L ${last.x} ${last.y}`;
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
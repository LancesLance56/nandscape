/**
 * The symbol catalogue.
 *
 * Every symbol is a pure function from a box to SVG path data, which is what
 * lets one renderer draw all of them and lets any of them be resized to any
 * aspect ratio without a bitmap or a hand-tuned viewBox. `outline` is the
 * filled, stroked body; `details` are strokes drawn on top of it and never
 * filled - the two bars inside a predefined process, the rule across a sort
 * diamond, the ellipse capping a cylinder.
 *
 * Geometry follows ANSI/ISO 5807, which is what SmartDraw, Visio and every
 * textbook use, so a chart drawn here reads correctly to anyone who has seen a
 * flowchart before.
 */

import type { Point } from "./model";

export interface SymbolGeometry {
  /** The body. Filled and stroked. */
  outline: string;
  /** Extra strokes drawn over the body. Never filled. */
  details?: string[];
}

export interface SymbolDef {
  key: string;
  name: string;
  category: string;
  defaultSize: { width: number; height: number };
  geometry: (w: number, h: number, radius: number) => SymbolGeometry;
  /**
   * Connection points, when the bounding box is the wrong place for them.
   * Must return exactly 16, in the order documented on `boxPorts`.
   */
  ports?: (w: number, h: number) => Point[];
  /** Inset the text box, for symbols whose body does not fill its bounds. */
  textInset?: (w: number, h: number) => { top: number; right: number; bottom: number; left: number };
  /** A container is drawn behind everything and takes no text of its own. */
  container?: boolean;
}

/* -------------------------------------------------------------------------
 * Connection points
 * ---------------------------------------------------------------------- */

/**
 * The 16 fixed connection points: four corners, four side centres, and one
 * between each of those. Ordered clockwise from the top-left corner, four to a
 * side, so index 0/4/8/12 are the corners and 2/6/10/14 the side centres.
 */
export function boxPorts(w: number, h: number): Point[] {
  const p: Point[] = [];
  for (let i = 0; i < 4; i++) p.push({ x: (w * i) / 4, y: 0 });
  for (let i = 0; i < 4; i++) p.push({ x: w, y: (h * i) / 4 });
  for (let i = 0; i < 4; i++) p.push({ x: w - (w * i) / 4, y: h });
  for (let i = 0; i < 4; i++) p.push({ x: 0, y: h - (h * i) / 4 });
  return p;
}

/** The eight worth drawing on hover: corners and side centres. */
export const PRIMARY_PORTS = [0, 2, 4, 6, 8, 10, 12, 14];

/** Ports that follow a diamond's edges rather than its bounding box. */
function diamondPorts(w: number, h: number): Point[] {
  const top = { x: w / 2, y: 0 };
  const right = { x: w, y: h / 2 };
  const bottom = { x: w / 2, y: h };
  const left = { x: 0, y: h / 2 };
  const mix = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  // Same clockwise-from-"top-left" contract: each quadrant edge gets four.
  return [
    mix(left, top, 0.5), mix(left, top, 0.75), top, mix(top, right, 0.25),
    mix(top, right, 0.5), mix(top, right, 0.75), right, mix(right, bottom, 0.25),
    mix(right, bottom, 0.5), mix(right, bottom, 0.75), bottom, mix(bottom, left, 0.25),
    mix(bottom, left, 0.5), mix(bottom, left, 0.75), left, mix(left, top, 0.25),
  ];
}

function ellipsePorts(w: number, h: number): Point[] {
  const cx = w / 2;
  const cy = h / 2;
  // Start at 135° (the "top-left" of the ellipse) and run clockwise.
  return Array.from({ length: 16 }, (_, i) => {
    const a = (-135 + i * 22.5) * (Math.PI / 180);
    return { x: cx + cx * Math.cos(a), y: cy + cy * Math.sin(a) };
  });
}

/* -------------------------------------------------------------------------
 * Path helpers
 * ---------------------------------------------------------------------- */

const rect = (w: number, h: number): string => `M0,0 H${w} V${h} H0 Z`;

function roundRect(w: number, h: number, r: number): string {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  if (k <= 0.01) return rect(w, h);
  return [
    `M${k},0`,
    `H${w - k}`,
    `A${k},${k} 0 0 1 ${w},${k}`,
    `V${h - k}`,
    `A${k},${k} 0 0 1 ${w - k},${h}`,
    `H${k}`,
    `A${k},${k} 0 0 1 0,${h - k}`,
    `V${k}`,
    `A${k},${k} 0 0 1 ${k},0`,
    "Z",
  ].join(" ");
}

const poly = (pts: [number, number][]): string =>
  `M${pts.map(([x, y]) => `${round(x)},${round(y)}`).join(" L")} Z`;

const round = (n: number): number => Math.round(n * 100) / 100;

/** A single-period wave across `w`, used for document bottoms and tape edges. */
function wave(w: number, y: number, amp: number, up: boolean): string {
  const d = up ? -amp : amp;
  return `C${w * 0.25},${y + d * 2} ${w * 0.75},${y - d * 2} ${w},${y}`;
}

/* -------------------------------------------------------------------------
 * The catalogue
 * ---------------------------------------------------------------------- */

const S = (width: number, height: number) => ({ width, height });

const FLOWCHART: SymbolDef[] = [
  {
    key: "process",
    name: "Process",
    category: "Flowchart",
    defaultSize: S(140, 70),
    geometry: (w, h) => ({ outline: rect(w, h) }),
  },
  {
    key: "alternate-process",
    name: "Alternate Process",
    category: "Flowchart",
    defaultSize: S(140, 70),
    geometry: (w, h, r) => ({ outline: roundRect(w, h, r || 12) }),
  },
  {
    key: "decision",
    name: "Decision",
    category: "Flowchart",
    defaultSize: S(150, 90),
    geometry: (w, h) => ({ outline: poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]) }),
    ports: diamondPorts,
    textInset: (w, h) => ({ top: h * 0.22, right: w * 0.22, bottom: h * 0.22, left: w * 0.22 }),
  },
  {
    key: "terminator",
    name: "Terminator",
    category: "Flowchart",
    defaultSize: S(130, 56),
    geometry: (w, h) => ({ outline: roundRect(w, h, h / 2) }),
  },
  {
    key: "data",
    name: "Data",
    category: "Flowchart",
    defaultSize: S(150, 70),
    geometry: (w, h) => {
      const k = Math.min(w * 0.18, h * 0.55);
      return { outline: poly([[k, 0], [w, 0], [w - k, h], [0, h]]) };
    },
    textInset: (w) => {
      const k = Math.min(w * 0.18, 30);
      return { top: 4, right: k, bottom: 4, left: k };
    },
  },
  {
    key: "predefined-process",
    name: "Predefined Process",
    category: "Flowchart",
    defaultSize: S(150, 70),
    geometry: (w, h) => {
      const k = Math.min(w * 0.12, 14);
      return { outline: rect(w, h), details: [`M${k},0 V${h}`, `M${w - k},0 V${h}`] };
    },
    textInset: (w) => {
      const k = Math.min(w * 0.12, 14);
      return { top: 4, right: k + 4, bottom: 4, left: k + 4 };
    },
  },
  {
    key: "internal-storage",
    name: "Internal Storage",
    category: "Flowchart",
    defaultSize: S(150, 76),
    geometry: (w, h) => {
      const k = Math.min(w * 0.14, 18);
      const j = Math.min(h * 0.22, 16);
      return { outline: rect(w, h), details: [`M${k},0 V${h}`, `M0,${j} H${w}`] };
    },
    textInset: (w, h) => ({ top: Math.min(h * 0.22, 16) + 3, right: 4, bottom: 4, left: Math.min(w * 0.14, 18) + 3 }),
  },
  {
    key: "document",
    name: "Document",
    category: "Flowchart",
    defaultSize: S(140, 80),
    geometry: (w, h) => {
      const amp = Math.min(h * 0.12, 10);
      // The wave runs right-to-left so the path closes back at the left edge.
      return {
        outline:
          `M0,0 H${w} V${h - amp}` +
          ` C${w * 0.75},${h - amp * 3} ${w * 0.25},${h + amp} 0,${h - amp} Z`,
      };
    },
    textInset: (_w, h) => ({ top: 4, right: 6, bottom: Math.min(h * 0.12, 10) + 6, left: 6 }),
  },
  {
    key: "multi-document",
    name: "Multiple Documents",
    category: "Flowchart",
    defaultSize: S(150, 88),
    geometry: (w, h) => {
      const off = Math.min(w * 0.06, 9);
      const amp = Math.min(h * 0.1, 8);
      const body = (ox: number, oy: number, bw: number, bh: number) =>
        `M${ox},${oy} H${ox + bw} V${oy + bh - amp} C${ox + bw * 0.25},${oy + bh + amp} ${ox + bw * 0.75},${oy + bh - 3 * amp} ${ox},${oy + bh - amp} Z`;
      return {
        outline: body(0, off * 2, w - off * 2, h - off * 2),
        details: [body(off, off, w - off * 2, h - off * 2), body(off * 2, 0, w - off * 2, h - off * 2)],
      };
    },
    textInset: (w, h) => ({ top: Math.min(h * 0.12, 18) + 2, right: 8, bottom: 14, left: 6 }),
  },
  {
    key: "manual-input",
    name: "Manual Input",
    category: "Flowchart",
    defaultSize: S(150, 74),
    geometry: (w, h) => {
      const k = Math.min(h * 0.3, 22);
      return { outline: poly([[0, k], [w, 0], [w, h], [0, h]]) };
    },
    textInset: (_w, h) => ({ top: Math.min(h * 0.3, 22) + 2, right: 6, bottom: 4, left: 6 }),
  },
  {
    key: "manual-operation",
    name: "Manual Operation",
    category: "Flowchart",
    defaultSize: S(150, 74),
    geometry: (w, h) => {
      const k = Math.min(w * 0.16, 26);
      return { outline: poly([[0, 0], [w, 0], [w - k, h], [k, h]]) };
    },
    textInset: (w) => ({ top: 4, right: Math.min(w * 0.16, 26), bottom: 4, left: Math.min(w * 0.16, 26) }),
  },
  {
    key: "preparation",
    name: "Preparation",
    category: "Flowchart",
    defaultSize: S(155, 76),
    geometry: (w, h) => {
      const k = Math.min(w * 0.16, 26);
      return { outline: poly([[k, 0], [w - k, 0], [w, h / 2], [w - k, h], [k, h], [0, h / 2]]) };
    },
    textInset: (w) => ({ top: 4, right: Math.min(w * 0.16, 26), bottom: 4, left: Math.min(w * 0.16, 26) }),
  },
  {
    key: "connector",
    name: "Connector",
    category: "Flowchart",
    defaultSize: S(56, 56),
    geometry: (w, h) => ({ outline: `M${w / 2},0 A${w / 2},${h / 2} 0 1 1 ${w / 2 - 0.01},0 Z` }),
    ports: ellipsePorts,
  },
  {
    key: "off-page",
    name: "Off-page Connector",
    category: "Flowchart",
    defaultSize: S(110, 78),
    geometry: (w, h) => {
      const k = Math.min(h * 0.32, 26);
      return { outline: poly([[0, 0], [w, 0], [w, h - k], [w / 2, h], [0, h - k]]) };
    },
    textInset: (_w, h) => ({ top: 4, right: 6, bottom: Math.min(h * 0.32, 26), left: 6 }),
  },
  {
    key: "delay",
    name: "Delay",
    category: "Flowchart",
    defaultSize: S(140, 68),
    geometry: (w, h) => {
      const r = Math.min(h / 2, w * 0.45);
      return { outline: `M0,0 H${w - r} A${r},${h / 2} 0 0 1 ${w - r},${h} H0 Z` };
    },
    textInset: (w, h) => ({ top: 4, right: Math.min(h / 2, w * 0.45) * 0.5, bottom: 4, left: 6 }),
  },
  {
    key: "display",
    name: "Display",
    category: "Flowchart",
    defaultSize: S(150, 74),
    geometry: (w, h) => {
      const k = Math.min(w * 0.16, 24);
      const r = Math.min(h / 2, w * 0.3);
      return { outline: `M${k},0 H${w - r} A${r},${h / 2} 0 0 1 ${w - r},${h} H${k} Z` };
    },
    textInset: (w) => ({ top: 4, right: Math.min(w * 0.2, 26), bottom: 4, left: Math.min(w * 0.16, 24) + 2 }),
  },
  {
    key: "stored-data",
    name: "Stored Data",
    category: "Flowchart",
    defaultSize: S(150, 74),
    geometry: (w, h) => {
      const k = Math.min(w * 0.14, 20);
      return { outline: `M${k},0 H${w} C${w - k * 1.2},${h * 0.25} ${w - k * 1.2},${h * 0.75} ${w},${h} H${k} C${k - k * 1.2},${h * 0.75} ${k - k * 1.2},${h * 0.25} ${k},0 Z` };
    },
    textInset: (w) => ({ top: 4, right: Math.min(w * 0.14, 20), bottom: 4, left: Math.min(w * 0.14, 20) + 2 }),
  },
  {
    key: "database",
    name: "Database",
    category: "Flowchart",
    defaultSize: S(120, 96),
    geometry: (w, h) => {
      const ry = Math.min(h * 0.16, 18);
      return {
        outline: `M0,${ry} A${w / 2},${ry} 0 0 1 ${w},${ry} V${h - ry} A${w / 2},${ry} 0 0 1 0,${h - ry} Z`,
        details: [`M0,${ry} A${w / 2},${ry} 0 0 0 ${w},${ry}`],
      };
    },
    textInset: (_w, h) => ({ top: Math.min(h * 0.32, 34), right: 6, bottom: 8, left: 6 }),
  },
  {
    key: "direct-data",
    name: "Direct Data",
    category: "Flowchart",
    defaultSize: S(150, 80),
    geometry: (w, h) => {
      const rx = Math.min(w * 0.12, 16);
      return {
        outline: `M${rx},0 H${w - rx} A${rx},${h / 2} 0 0 1 ${w - rx},${h} H${rx} A${rx},${h / 2} 0 0 1 ${rx},0 Z`,
        details: [`M${w - rx},0 A${rx},${h / 2} 0 0 0 ${w - rx},${h}`],
      };
    },
    textInset: (w) => ({ top: 4, right: Math.min(w * 0.24, 30), bottom: 4, left: Math.min(w * 0.12, 16) + 2 }),
  },
  {
    key: "merge",
    name: "Merge",
    category: "Flowchart",
    defaultSize: S(90, 72),
    geometry: (w, h) => ({ outline: poly([[0, 0], [w, 0], [w / 2, h]]) }),
    textInset: (w, h) => ({ top: 2, right: w * 0.22, bottom: h * 0.4, left: w * 0.22 }),
  },
  {
    key: "extract",
    name: "Extract",
    category: "Flowchart",
    defaultSize: S(90, 72),
    geometry: (w, h) => ({ outline: poly([[w / 2, 0], [w, h], [0, h]]) }),
    textInset: (w, h) => ({ top: h * 0.4, right: w * 0.22, bottom: 2, left: w * 0.22 }),
  },
  {
    key: "or",
    name: "Or",
    category: "Flowchart",
    defaultSize: S(56, 56),
    geometry: (w, h) => ({
      outline: `M${w / 2},0 A${w / 2},${h / 2} 0 1 1 ${w / 2 - 0.01},0 Z`,
      details: [`M${w / 2},0 V${h}`, `M0,${h / 2} H${w}`],
    }),
    ports: ellipsePorts,
  },
  {
    key: "summing-junction",
    name: "Summing Junction",
    category: "Flowchart",
    defaultSize: S(56, 56),
    geometry: (w, h) => {
      const k = 0.1464; // (1 - cos45)/2, so the X meets the circle
      return {
        outline: `M${w / 2},0 A${w / 2},${h / 2} 0 1 1 ${w / 2 - 0.01},0 Z`,
        details: [
          `M${w * k},${h * k} L${w * (1 - k)},${h * (1 - k)}`,
          `M${w * (1 - k)},${h * k} L${w * k},${h * (1 - k)}`,
        ],
      };
    },
    ports: ellipsePorts,
  },
  {
    key: "collate",
    name: "Collate",
    category: "Flowchart",
    defaultSize: S(90, 84),
    geometry: (w, h) => ({
      outline: `M0,0 H${w} L${w / 2},${h / 2} L${w},${h} H0 L${w / 2},${h / 2} Z`,
    }),
    textInset: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  },
  {
    key: "sort",
    name: "Sort",
    category: "Flowchart",
    defaultSize: S(120, 90),
    geometry: (w, h) => ({
      outline: poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]),
      details: [`M0,${h / 2} H${w}`],
    }),
    ports: diamondPorts,
    textInset: (w, h) => ({ top: h * 0.22, right: w * 0.22, bottom: h * 0.22, left: w * 0.22 }),
  },
  {
    key: "card",
    name: "Card",
    category: "Flowchart",
    defaultSize: S(140, 76),
    geometry: (w, h) => {
      const k = Math.min(w * 0.16, h * 0.35, 22);
      return { outline: poly([[k, 0], [w, 0], [w, h], [0, h], [0, k]]) };
    },
  },
  {
    key: "punched-tape",
    name: "Punched Tape",
    category: "Flowchart",
    defaultSize: S(150, 84),
    geometry: (w, h) => {
      const amp = Math.min(h * 0.12, 10);
      return {
        outline: `M0,${amp} ${wave(w, amp, amp, true)} V${h - amp} C${w * 0.75},${h - amp * 3} ${w * 0.25},${h + amp} 0,${h - amp} Z`,
      };
    },
    textInset: (_w, h) => ({ top: Math.min(h * 0.12, 10) + 4, right: 6, bottom: Math.min(h * 0.12, 10) + 4, left: 6 }),
  },
  {
    key: "loop-limit",
    name: "Loop Limit",
    category: "Flowchart",
    defaultSize: S(150, 76),
    geometry: (w, h) => {
      const k = Math.min(w * 0.12, h * 0.3, 20);
      return { outline: poly([[k, 0], [w - k, 0], [w, k], [w, h], [0, h], [0, k]]) };
    },
    textInset: (_w, h) => ({ top: Math.min(h * 0.3, 20) + 2, right: 6, bottom: 4, left: 6 }),
  },
  {
    key: "annotation",
    name: "Annotation",
    category: "Flowchart",
    defaultSize: S(140, 76),
    geometry: (w, h) => {
      const k = Math.min(w * 0.14, 18);
      return { outline: `M${k},0 H0 V${h} H${k}`, details: [] };
    },
    textInset: (w) => ({ top: 4, right: 4, bottom: 4, left: Math.min(w * 0.14, 18) + 6 }),
  },
];

const CONTAINERS: SymbolDef[] = [
  {
    key: "container-box",
    name: "Box",
    category: "Containers",
    defaultSize: S(280, 180),
    geometry: (w, h) => ({ outline: rect(w, h) }),
    container: true,
    textInset: () => ({ top: 6, right: 8, bottom: 6, left: 8 }),
  },
  {
    key: "container-rounded",
    name: "Rounded Box",
    category: "Containers",
    defaultSize: S(280, 180),
    geometry: (w, h, r) => ({ outline: roundRect(w, h, r || 14) }),
    container: true,
  },
  {
    key: "swimlane-v",
    name: "Vertical Lane",
    category: "Containers",
    defaultSize: S(180, 360),
    geometry: (w, h) => ({ outline: rect(w, h), details: [`M0,34 H${w}`] }),
    container: true,
    textInset: () => ({ top: 6, right: 6, bottom: 6, left: 6 }),
  },
  {
    key: "swimlane-h",
    name: "Horizontal Lane",
    category: "Containers",
    defaultSize: S(420, 140),
    geometry: (w, h) => ({ outline: rect(w, h), details: [`M40,0 V${h}`] }),
    container: true,
    textInset: () => ({ top: 6, right: 6, bottom: 6, left: 6 }),
  },
  {
    key: "swimlane-v3",
    name: "Vertical Lanes (3)",
    category: "Containers",
    defaultSize: S(480, 360),
    geometry: (w, h) => ({
      outline: rect(w, h),
      details: [`M0,34 H${w}`, `M${w / 3},0 V${h}`, `M${(w * 2) / 3},0 V${h}`],
    }),
    container: true,
  },
  {
    key: "swimlane-h3",
    name: "Horizontal Lanes (3)",
    category: "Containers",
    defaultSize: S(480, 360),
    geometry: (w, h) => ({
      outline: rect(w, h),
      details: [`M40,0 V${h}`, `M0,${h / 3} H${w}`, `M0,${(h * 2) / 3} H${w}`],
    }),
    container: true,
  },
  {
    key: "container-grid",
    name: "Grid",
    category: "Containers",
    defaultSize: S(480, 300),
    geometry: (w, h) => ({
      outline: rect(w, h),
      details: [
        `M0,${h / 4} H${w}`, `M0,${h / 2} H${w}`, `M0,${(h * 3) / 4} H${w}`,
        `M${w / 3},0 V${h}`, `M${(w * 2) / 3},0 V${h}`,
      ],
    }),
    container: true,
  },
];

const BASIC: SymbolDef[] = [
  {
    key: "rectangle",
    name: "Rectangle",
    category: "Basic Shapes",
    defaultSize: S(140, 80),
    geometry: (w, h) => ({ outline: rect(w, h) }),
  },
  {
    key: "rounded-rectangle",
    name: "Rounded Rectangle",
    category: "Basic Shapes",
    defaultSize: S(140, 80),
    geometry: (w, h, r) => ({ outline: roundRect(w, h, r || 12) }),
  },
  {
    key: "ellipse",
    name: "Ellipse",
    category: "Basic Shapes",
    defaultSize: S(140, 90),
    geometry: (w, h) => ({ outline: `M${w / 2},0 A${w / 2},${h / 2} 0 1 1 ${w / 2 - 0.01},0 Z` }),
    ports: ellipsePorts,
  },
  {
    key: "triangle",
    name: "Triangle",
    category: "Basic Shapes",
    defaultSize: S(120, 100),
    geometry: (w, h) => ({ outline: poly([[w / 2, 0], [w, h], [0, h]]) }),
    textInset: (w, h) => ({ top: h * 0.4, right: w * 0.2, bottom: 4, left: w * 0.2 }),
  },
  {
    key: "diamond",
    name: "Diamond",
    category: "Basic Shapes",
    defaultSize: S(130, 100),
    geometry: (w, h) => ({ outline: poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]) }),
    ports: diamondPorts,
    textInset: (w, h) => ({ top: h * 0.22, right: w * 0.22, bottom: h * 0.22, left: w * 0.22 }),
  },
  {
    key: "pentagon",
    name: "Pentagon",
    category: "Basic Shapes",
    defaultSize: S(120, 110),
    geometry: (w, h) =>
      ({ outline: poly(Array.from({ length: 5 }, (_, i) => {
        const a = (-90 + i * 72) * (Math.PI / 180);
        return [w / 2 + (w / 2) * Math.cos(a), h / 2 + (h / 2) * Math.sin(a)] as [number, number];
      })) }),
  },
  {
    key: "hexagon",
    name: "Hexagon",
    category: "Basic Shapes",
    defaultSize: S(140, 100),
    geometry: (w, h) => {
      const k = w * 0.22;
      return { outline: poly([[k, 0], [w - k, 0], [w, h / 2], [w - k, h], [k, h], [0, h / 2]]) };
    },
  },
  {
    key: "star",
    name: "Star",
    category: "Basic Shapes",
    defaultSize: S(120, 115),
    geometry: (w, h) => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = (-90 + i * 36) * (Math.PI / 180);
        const rx = i % 2 === 0 ? w / 2 : w / 5;
        const ry = i % 2 === 0 ? h / 2 : h / 5;
        pts.push([w / 2 + rx * Math.cos(a), h / 2 + ry * Math.sin(a)]);
      }
      return { outline: poly(pts) };
    },
  },
  {
    key: "arrow-right",
    name: "Arrow",
    category: "Basic Shapes",
    defaultSize: S(150, 80),
    geometry: (w, h) => {
      const t = h * 0.28;
      const head = Math.min(w * 0.35, 46);
      return {
        outline: poly([
          [0, t], [w - head, t], [w - head, 0], [w, h / 2],
          [w - head, h], [w - head, h - t], [0, h - t],
        ]),
      };
    },
  },
  {
    key: "cloud",
    name: "Cloud",
    category: "Basic Shapes",
    defaultSize: S(160, 100),
    geometry: (w, h) => ({
      outline:
        `M${w * 0.25},${h * 0.9} A${w * 0.18},${h * 0.22} 0 0 1 ${w * 0.18},${h * 0.5}` +
        ` A${w * 0.2},${h * 0.26} 0 0 1 ${w * 0.42},${h * 0.24}` +
        ` A${w * 0.22},${h * 0.28} 0 0 1 ${w * 0.78},${h * 0.34}` +
        ` A${w * 0.18},${h * 0.24} 0 0 1 ${w * 0.8},${h * 0.9} Z`,
    }),
  },
];

export const SYMBOLS: SymbolDef[] = [...FLOWCHART, ...CONTAINERS, ...BASIC];

const BY_KEY = new Map(SYMBOLS.map((s) => [s.key, s]));

export function symbolFor(key: string): SymbolDef {
  return BY_KEY.get(key) ?? BY_KEY.get("process")!;
}

export interface SymbolCategory {
  name: string;
  symbols: SymbolDef[];
}

/** Library order, which is also the order the panel shows them in. */
export const SYMBOL_CATEGORIES: SymbolCategory[] = [
  { name: "Containers", symbols: CONTAINERS },
  { name: "Flowchart", symbols: FLOWCHART },
  { name: "Basic Shapes", symbols: BASIC },
];

/** The seven the panel opens with, matching the shapes a flowchart starts from. */
export const DEFAULT_RECENT = [
  "process",
  "predefined-process",
  "decision",
  "terminator",
  "alternate-process",
  "internal-storage",
  "data",
];

export function searchSymbols(query: string): SymbolDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SYMBOLS.filter(
    (s) => s.name.toLowerCase().includes(q) || s.key.includes(q) || s.category.toLowerCase().includes(q),
  );
}

/** Connection points for a symbol at a given size, in shape-local coordinates. */
export function portsFor(symbolKey: string, w: number, h: number): Point[] {
  const def = symbolFor(symbolKey);
  return def.ports ? def.ports(w, h) : boxPorts(w, h);
}

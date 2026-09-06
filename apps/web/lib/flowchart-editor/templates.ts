/**
 * Starter drawings.
 *
 * Every coordinate and every bend is written out longhand, which is the point:
 * a template is a drawing somebody made, not a description an engine will
 * arrange. Open one, drag a box, and the connectors keep the shape they were
 * given rather than rearranging themselves around the change.
 */

import {
  DEFAULT_LINE_STYLE,
  DEFAULT_SHAPE_STYLE,
  emptyDoc,
  emptyPage,
  newId,
  type Doc,
  type Endpoint,
  type Line,
  type Point,
  type Shape,
} from "./model";

interface ShapeSpec {
  id: string;
  symbol: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
}

interface LineSpec {
  from: [string, number];
  to: [string, number];
  bends?: Point[];
  label?: string;
}

function build(name: string, shapes: ShapeSpec[], lines: LineSpec[]): Doc {
  const page = emptyPage("Page 1");
  let z = 1;

  const built: Shape[] = shapes.map((s) => ({
    id: s.id,
    kind: "shape",
    symbol: s.symbol,
    x: s.x,
    y: s.y,
    width: s.width ?? 150,
    height: s.height ?? 64,
    rotation: 0,
    text: s.text,
    style: { ...DEFAULT_SHAPE_STYLE },
    z: z++,
  }));

  const builtLines: Line[] = lines.map((l) => ({
    id: newId("l"),
    kind: "line",
    lineKind: "orthogonal",
    from: { kind: "shape", shapeId: l.from[0], port: l.from[1] } as Endpoint,
    to: { kind: "shape", shapeId: l.to[0], port: l.to[1] } as Endpoint,
    waypoints: l.bends ?? [],
    style: { ...DEFAULT_LINE_STYLE },
    label: l.label ?? "",
    z: z++,
  }));

  page.elements = [...built, ...builtLines];
  return { title: name, pages: [page] };
}

/** Port indices worth naming: the four side centres. */
const TOP = 2;
const RIGHT = 6;
const BOTTOM = 10;
const LEFT = 14;

export interface Template {
  name: string;
  build: () => Doc;
}

export const TEMPLATES: Template[] = [
  { name: "Blank page", build: () => emptyDoc() },

  {
    name: "Basic flowchart",
    build: () =>
      build(
        "Basic flowchart",
        [
          { id: "t1", symbol: "terminator", x: 340, y: 60, width: 140, height: 54, text: "Start" },
          { id: "p1", symbol: "process", x: 335, y: 170, text: "Do the first thing" },
          { id: "d1", symbol: "decision", x: 325, y: 290, width: 170, height: 96, text: "Did it work?" },
          { id: "p2", symbol: "process", x: 335, y: 440, text: "Handle the result" },
          { id: "p3", symbol: "process", x: 590, y: 305, text: "Try again" },
          { id: "t2", symbol: "terminator", x: 340, y: 560, width: 140, height: 54, text: "End" },
        ],
        [
          { from: ["t1", BOTTOM], to: ["p1", TOP] },
          { from: ["p1", BOTTOM], to: ["d1", TOP] },
          { from: ["d1", BOTTOM], to: ["p2", TOP], label: "Yes" },
          { from: ["d1", RIGHT], to: ["p3", LEFT], label: "No" },
          // The loop back up the page, routed by hand around the right edge.
          { from: ["p3", TOP], to: ["p1", RIGHT], bends: [{ x: 665, y: 205 }] },
          { from: ["p2", BOTTOM], to: ["t2", TOP] },
        ],
      ),
  },

  {
    name: "Approval workflow",
    build: () =>
      build(
        "Approval workflow",
        [
          { id: "s", symbol: "terminator", x: 90, y: 90, width: 130, height: 52, text: "Request filed" },
          { id: "i", symbol: "data", x: 270, y: 84, width: 170, height: 64, text: "Collect details" },
          { id: "r", symbol: "process", x: 490, y: 84, text: "Manager reviews" },
          { id: "d", symbol: "decision", x: 700, y: 66, width: 180, height: 100, text: "Approved?" },
          { id: "y", symbol: "process", x: 700, y: 250, width: 180, height: 64, text: "Provision access" },
          { id: "n", symbol: "document", x: 460, y: 250, width: 170, height: 74, text: "Send rejection" },
          { id: "e", symbol: "terminator", x: 715, y: 390, width: 150, height: 52, text: "Done" },
        ],
        [
          { from: ["s", RIGHT], to: ["i", LEFT] },
          { from: ["i", RIGHT], to: ["r", LEFT] },
          { from: ["r", RIGHT], to: ["d", LEFT] },
          { from: ["d", BOTTOM], to: ["y", TOP], label: "Yes" },
          { from: ["d", LEFT], to: ["n", TOP], label: "No", bends: [{ x: 545, y: 116 }] },
          { from: ["y", BOTTOM], to: ["e", TOP] },
          { from: ["n", BOTTOM], to: ["e", LEFT], bends: [{ x: 545, y: 416 }] },
        ],
      ),
  },

  {
    name: "Swimlane process",
    build: () => {
      const doc = build(
        "Swimlane process",
        [
          { id: "lane", symbol: "swimlane-h3", x: 60, y: 70, width: 900, height: 420, text: "" },
          { id: "a1", symbol: "terminator", x: 160, y: 110, width: 130, height: 50, text: "Order placed" },
          { id: "a2", symbol: "process", x: 360, y: 105, width: 160, height: 60, text: "Validate order" },
          { id: "b1", symbol: "decision", x: 350, y: 240, width: 180, height: 90, text: "In stock?" },
          { id: "b2", symbol: "process", x: 620, y: 250, width: 160, height: 60, text: "Back-order" },
          { id: "c1", symbol: "process", x: 360, y: 385, width: 160, height: 60, text: "Ship it" },
          { id: "c2", symbol: "terminator", x: 620, y: 390, width: 140, height: 50, text: "Delivered" },
        ],
        [
          { from: ["a1", RIGHT], to: ["a2", LEFT] },
          { from: ["a2", BOTTOM], to: ["b1", TOP] },
          { from: ["b1", RIGHT], to: ["b2", LEFT], label: "No" },
          { from: ["b1", BOTTOM], to: ["c1", TOP], label: "Yes" },
          { from: ["b2", BOTTOM], to: ["c2", TOP] },
          { from: ["c1", RIGHT], to: ["c2", LEFT] },
        ],
      );
      // The lane sits behind everything, and takes no part in the flow.
      const lane = doc.pages[0].elements.find((e) => e.id === "lane");
      if (lane && lane.kind === "shape") {
        lane.z = 0;
        lane.style.fill = "transparent";
        lane.style.stroke = "#b9c2d0";
      }
      return doc;
    },
  },

  {
    name: "Decision tree",
    build: () =>
      build(
        "Decision tree",
        [
          { id: "q", symbol: "decision", x: 400, y: 70, width: 200, height: 100, text: "Is the input valid?" },
          { id: "a", symbol: "process", x: 170, y: 250, text: "Report the error" },
          { id: "b", symbol: "decision", x: 590, y: 235, width: 190, height: 96, text: "Cached?" },
          { id: "c", symbol: "process", x: 480, y: 420, text: "Serve from cache" },
          { id: "d", symbol: "process", x: 730, y: 420, text: "Compute and cache" },
        ],
        [
          { from: ["q", LEFT], to: ["a", TOP], label: "No", bends: [{ x: 245, y: 120 }] },
          { from: ["q", RIGHT], to: ["b", TOP], label: "Yes", bends: [{ x: 685, y: 120 }] },
          { from: ["b", BOTTOM], to: ["c", TOP], label: "Yes", bends: [{ x: 685, y: 380 }, { x: 555, y: 380 }] },
          { from: ["b", RIGHT], to: ["d", TOP], label: "No", bends: [{ x: 805, y: 283 }] },
        ],
      ),
  },
];

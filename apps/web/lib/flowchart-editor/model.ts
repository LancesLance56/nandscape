/**
 * The drawing document.
 *
 * Deliberately *not* the `FlowchartSpec` in lib/flowchart: that one describes a
 * chart's meaning and hands every question of pixels to an auto-layout engine,
 * which is right for a diagram embedded in a tutorial and reviewed like code.
 * This one is the opposite and on purpose - it is what a drawing tool edits.
 * Every coordinate here was put there by a person, and nothing in this codebase
 * is allowed to move any of it.
 *
 * The single rule the whole editor is built around: **there is no router**.
 * A connector stores the exact polyline the user drew, point for point. When a
 * shape moves, an attached endpoint slides to its connection point and the two
 * segments touching it stretch - every interior bend stays where it was put.
 * Nothing recomputes a path, ever, so a drawing never rearranges itself between
 * one session and the next.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type ShapeStyleKey = keyof ShapeStyle;

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** SVG dash array, or "" for a solid outline. */
  dash: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  valign: "top" | "middle" | "bottom";
  opacity: number;
  shadow: boolean;
  /** Corner rounding for symbols that honour it. Ignored by the rest. */
  radius: number;
}

export interface Shape {
  id: string;
  kind: "shape";
  /** Key into the symbol catalogue (see symbols.ts). */
  symbol: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise, about the shape's centre. */
  rotation: number;
  text: string;
  style: ShapeStyle;
  /** Stacking order across the whole page - shapes and connectors share it. */
  z: number;
  locked?: boolean;
  /** Id of the group this belongs to, when it has been grouped. */
  groupId?: string;
  /**
   * The "why" behind this step, shown on demand rather than in the box.
   *
   * A process box has room for "swap a[i], a[j]" and nothing else, so the
   * reason it exists has to live somewhere. A panel that opens when a reader
   * asks beats crowding every box with prose.
   */
  note?: string;
  /** Small corner badge, e.g. a stage number. */
  badge?: string;
}

/** How a connector's end is anchored. */
export type Endpoint =
  | { kind: "free"; x: number; y: number }
  | {
      kind: "shape";
      shapeId: string;
      /** Index into the shape's 16 connection points. */
      port: number;
    };

export type LineKind = "straight" | "orthogonal" | "curved" | "rounded" | "arc";

export type ArrowHead = "none" | "arrow" | "open" | "circle" | "diamond" | "bar";

export interface LineStyle {
  stroke: string;
  strokeWidth: number;
  dash: string;
  startArrow: ArrowHead;
  endArrow: ArrowHead;
  opacity: number;
  /** Corner radius, honoured by the `rounded` kind only. */
  radius: number;
  fontFamily: string;
  fontSize: number;
  textColor: string;
}

export interface Line {
  id: string;
  kind: "line";
  lineKind: LineKind;
  from: Endpoint;
  to: Endpoint;
  /**
   * The bends the user placed, in page coordinates, in order, *excluding* the
   * two endpoints. This is the routing. Nothing but a user gesture writes it.
   */
  waypoints: Point[];
  style: LineStyle;
  label: string;
  z: number;
  locked?: boolean;
  groupId?: string;
  note?: string;
}

export type Element = Shape | Line;

/**
 * One frame of a replayable path through the drawing.
 *
 * A static diagram says what the pieces are; a walkthrough says what order
 * they happen in, which for an algorithm is usually the hard part. Each step
 * names one element and carries the sentence that goes with it.
 */
export interface WalkStep {
  id: string;
  /** Element highlighted at this step - a shape or a connector. */
  target?: string;
  caption: string;
}

export interface Page {
  id: string;
  name: string;
  /** Page size in document units (1 unit = 1 px at 100%). */
  width: number;
  height: number;
  background: string;
  elements: Element[];
  /** An ordered path through the page, for the reader-facing player. */
  walkthrough?: WalkStep[];
}

export interface Doc {
  pages: Page[];
  title: string;
}

/* -------------------------------------------------------------------------
 * Defaults
 * ---------------------------------------------------------------------- */

/** US Letter, landscape, at 96 dpi - the size a flowchart is usually printed. */
export const PAGE_WIDTH = 1056;
export const PAGE_HEIGHT = 816;

/**
 * Paper colours, not chrome colours.
 *
 * A drawing is ink on a white sheet in both themes, so these are literals
 * rather than the theme's CSS variables: the values travel in the saved JSON
 * and into an exported SVG, where `var(--ink)` would resolve to nothing.
 * They are the site's paper tokens by value - see --paper-ink in globals.css.
 */
export const PAPER_INK = "#252525";
export const PAPER_LINE = "#cfcfcf";
export const PAPER_ACCENT = "#1f6b33";

export const DEFAULT_SHAPE_STYLE: ShapeStyle = {
  fill: "#ffffff",
  stroke: PAPER_INK,
  strokeWidth: 1.5,
  dash: "",
  textColor: PAPER_INK,
  fontFamily: "Inter",
  fontSize: 12,
  bold: false,
  italic: false,
  underline: false,
  align: "center",
  valign: "middle",
  opacity: 1,
  shadow: false,
  radius: 8,
};

export const DEFAULT_LINE_STYLE: LineStyle = {
  stroke: PAPER_INK,
  strokeWidth: 1.5,
  dash: "",
  startArrow: "none",
  endArrow: "arrow",
  opacity: 1,
  radius: 8,
  fontFamily: "Inter",
  fontSize: 11,
  textColor: PAPER_INK,
};

/**
 * The font stack a stored family name is rendered through.
 *
 * The site's face is loaded by next/font under a generated family name, so a
 * stored "Inter" cannot match it directly - it falls through to the variable
 * instead, which is the real thing. Any other choice (Georgia, Courier) wins
 * outright, and the stack still degrades sensibly in an exported SVG opened
 * somewhere that has neither.
 */
export function fontStack(family: string): string {
  return `${family}, var(--font-inter-sans), system-ui, sans-serif`;
}

let seq = 0;

/** Unique within a tab, which is as far as a local drawing ever travels. */
export function newId(prefix = "e"): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`;
}

export function emptyPage(name = "Page 1"): Page {
  return {
    id: newId("p"),
    name,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    background: "#ffffff",
    elements: [],
  };
}

export function emptyDoc(): Doc {
  return { title: "Untitled drawing", pages: [emptyPage()] };
}

/* -------------------------------------------------------------------------
 * Narrowing helpers
 * ---------------------------------------------------------------------- */

export const isShape = (e: Element): e is Shape => e.kind === "shape";
export const isLine = (e: Element): e is Line => e.kind === "line";

export function shapesOf(page: Page): Shape[] {
  return page.elements.filter(isShape);
}

export function linesOf(page: Page): Line[] {
  return page.elements.filter(isLine);
}

export function findElement(page: Page, id: string): Element | undefined {
  return page.elements.find((e) => e.id === id);
}

export function findShape(page: Page, id: string): Shape | undefined {
  const e = page.elements.find((x) => x.id === id);
  return e && isShape(e) ? e : undefined;
}

/** Next free stacking slot, so a new element lands on top. */
export function topZ(page: Page): number {
  return page.elements.reduce((m, e) => Math.max(m, e.z), 0) + 1;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

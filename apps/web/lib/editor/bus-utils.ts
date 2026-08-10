import type { BusMergeNodeData, BusSplitNodeData, EditorNode } from "@/types/editor";

export const DEFAULT_BUS_WIDTH = 4;
export const MIN_BUS_WIDTH = 1;
export const MAX_BUS_WIDTH = 8;

export function clampBusWidth(width: number): number {
  if (!Number.isFinite(width)) return DEFAULT_BUS_WIDTH;
  return Math.min(MAX_BUS_WIDTH, Math.max(MIN_BUS_WIDTH, Math.round(width)));
}

export function busWidthOf(node: EditorNode): number {
  const data = node.data as BusMergeNodeData | BusSplitNodeData;
  return clampBusWidth(data.width ?? DEFAULT_BUS_WIDTH);
}

/**
 * The one connection a bus wire actually represents: a Bus Merge's
 * "bus-out" handle feeding a Bus Split's "bus-in" handle. Every other
 * handle on these two node kinds (in-0..in-N, out-0..out-N) is an ordinary
 * single-bit pin and needs no special-casing anywhere else in the app,
 * compile-circuit.ts and live-simulate.ts both only branch on this.
 */
export function isBusToBusConnection(
  sourceNode: EditorNode | undefined,
  sourceHandle: string | null | undefined,
  targetNode: EditorNode | undefined,
  targetHandle: string | null | undefined,
): boolean {
  return (
    sourceNode?.data.kind === "bus-merge" &&
    sourceHandle === "bus-out" &&
    targetNode?.data.kind === "bus-split" &&
    targetHandle === "bus-in"
  );
}

export function laneHandle(prefix: "in" | "out", index: number): string {
  return `${prefix}-${index}`;
}

/** a..g order, matching SevenSegmentNodeData.names and the physical layout
 *  in seven-segment-node.tsx (a=top, b=upper-right, c=lower-right,
 *  d=bottom, e=lower-left, f=upper-left, g=middle). */
export const SEVEN_SEGMENT_LABELS = ["A", "B", "C", "D", "E", "F", "G"] as const;

export const DEFAULT_SEVEN_SEGMENT_PREFIX = "SEG_";

export function sevenSegmentLaneNames(prefix: string): [string, string, string, string, string, string, string] {
  const p = prefix.trim() || DEFAULT_SEVEN_SEGMENT_PREFIX;
  return SEVEN_SEGMENT_LABELS.map((l) => `${p}${l}`) as [string, string, string, string, string, string, string];
}

/** Derives a `label` + `width` pair's lane names, index 0 = MSB, e.g.
 *  ("S", 4) -> ["S3","S2","S1","S0"]. Used by both the starter-graph
 *  builder and BusOutputInspectorPanel's "regenerate from label+width"
 *  convenience,  BusOutputNodeData itself only ever stores the resulting
 *  array, see its doc comment in types/editor.ts. */
export function busOutputLaneNames(label: string, width: number): string[] {
  const w = clampBusWidth(width);
  const l = label.trim() || "Y";
  return Array.from({ length: w }, (_, i) => `${l}${w - 1 - i}`);
}

/** Inverse-ish of sevenSegmentLaneNames: strips the trailing a..g label off
 *  each name and returns the common prefix if every lane agrees with
 *  SEVEN_SEGMENT_LABELS order, else "". Used to seed the inspector's prefix
 *  field from a node's current names. */
export function commonSevenSegmentPrefix(names: readonly string[]): string {
  if (names.length !== SEVEN_SEGMENT_LABELS.length) return "";
  const prefixes = names.map((n, i) => (n.endsWith(SEVEN_SEGMENT_LABELS[i]) ? n.slice(0, -1) : null));
  return prefixes.every((p) => p !== null && p === prefixes[0]) ? (prefixes[0] as string) : "";
}

/** Inverse-ish of busOutputLaneNames: strips a trailing run of digits off
 *  each name and returns the common prefix if every lane agrees, else "".
 *  Used to seed the inspector's label field from a node's current names,
 *  including ones a puzzle's starter graph set directly. */
export function commonBusLabel(names: string[]): string {
  if (names.length === 0) return "";
  const stripped = names.map((n) => n.replace(/\d+$/, ""));
  return stripped.every((s) => s === stripped[0]) ? stripped[0] : "";
}

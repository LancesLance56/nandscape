import type { EdgeTypes } from "@xyflow/react";
import { WireEdge } from "./wire-edge";

/**
 * Mirrors nodes/node-registry.tsx. Currently only one edge type exists
 * (a circuit wire), but bus/multi-bit wires are a plausible future entry
 * here (e.g. "bus" rendered as a thicker line with a bit-width label).
 */
export const edgeTypes: EdgeTypes = {
  wire: WireEdge,
};

import { SignalState } from "@nandscape/engine";
import { CircuitBuilder } from "@/lib/editor/circuit-builder";
import type { EditorEdge, EditorNode } from "@/types/editor";
import type { PuzzleSpec } from "@/types/puzzle";

const ROW_SPACING = 120;
const OUTPUT_X = 640;

export function buildPuzzleStarterGraph(puzzle: PuzzleSpec): { nodes: EditorNode[]; edges: EditorEdge[] } {
  const builder = new CircuitBuilder();
  puzzle.inputs.forEach((port, i) =>
    builder.input(port.name, 40, 40 + i * ROW_SPACING, {
      value: port.defaultValue === 1 ? SignalState.HIGH : SignalState.LOW,
    }),
  );
  puzzle.outputs.forEach((port, i) => builder.output(port.name, OUTPUT_X, 40 + i * ROW_SPACING));
  return builder.build();
}
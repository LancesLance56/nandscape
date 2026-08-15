import { SignalState } from "@nandscape/engine";
import { CircuitBuilder } from "@/lib/editor/circuit-builder";
import type { EditorEdge, EditorNode } from "@/types/editor";
import type { PuzzleSpec } from "@/types/puzzle";

const ROW_SPACING = 120;
const OUTPUT_X = 640;

export function buildPuzzleStarterGraph(puzzle: PuzzleSpec): { nodes: EditorNode[]; edges: EditorEdge[] } {
  const builder = new CircuitBuilder();

  // inputDisplay is purely a starter-canvas grouping hint (see its doc
  // comment in types/puzzle.ts): named ports it covers get one combined
  // Bus Input node instead of one Input toggle each. Grading still resolves
  // every name independently, so this never changes what counts as correct,
  // only how the blank canvas looks.
  const groupedInputNames = new Set<string>();
  let inputRow = 0;
  for (const group of puzzle.inputDisplay ?? []) {
    const values = group.names.map((name) => {
      const port = puzzle.inputs.find((p) => p.name === name);
      return port?.defaultValue === 1 ? SignalState.HIGH : SignalState.LOW;
    });
    builder.busInput(group.names, 40, 40 + inputRow * ROW_SPACING, { values });
    group.names.forEach((name) => groupedInputNames.add(name));
    inputRow += 1;
  }

  puzzle.inputs
    .filter((port) => !groupedInputNames.has(port.name))
    .forEach((port) => {
      builder.input(port.name, 40, 40 + inputRow * ROW_SPACING, {
        value: port.defaultValue === 1 ? SignalState.HIGH : SignalState.LOW,
      });
      inputRow += 1;
    });

  // outputDisplay is purely a starter-canvas grouping hint (see its doc
  // comment in types/puzzle.ts): named ports it covers get one combined
  // Bus Output/Seven-Segment node instead of one Output node each. Grading
  // still resolves every name independently, so this never changes what
  // counts as correct, only how the blank canvas looks.
  const groupedNames = new Set<string>();
  let row = 0;
  for (const group of puzzle.outputDisplay ?? []) {
    if (group.type === "bus") {
      builder.busOutput(group.names, OUTPUT_X, 40 + row * ROW_SPACING);
      group.names.forEach((name) => groupedNames.add(name));
      row += 1;
    } else {
      builder.sevenSegment(group.names, OUTPUT_X, 40 + row * ROW_SPACING);
      group.names.forEach((name) => groupedNames.add(name));
      row += 2; // taller node than a single output row, reserve extra space
    }
  }

  puzzle.outputs
    .filter((port) => !groupedNames.has(port.name))
    .forEach((port) => {
      builder.output(port.name, OUTPUT_X, 40 + row * ROW_SPACING);
      row += 1;
    });

  return builder.build();
}
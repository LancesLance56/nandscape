import { SignalState, gateTypeToString } from "@nandscape/engine";
import { evaluateLiveCircuit } from "@/lib/editor/live-simulate";
import { getGateRestriction } from "./gate-restrictions";
import type {
  EditorNode,
  EditorEdge,
  GateNodeData,
  IoNodeData,
  BusOutputNodeData,
  SevenSegmentNodeData,
} from "@/types/editor";
import type { PuzzleSpec, SequentialStep, TruthTableRow } from "@/types/puzzle";

export interface CaseGradeResult {
  index: number;
  passed: boolean;
  detail: string;
}

export interface GradeResult {
  passed: boolean;
  structuralError: string | null;
  caseResults: CaseGradeResult[];
}

export interface GradeOptions {
  onStep?: (patchedNodes: EditorNode[], signals: Record<string, SignalState>) => void | Promise<void>;
}

function bitToSignal(bit: 0 | 1): SignalState {
  return bit ? SignalState.HIGH : SignalState.LOW;
}

function signalStateBit(s: SignalState): string {
  if (s === SignalState.HIGH) return "1";
  if (s === SignalState.LOW) return "0";
  return s === SignalState.FLOAT ? "float" : "unknown";
}

function signalMatchesBit(signal: SignalState | undefined, bit: 0 | 1): boolean {
  return signal === bitToSignal(bit);
}

function setInputValues(nodes: EditorNode[], values: Record<string, 0 | 1>): EditorNode[] {
  return nodes.map((n) => {
    if (n.data.kind !== "input") return n;
    const name = (n.data as IoNodeData).name;
    if (!(name in values)) return n;
    return { ...n, data: { ...n.data, value: bitToSignal(values[name]) } };
  });
}

function findIoNodesByName(nodes: EditorNode[], kind: "input"): Map<string, EditorNode> {
  const map = new Map<string, EditorNode>();
  for (const node of nodes) {
    if (node.data.kind !== kind) continue;
    map.set((node.data as IoNodeData).name, node);
  }
  return map;
}

function findDuplicateName(nodes: EditorNode[], kind: "input"): string | null {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (node.data.kind !== kind) continue;
    const name = (node.data as IoNodeData).name;
    if (seen.has(name)) return name;
    seen.add(name);
  }
  return null;
}

/** Every named output port's location on the canvas. Spans plain "output"
 *  nodes (one name -> handle "in-0") and multi-lane display nodes
 *  ("bus-output"/"seven-segment", each names[i] -> handle `in-${i}`), since
 *  a puzzle's `outputDisplay` hint can put a given port name on either kind
 *  of node,  see puzzle-starter-graph.ts. Grading and the missing-output
 *  structural check both resolve output names through this map, never by
 *  assuming one node = one port. */
function outputNamesOf(node: EditorNode): string[] {
  if (node.data.kind === "output") return [(node.data as IoNodeData).name];
  if (node.data.kind === "bus-output" || node.data.kind === "seven-segment") {
    return (node.data as BusOutputNodeData | SevenSegmentNodeData).names;
  }
  return [];
}

interface OutputPinRef {
  node: EditorNode;
  handle: string;
}

function findOutputPins(nodes: EditorNode[]): Map<string, OutputPinRef> {
  const map = new Map<string, OutputPinRef>();
  for (const node of nodes) {
    outputNamesOf(node).forEach((name, i) => {
      if (!map.has(name)) map.set(name, { node, handle: `in-${i}` });
    });
  }
  return map;
}

function findDuplicateOutputName(nodes: EditorNode[]): string | null {
  const seen = new Set<string>();
  for (const node of nodes) {
    for (const name of outputNamesOf(node)) {
      if (seen.has(name)) return name;
      seen.add(name);
    }
  }
  return null;
}

function readOutputPin(ref: OutputPinRef, edges: EditorEdge[], signals: Record<string, SignalState>): SignalState {
  const incoming = edges.find((e) => e.target === ref.node.id && e.targetHandle === ref.handle);
  if (!incoming) return SignalState.FLOAT;
  return signals[incoming.id] ?? SignalState.FLOAT;
}

function checkStructure(puzzle: PuzzleSpec, nodes: EditorNode[]): string | null {
  // Circuit blocks (subcircuits) let a solver import a pre-built answer
  // wholesale, so they're rejected here even if one somehow lands on the
  // canvas (the palette hides them in puzzle mode, but this is the rule
  // that actually matters,  see gate-palette.tsx and toolbar.tsx for the
  // matching UI-level gating).
  if (nodes.some((n) => n.data.kind === "subcircuit")) {
    return "Circuit blocks aren't allowed for puzzles,  build it from primitive gates instead.";
  }

  const gateNodes = nodes.filter((n) => n.data.kind === "gate");

  if (puzzle.gateBudget != null && gateNodes.length > puzzle.gateBudget) {
    return `Uses ${gateNodes.length} gate(s), but the budget is ${puzzle.gateBudget}.`;
  }

  const restriction = getGateRestriction(puzzle);
  if (restriction) {
    const offender = gateNodes.find((n) => !restriction.isAllowed((n.data as GateNodeData).gateType));
    if (offender) {
      const offenderName = gateTypeToString((offender.data as GateNodeData).gateType);
      return `${offenderName} gates aren't allowed for this puzzle.`;
    }
  }

  const dupInput = findDuplicateName(nodes, "input");
  if (dupInput) return `Multiple input nodes are named "${dupInput}",  names must be unique.`;
  const dupOutput = findDuplicateOutputName(nodes);
  if (dupOutput) return `Multiple output ports are named "${dupOutput}",  names must be unique.`;

  const inputsByName = findIoNodesByName(nodes, "input");
  const missingInputs = puzzle.inputs.filter((p) => !inputsByName.has(p.name));
  if (missingInputs.length > 0) {
    return `Missing input node(s) named: ${missingInputs.map((p) => p.name).join(", ")}.`;
  }

  const outputPins = findOutputPins(nodes);
  const missingOutputs = puzzle.outputs.filter((p) => !outputPins.has(p.name));
  if (missingOutputs.length > 0) {
    return `Missing output node(s) named: ${missingOutputs.map((p) => p.name).join(", ")}.`;
  }

  return null;
}

async function gradeRow(
  nodes: EditorNode[],
  edges: EditorEdge[],
  row: TruthTableRow,
  index: number,
  options: GradeOptions,
): Promise<CaseGradeResult> {
  const patched = setInputValues(nodes, row.inputs);
  const signals = evaluateLiveCircuit(patched, edges);
  await options.onStep?.(patched, signals);

  const outputPins = findOutputPins(nodes);
  const mismatches: string[] = [];
  for (const [name, expected] of Object.entries(row.outputs)) {
    const ref = outputPins.get(name);
    const actual = ref ? readOutputPin(ref, edges, signals) : SignalState.FLOAT;
    if (!signalMatchesBit(actual, expected)) {
      mismatches.push(`${name}=${signalStateBit(actual)} (expected ${expected})`);
    }
  }

  const inputSummary = Object.entries(row.inputs)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");

  return mismatches.length === 0
    ? { index, passed: true, detail: `${inputSummary} → correct` }
    : { index, passed: false, detail: `${inputSummary} → ${mismatches.join(", ")}` };
}

async function gradeSequence(
  nodes: EditorNode[],
  edges: EditorEdge[],
  steps: SequentialStep[],
  index: number,
  options: GradeOptions,
): Promise<CaseGradeResult> {
  let state = nodes;
  let previousSignals: Record<string, SignalState> = {};
  const outputPins = findOutputPins(nodes);
  const stepFailures: string[] = [];

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex];
    if (step.setInputs) state = setInputValues(state, step.setInputs);

    if (step.pulseClock) {
      state = setInputValues(state, { [step.pulseClock]: 1 });
      previousSignals = evaluateLiveCircuit(state, edges, previousSignals);
      await options.onStep?.(state, previousSignals);
      state = setInputValues(state, { [step.pulseClock]: 0 });
    }

    previousSignals = evaluateLiveCircuit(state, edges, previousSignals);
    await options.onStep?.(state, previousSignals);

    const mismatches: string[] = [];
    for (const [name, expected] of Object.entries(step.expectOutputs)) {
      const ref = outputPins.get(name);
      const actual = ref ? readOutputPin(ref, edges, previousSignals) : SignalState.FLOAT;
      if (!signalMatchesBit(actual, expected)) {
        mismatches.push(`${name}=${signalStateBit(actual)} (expected ${expected})`);
      }
    }

    if (mismatches.length > 0) {
      stepFailures.push(`step ${stepIndex + 1}: ${mismatches.join(", ")}`);
    }
  }

  return stepFailures.length === 0
    ? { index, passed: true, detail: `${steps.length} step(s),  correct` }
    : { index, passed: false, detail: stepFailures.join("; ") };
}

export async function gradePuzzle(
  puzzle: PuzzleSpec,
  nodes: EditorNode[],
  edges: EditorEdge[],
  options: GradeOptions = {},
): Promise<GradeResult> {
  const structuralError = checkStructure(puzzle, nodes);
  if (structuralError) {
    return { passed: false, structuralError, caseResults: [] };
  }

  const caseResults: CaseGradeResult[] = [];
  for (let i = 0; i < puzzle.testCases.length; i++) {
    const testCase = puzzle.testCases[i];
    if (testCase.row) {
      caseResults.push(await gradeRow(nodes, edges, testCase.row, i, options));
    } else if (testCase.sequence) {
      caseResults.push(await gradeSequence(nodes, edges, testCase.sequence, i, options));
    }
  }

  return {
    passed: caseResults.length > 0 && caseResults.every((c) => c.passed),
    structuralError: null,
    caseResults,
  };
}
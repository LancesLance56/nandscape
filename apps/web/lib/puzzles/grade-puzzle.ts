import { SignalState, gateTypeToString } from "@nandscape/engine";
import { evaluateLiveCircuit } from "@/lib/editor/live-simulate";
import { getGateRestriction } from "./gate-restrictions";
import type { EditorNode, EditorEdge, GateNodeData, IoNodeData } from "@/types/editor";
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

function findIoNodesByName(nodes: EditorNode[], kind: "input" | "output"): Map<string, EditorNode> {
  const map = new Map<string, EditorNode>();
  for (const node of nodes) {
    if (node.data.kind !== kind) continue;
    map.set((node.data as IoNodeData).name, node);
  }
  return map;
}

function findDuplicateName(nodes: EditorNode[], kind: "input" | "output"): string | null {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (node.data.kind !== kind) continue;
    const name = (node.data as IoNodeData).name;
    if (seen.has(name)) return name;
    seen.add(name);
  }
  return null;
}

function readOutput(node: EditorNode, edges: EditorEdge[], signals: Record<string, SignalState>): SignalState {
  const incoming = edges.find((e) => e.target === node.id);
  if (!incoming) return SignalState.FLOAT;
  return signals[incoming.id] ?? SignalState.FLOAT;
}

function checkStructure(puzzle: PuzzleSpec, nodes: EditorNode[]): string | null {
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
  if (dupInput) return `Multiple input nodes are named "${dupInput}" — names must be unique.`;
  const dupOutput = findDuplicateName(nodes, "output");
  if (dupOutput) return `Multiple output nodes are named "${dupOutput}" — names must be unique.`;

  const inputsByName = findIoNodesByName(nodes, "input");
  const missingInputs = puzzle.inputs.filter((p) => !inputsByName.has(p.name));
  if (missingInputs.length > 0) {
    return `Missing input node(s) named: ${missingInputs.map((p) => p.name).join(", ")}.`;
  }

  const outputsByName = findIoNodesByName(nodes, "output");
  const missingOutputs = puzzle.outputs.filter((p) => !outputsByName.has(p.name));
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

  const outputsByName = findIoNodesByName(nodes, "output");
  const mismatches: string[] = [];
  for (const [name, expected] of Object.entries(row.outputs)) {
    const node = outputsByName.get(name);
    const actual = node ? readOutput(node, edges, signals) : SignalState.FLOAT;
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
  const outputsByName = findIoNodesByName(nodes, "output");
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
      const node = outputsByName.get(name);
      const actual = node ? readOutput(node, edges, previousSignals) : SignalState.FLOAT;
      if (!signalMatchesBit(actual, expected)) {
        mismatches.push(`${name}=${signalStateBit(actual)} (expected ${expected})`);
      }
    }

    if (mismatches.length > 0) {
      stepFailures.push(`step ${stepIndex + 1}: ${mismatches.join(", ")}`);
    }
  }

  return stepFailures.length === 0
    ? { index, passed: true, detail: `${steps.length} step(s) — correct` }
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
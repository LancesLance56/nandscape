"use client";

import { useMemo, useState } from "react";
import { combinationSumSteps, subsetsSteps } from "@/lib/backtracking/algorithms";
import { PanelBox } from "../shared/panel-ui";
import { BacktrackingRunner, type ToggleGroup } from "./backtracking-runner";

type Problem = "subsets" | "combination-sum";

function readStrings(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const out = value.filter((v): v is string => typeof v === "string");
  return out.length > 0 ? out.slice(0, 5) : fallback;
}

function readNumbers(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const out = value.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  // Sorted ascending because the pruned branch relies on it: once one
  // candidate overshoots, every later one does too.
  return out.length > 0 ? out.slice(0, 6).sort((a, b) => a - b) : fallback;
}

/**
 * The state-space tree for the two collection-building problems.
 *
 * Subsets and combination sum share a widget on purpose. They build the
 * identical tree; combination sum just adds one comparison that lops
 * branches off it. Flipping between them with the same renderer is the
 * clearest way to show that pruning is a property of the constraint, not of
 * the algorithm.
 */
export function BacktrackingTreeWidget({ data }: { data: Record<string, unknown> }) {
  const pinned = data.problem === "subsets" || data.problem === "combination-sum" ? (data.problem as Problem) : null;
  const items = readStrings(data.items, ["a", "b", "c"]);
  const candidates = readNumbers(data.candidates, [2, 3, 5, 6, 8]);
  const target = typeof data.target === "number" ? data.target : 10;

  const [problem, setProblem] = useState<Problem>(pinned ?? "subsets");
  const [pruning, setPruning] = useState(data.pruning !== false);

  const run = useMemo(
    () => (problem === "subsets" ? subsetsSteps(items) : combinationSumSteps(candidates, target, pruning)),
    [problem, pruning, items, candidates, target],
  );

  // Each node already carries the partial solution it represents, so the
  // readout is a lookup rather than a second reconstruction from the path
  // that could drift out of step with the tree.
  const partialById = useMemo(() => new Map(run.nodes.map((n) => [n.id, n.partial])), [run]);

  const toggles: ToggleGroup[] = [];
  if (!pinned) {
    toggles.push({
      id: "problem",
      label: "Problem",
      active: problem,
      onChange: (id) => setProblem(id as Problem),
      options: [
        { id: "subsets", label: `Subsets of ${items.join("")}` },
        { id: "combination-sum", label: `Sum to ${target}` },
      ],
    });
  }
  if (problem === "combination-sum") {
    toggles.push({
      id: "pruning",
      label: "Pruning",
      active: pruning ? "on" : "off",
      onChange: (id) => setPruning(id === "on"),
      options: [
        { id: "on", label: "Cut branches that overshoot" },
        { id: "off", label: "Build everything, test at the end" },
      ],
    });
  }

  return (
    <BacktrackingRunner
      run={run}
      toggles={toggles}
      solutionsLabel={problem === "subsets" ? "Subsets found" : "Combinations found"}
      showDeadInLegend={problem === "combination-sum"}
      hint={
        problem === "subsets"
          ? "Every node is an answer here, so the whole tree is green by the end."
          : `Candidates ${candidates.join(", ")}, each usable once. Target ${target}.`
      }
      panel={(step) => (
        <PanelBox title={problem === "subsets" ? "Current subset" : "Current combination"}>
          <span className="font-mono text-sm font-semibold text-ink">
            {(step.activeId && partialById.get(step.activeId)) || <span className="italic text-slate">empty</span>}
          </span>
        </PanelBox>
      )}
    />
  );
}

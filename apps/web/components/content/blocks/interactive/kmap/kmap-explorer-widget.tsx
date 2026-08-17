"use client";

import { useMemo, useState } from "react";
import { DEFAULT_BLOCK_COLORS } from "@/lib/editor/block-colors";
import {
  type CellValue,
  type Implicant,
  MAX_VARS,
  MIN_VARS,
  emptyCells,
  implicantFromCells,
  implicantKey,
  isCellValue,
  layoutFor,
  literalCount,
  mintermsOf,
  mintermsWhere,
  sopExpression,
  termFor,
} from "@/lib/kmap/kmap";
import { gradeCover, solveKMap } from "@/lib/kmap/solve";
import { WidgetFrame } from "../widget-frame";
import { cn } from "@/lib/cn";
import { KMapCellLegend, KMapGrid, type DrawnGroup } from "./kmap-grid";

type Mode = "solve" | "practice";

const DEFAULT_VARS = ["A", "B", "C"];

interface ConfirmedGroup {
  implicant: Implicant;
  term: string;
  color: string;
}

/* -------------------------------------------------------------------------
 * Data parsing (backwards compatible with the original widget's shape)
 * ---------------------------------------------------------------------- */

function resolveVariables(data: Record<string, unknown>): string[] {
  const v = data.variables;
  if (!Array.isArray(v) || v.length < MIN_VARS || v.length > MAX_VARS) return [...DEFAULT_VARS];
  return v.every((x): x is string => typeof x === "string") ? v : [...DEFAULT_VARS];
}

/**
 * Accepts either the original `truthTable` of 0/1 or the newer `cells`,
 * which also allows "x". Tutorials written against the old widget keep
 * working untouched.
 */
function resolveCells(data: Record<string, unknown>, varCount: number): CellValue[] | null {
  const size = 1 << varCount;
  const source = Array.isArray(data.cells) ? data.cells : Array.isArray(data.truthTable) ? data.truthTable : null;
  if (!source || source.length !== size) return null;
  return source.every(isCellValue) ? (source as CellValue[]) : null;
}

function resolveMode(data: Record<string, unknown>, hasTable: boolean): Mode {
  if (data.mode === "solve" || data.mode === "practice") return data.mode;
  // A widget handed a fixed table is a lesson exercise (group it yourself);
  // one handed nothing is the solver tool starting from a blank map.
  return hasTable ? "practice" : "solve";
}

/* -------------------------------------------------------------------------
 * Widget
 * ---------------------------------------------------------------------- */

export function KMapExplorerWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const variables = resolveVariables(data);
  const varCount = variables.length;
  const layout = useMemo(() => layoutFor(variables), [variables]);
  const initialCells = resolveCells(data, varCount);
  const mode = resolveMode(data, initialCells !== null);
  const title = typeof data.title === "string" ? data.title : "Karnaugh map";
  const className = typeof data.className === "string" ? data.className : undefined;
  const allowDontCare = data.allowDontCare !== false;

  const [cells, setCells] = useState<CellValue[]>(initialCells ?? emptyCells(varCount));
  const [selected, setSelected] = useState<number[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedGroup[]>([]);
  const [message, setMessage] = useState<{ text: string; tone: "info" | "good" | "bad" }>({
    text:
      mode === "solve"
        ? "Click a cell to cycle it between 0, 1 and don't-care. The minimal expression updates as you go."
        : "Select the 1s that belong together, then confirm the group.",
    tone: "info",
  });
  const [showAnswer, setShowAnswer] = useState(false);

  const solution = useMemo(() => solveKMap(cells, varCount), [cells, varCount]);
  const ones = useMemo(() => mintermsWhere(cells, 1), [cells]);
  const dontCares = useMemo(() => mintermsWhere(cells, "x"), [cells]);

  /* ---------------- solve mode ---------------- */

  const cycleCell = (minterm: number) => {
    setCells((prev) => {
      const next = [...prev];
      const cur = next[minterm];
      next[minterm] = cur === 0 ? 1 : cur === 1 ? (allowDontCare ? "x" : 0) : 0;
      return next;
    });
    setConfirmed([]);
    setSelected([]);
  };

  /* ---------------- practice mode ---------------- */

  const toggleSelect = (minterm: number) => {
    setSelected((prev) => (prev.includes(minterm) ? prev.filter((m) => m !== minterm) : [...prev, minterm]));
    setMessage({ text: "", tone: "info" });
  };

  const confirmGroup = () => {
    if (selected.length === 0) return;

    if (selected.some((m) => cells[m] === 0)) {
      setMessage({ text: "A group can only contain 1s and don't-cares, never a 0.", tone: "bad" });
      return;
    }
    if (selected.every((m) => cells[m] === "x")) {
      setMessage({ text: "That group is all don't-cares, so it covers nothing that needs covering.", tone: "bad" });
      return;
    }

    const imp = implicantFromCells(selected, varCount);
    if (!imp) {
      setMessage({
        text: "Not a legal group. Groups must be 1, 2, 4 or 8 cells forming a rectangle, and the map wraps at its edges.",
        tone: "bad",
      });
      return;
    }

    const key = implicantKey(imp);
    if (confirmed.some((g) => implicantKey(g.implicant) === key)) {
      setMessage({ text: "You already have that group.", tone: "bad" });
      setSelected([]);
      return;
    }

    const term = termFor(imp, variables);
    setConfirmed((prev) => [
      ...prev,
      { implicant: imp, term, color: DEFAULT_BLOCK_COLORS[prev.length % DEFAULT_BLOCK_COLORS.length] },
    ]);
    setSelected([]);
    setMessage({ text: `Added ${term}.`, tone: "good" });
  };

  const reset = () => {
    setConfirmed([]);
    setSelected([]);
    setShowAnswer(false);
    setMessage({ text: "Select the 1s that belong together, then confirm the group.", tone: "info" });
  };

  const grade = useMemo(
    () => gradeCover(confirmed.map((g) => g.implicant), cells, varCount, solution),
    [confirmed, cells, varCount, solution],
  );

  /* ---------------- what to draw ---------------- */

  const solutionGroups: DrawnGroup[] = useMemo(
    () =>
      solution.cover.map((imp, i) => ({
        implicant: imp,
        color: DEFAULT_BLOCK_COLORS[i % DEFAULT_BLOCK_COLORS.length],
        label: termFor(imp, variables),
      })),
    [solution, variables],
  );

  const drawnGroups: DrawnGroup[] =
    mode === "solve"
      ? solutionGroups
      : showAnswer
        ? solutionGroups.map((g) => ({ ...g, dimmed: false }))
        : confirmed.map((g) => ({ implicant: g.implicant, color: g.color, label: g.term }));

  const expression = mode === "solve" || showAnswer
    ? sopExpression(solution.cover, variables)
    : confirmed.length > 0
      ? confirmed.map((g) => g.term).join(" + ")
      : null;

  const canonicalLiterals = ones.length * varCount;
  const minimalLiterals = solution.cover.reduce((n, imp) => n + literalCount(imp, varCount), 0);

  const content = (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-8">
      <div className="flex flex-col items-center gap-4">
        <KMapGrid
          layout={layout}
          cells={cells}
          groups={drawnGroups}
          selected={selected}
          onCellClick={mode === "solve" ? cycleCell : toggleSelect}
          ariaLabel={`Karnaugh map for ${variables.join("")}`}
        />
        <KMapCellLegend showDontCare={allowDontCare} />

        <div className="flex flex-wrap justify-center gap-2">
          {mode === "practice" && (
            <>
              <button
                type="button"
                onClick={confirmGroup}
                disabled={selected.length === 0}
                className="rounded-lg bg-copper px-3.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-copper-dark disabled:opacity-40"
              >
                Confirm group
              </button>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-2"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => setShowAnswer((v) => !v)}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-2"
              >
                {showAnswer ? "Hide answer" : "Show answer"}
              </button>
            </>
          )}
          {mode === "solve" && (
            <button
              type="button"
              onClick={() => setCells(emptyCells(varCount))}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-2"
            >
              Clear map
            </button>
          )}
          <button
            type="button"
            onClick={mode === "solve" ? () => setCells(initialCells ?? emptyCells(varCount)) : reset}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-[11px] font-semibold text-signal-coral hover:bg-surface-2"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <ExpressionPanel
          label={mode === "solve" || showAnswer ? "Minimal sum of products" : "Your expression"}
          expression={expression}
          empty={mode === "practice" ? "No groups yet." : undefined}
        />

        {(mode === "solve" || showAnswer) && ones.length > 0 && !solution.isTautology && (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="terms" value={solution.cover.length} />
            <Stat label="literals" value={minimalLiterals} />
            <Stat
              label="vs minterms"
              value={canonicalLiterals > 0 ? `-${Math.max(0, Math.round((1 - minimalLiterals / canonicalLiterals) * 100))}%` : "-"}
              tone="good"
            />
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface-2/40 p-3">
          <div className="mb-2 text-[11px] font-semibold text-slate">
            {mode === "solve" || showAnswer ? "Groups in the minimal cover" : "Groups you have found"}
          </div>
          <GroupChips
            groups={
              mode === "solve" || showAnswer
                ? solution.cover.map((imp, i) => ({
                    term: termFor(imp, variables),
                    color: DEFAULT_BLOCK_COLORS[i % DEFAULT_BLOCK_COLORS.length],
                    size: mintermsOf(imp, varCount).length,
                  }))
                : confirmed.map((g) => ({
                    term: g.term,
                    color: g.color,
                    size: mintermsOf(g.implicant, varCount).length,
                  }))
            }
          />
        </div>

        {mode === "practice" && (
          <PracticeFeedback
            grade={grade}
            hasGroups={confirmed.length > 0}
            onesCount={ones.length}
            message={message}
          />
        )}

        {mode === "solve" && (
          <p className="text-[11px] leading-relaxed text-slate">
            {ones.length === 0
              ? "The map is empty, so the function is constant 0. Click cells to set them to 1."
              : solution.isTautology
                ? "Every cell is 1 or don't-care, so the function simplifies to the constant 1."
                : `${ones.length} one${ones.length === 1 ? "" : "s"}${dontCares.length > 0 ? ` and ${dontCares.length} don't-care${dontCares.length === 1 ? "" : "s"}` : ""}, covered by ${solution.cover.length} group${solution.cover.length === 1 ? "" : "s"}. ${solution.alternativeCovers.length > 0 ? `There ${solution.alternativeCovers.length === 1 ? "is 1 other grouping" : `are ${solution.alternativeCovers.length} other groupings`} that is just as small.` : "This grouping is the only minimal one."}`}
          </p>
        )}
      </div>
    </div>
  );

  if (!frame) return content;

  const subtitle =
    mode === "solve"
      ? `${ones.length} one${ones.length === 1 ? "" : "s"} · ${solution.cover.length} group${solution.cover.length === 1 ? "" : "s"}`
      : `${grade.termCount} / ${solution.cover.length} groups`;

  return (
    <WidgetFrame title={title} subtitle={subtitle} className={className}>
      {content}
    </WidgetFrame>
  );
}

/* -------------------------------------------------------------------------
 * Panels
 * ---------------------------------------------------------------------- */

function ExpressionPanel({
  label,
  expression,
  empty,
}: {
  label: string;
  expression: string | null;
  empty?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-surface-card to-surface-2/50 p-4">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate">{label}</div>
      <p className="break-words font-mono text-lg font-bold leading-snug text-ink">
        {expression ? (
          <>
            <span className="text-copper-dark">F</span> = {expression}
          </>
        ) : (
          <span className="text-base font-normal italic text-slate">{empty ?? "-"}</span>
        )}
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "good" }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 px-2.5 py-2 text-center">
      <div className={cn("font-display text-lg font-bold leading-none tabular-nums", tone === "good" ? "text-signal-green" : "text-ink")}>
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate">{label}</div>
    </div>
  );
}

function GroupChips({ groups }: { groups: { term: string; color: string; size: number }[] }) {
  if (groups.length === 0) return <span className="text-xs italic text-slate">none</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {groups.map((g, i) => (
        <span
          key={`${g.term}-${i}`}
          className="flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-2 text-xs font-bold text-white"
          style={{ backgroundColor: g.color }}
        >
          <span className="font-mono">{g.term}</span>
          <span className="rounded-full bg-black/20 px-1.5 text-[10px] tabular-nums">{g.size}</span>
        </span>
      ))}
    </div>
  );
}

function PracticeFeedback({
  grade,
  hasGroups,
  onesCount,
  message,
}: {
  grade: ReturnType<typeof gradeCover>;
  hasGroups: boolean;
  onesCount: number;
  message: { text: string; tone: "info" | "good" | "bad" };
}) {
  if (message.text && message.tone === "bad") {
    return <Banner tone="bad">{message.text}</Banner>;
  }

  if (!hasGroups) {
    return (
      <p className="text-[11px] leading-relaxed text-slate">
        {onesCount === 0
          ? "This map has no 1s to group."
          : `${onesCount} cell${onesCount === 1 ? "" : "s"} to cover. Bigger groups mean fewer literals, so always take the largest legal group you can.`}
      </p>
    );
  }

  if (!grade.coversAllOnes) {
    return <Banner tone="info">Some 1s are still uncovered. Every 1 has to be inside at least one group.</Banner>;
  }
  if (grade.includesZero) {
    return <Banner tone="bad">One of your groups covers a 0, which changes the function.</Banner>;
  }
  if (grade.redundant.length > 0) {
    return (
      <Banner tone="info">
        Every 1 is covered, but {grade.redundant.length} group{grade.redundant.length === 1 ? " is" : "s are"} redundant:
        removing {grade.redundant.length === 1 ? "it" : "them"} would still cover everything.
      </Banner>
    );
  }
  if (!grade.isMinimal) {
    return (
      <Banner tone="info">
        Correct, but not minimal. You used {grade.termCount} term{grade.termCount === 1 ? "" : "s"} and{" "}
        {grade.literalCount} literal{grade.literalCount === 1 ? "" : "s"}; it can be done with {grade.optimalTermCount} and{" "}
        {grade.optimalLiteralCount}. Look for larger groups, including ones that wrap around the edges.
      </Banner>
    );
  }
  return <Banner tone="good">That is a minimal solution: every 1 covered, no redundancy, fewest possible literals.</Banner>;
}

function Banner({ tone, children }: { tone: "info" | "good" | "bad"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 text-xs font-medium leading-relaxed",
        tone === "good" && "border-signal-green/40 bg-signal-green-bg text-signal-green-strong",
        tone === "bad" && "border-signal-coral/40 bg-signal-coral-bg text-signal-coral-strong",
        tone === "info" && "border-border bg-surface-2/60 text-ink-soft",
      )}
    >
      {children}
    </p>
  );
}

"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { DEFAULT_BLOCK_COLORS } from "@/lib/editor/block-colors";
import {
  type Implicant,
  implicantFromCells,
  implicantKey,
  layoutFor,
  literalCount,
  mintermsOf,
  mintermsWhere,
  sopExpression,
  termFor,
} from "@/lib/kmap/kmap";
import { gradeCover } from "@/lib/kmap/solve";
import { generateProblem, randomSeed, type Difficulty } from "@/lib/kmap/random";
import { WidgetFrame } from "../widget-frame";
import { KMapCellLegend, KMapGrid, type DrawnGroup } from "./kmap-grid";
import { Banner, Segmented, Stat, WidgetButton } from "../shared/widget-ui";

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "easy", label: "Easy", blurb: "3 variables, no don't-cares" },
  { id: "medium", label: "Medium", blurb: "4 variables, some don't-cares" },
  { id: "hard", label: "Hard", blurb: "4 variables, more terms and don't-cares" },
];

interface Confirmed {
  implicant: Implicant;
  term: string;
  color: string;
}

/** useSyncExternalStore needs a subscribe function; this store never changes. */
const subscribeNever = () => () => {};

/**
 * Endless randomly generated K-map practice.
 *
 * The problem is generated from a seed rather than picked from a fixed bank,
 * so the tool does not run out and a specific problem can still be shared by
 * its seed. Grading goes through solveKMap rather than comparing against one
 * stored answer, because most maps have several equally minimal solutions
 * and marking the others wrong would be worse than not grading at all.
 */
export function KMapPracticeWidget({ data }: { data: Record<string, unknown> }) {
  const initialDifficulty: Difficulty =
    data.difficulty === "easy" || data.difficulty === "medium" || data.difficulty === "hard"
      ? data.difficulty
      : "easy";

  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [chosenSeed, setChosenSeed] = useState<number | null>(
    typeof data.seed === "number" ? data.seed : null,
  );
  const [confirmed, setConfirmed] = useState<Confirmed[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);
  const [scored, setScored] = useState(false);

  // The first problem has to be random without breaking hydration. The
  // server has no way to agree on a random number, so it renders a fixed
  // one and this flips to the client's own seed immediately after hydration.
  // useSyncExternalStore is the supported way to say "client only" without
  // a setState-in-effect.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [firstClientSeed] = useState(randomSeed);
  const seed = chosenSeed ?? (hydrated ? firstClientSeed : 1);

  const problem = useMemo(() => generateProblem(difficulty, seed), [difficulty, seed]);
  const { variables, cells, solution } = problem;
  const varCount = variables.length;
  const layout = useMemo(() => layoutFor(variables), [variables]);

  const newProblem = useCallback((d: Difficulty = difficulty) => {
    setDifficulty(d);
    setChosenSeed(randomSeed());
    setConfirmed([]);
    setSelected([]);
    setRevealed(false);
    setError(null);
    setScored(false);
  }, [difficulty]);

  const toggle = (m: number) => {
    if (revealed) return;
    setError(null);
    setSelected((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const confirmGroup = () => {
    if (selected.length === 0) return;
    if (selected.some((m) => cells[m] === 0)) {
      setError("A group cannot include a cell whose output is 0.");
      return;
    }
    if (selected.every((m) => cells[m] === "x")) {
      setError("That group is only don't-cares, so it covers nothing that needs covering.");
      return;
    }
    const imp = implicantFromCells(selected, varCount);
    if (!imp) {
      setError("Not a legal group. Use 1, 2, 4 or 8 cells in a rectangle. The edges wrap around.");
      return;
    }
    if (confirmed.some((g) => implicantKey(g.implicant) === implicantKey(imp))) {
      setError("You already have that group.");
      setSelected([]);
      return;
    }
    const next = [
      ...confirmed,
      {
        implicant: imp,
        term: termFor(imp, variables),
        color: DEFAULT_BLOCK_COLORS[confirmed.length % DEFAULT_BLOCK_COLORS.length],
      },
    ];
    setConfirmed(next);
    setSelected([]);
    setError(null);

    // Score here rather than in an effect watching `grade`: this is the only
    // action that can complete a solve, so the check belongs where the
    // change happens.
    if (!scored && !revealed) {
      const attempt = gradeCover(next.map((g) => g.implicant), cells, varCount, solution);
      if (attempt.isMinimal) {
        setScored(true);
        setSolvedCount((n) => n + 1);
      }
    }
  };

  const grade = useMemo(
    () => gradeCover(confirmed.map((g) => g.implicant), cells, varCount, solution),
    [confirmed, cells, varCount, solution],
  );

  const drawn: DrawnGroup[] = revealed
    ? solution.cover.map((imp, i) => ({
        implicant: imp,
        color: DEFAULT_BLOCK_COLORS[i % DEFAULT_BLOCK_COLORS.length],
        label: termFor(imp, variables),
      }))
    : confirmed.map((g) => ({ implicant: g.implicant, color: g.color, label: g.term }));

  const ones = mintermsWhere(cells, 1);
  const dontCares = mintermsWhere(cells, "x");
  const yourLiterals = confirmed.reduce((n, g) => n + literalCount(g.implicant, varCount), 0);

  return (
    <WidgetFrame
      title="Karnaugh map practice"
      subtitle={`${DIFFICULTIES.find((d) => d.id === difficulty)?.label} · ${solvedCount} solved`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Segmented
            label="Difficulty"
            value={difficulty}
            onChange={newProblem}
            options={DIFFICULTIES.map((d) => ({ id: d.id, label: d.label, hint: d.blurb }))}
          />

          <WidgetButton tone="primary" className="ml-auto" onClick={() => newProblem()}>
            New random problem
          </WidgetButton>
        </div>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-8">
          <div className="flex flex-col items-center gap-4">
            <KMapGrid
              layout={layout}
              cells={cells}
              groups={drawn}
              selected={selected}
              onCellClick={toggle}
              ariaLabel={`Practice Karnaugh map for ${variables.join("")}`}
            />
            <KMapCellLegend showDontCare={dontCares.length > 0} />

            <div className="flex flex-wrap justify-center gap-2">
              <WidgetButton tone="primary" onClick={confirmGroup} disabled={selected.length === 0 || revealed}>
                Confirm group
              </WidgetButton>
              <WidgetButton onClick={() => setSelected([])} disabled={selected.length === 0}>
                Clear selection
              </WidgetButton>
              <WidgetButton
                onClick={() => {
                  setConfirmed([]);
                  setSelected([]);
                  setRevealed(false);
                  setError(null);
                }}
              >
                Start over
              </WidgetButton>
              <WidgetButton tone="danger" onClick={() => setRevealed((v) => !v)}>
                {revealed ? "Hide answer" : "Give up"}
              </WidgetButton>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="rounded-xl border border-border bg-gradient-to-br from-surface-card to-surface-2/50 p-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate">
                {revealed ? "Minimal answer" : "Your expression"}
              </div>
              <p className="break-words font-mono text-lg font-bold leading-snug text-ink">
                {revealed ? (
                  <>
                    <span className="text-copper-dark">F</span> = {sopExpression(solution.cover, variables)}
                  </>
                ) : confirmed.length > 0 ? (
                  <>
                    <span className="text-copper-dark">F</span> = {confirmed.map((g) => g.term).join(" + ")}
                  </>
                ) : (
                  <span className="text-base font-normal italic text-slate">No groups yet.</span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="1s to cover" value={ones.length} />
              <Stat label="your terms" value={confirmed.length} />
              <Stat label="your literals" value={yourLiterals} />
            </div>

            <div className="rounded-lg border border-border bg-surface-2/40 p-3">
              <div className="mb-2 text-[11px] font-semibold text-slate">Target</div>
              <p className="text-xs leading-relaxed text-ink-soft">
                Cover every 1 using{" "}
                <span className="font-bold text-ink">
                  {solution.cover.length} group{solution.cover.length === 1 ? "" : "s"}
                </span>{" "}
                and{" "}
                <span className="font-bold text-ink">
                  {solution.cover.reduce((n, i) => n + literalCount(i, varCount), 0)} literals
                </span>
                .
                {dontCares.length > 0 && (
                  <>
                    {" "}
                    The {dontCares.length} don&apos;t-care cell{dontCares.length === 1 ? "" : "s"} may be included to grow a
                    group, or left out.
                  </>
                )}
              </p>
            </div>

            {/* One reserved slot for the running feedback, so it changing as
                you build groups never resizes the widget. */}
            <div className="min-h-[5rem]">
            {error ? (
              <Banner tone="bad">{error}</Banner>
            ) : revealed ? (
              <Banner tone="info">
                The answer uses {solution.cover.length} group{solution.cover.length === 1 ? "" : "s"}:{" "}
                {solution.cover.map((imp) => termFor(imp, variables)).join(", ")}.
                {solution.alternativeCovers.length > 0 &&
                  ` There ${solution.alternativeCovers.length === 1 ? "is 1 other equally small grouping" : `are ${solution.alternativeCovers.length} other equally small groupings`}.`}
              </Banner>
            ) : confirmed.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-slate">
                Click cells to select them, then confirm. Take the largest legal group you can each time: groups may wrap
                around the edges of the map.
              </p>
            ) : grade.isMinimal ? (
              <div className="flex flex-col gap-2">
                <Banner tone="good">Minimal. Every 1 covered with the fewest possible terms and literals.</Banner>
                <button
                  type="button"
                  onClick={() => newProblem()}
                  className="self-start rounded-lg bg-signal-green px-3.5 py-1.5 text-[11px] font-semibold text-white hover:brightness-95"
                >
                  Next problem →
                </button>
              </div>
            ) : !grade.coversAllOnes ? (
              <Banner tone="info">
                {ones.filter((m) => !confirmed.some((g) => mintermsOf(g.implicant, varCount).includes(m))).length} of the 1s
                are still uncovered.
              </Banner>
            ) : grade.redundant.length > 0 ? (
              <Banner tone="info">
                Everything is covered, but {grade.redundant.length} group
                {grade.redundant.length === 1 ? " is" : "s are"} redundant. Try removing one.
              </Banner>
            ) : (
              <Banner tone="info">
                Correct but not minimal: {grade.termCount} terms / {grade.literalCount} literals against a possible{" "}
                {grade.optimalTermCount} / {grade.optimalLiteralCount}. Look for bigger groups.
              </Banner>
            )}
            </div>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}

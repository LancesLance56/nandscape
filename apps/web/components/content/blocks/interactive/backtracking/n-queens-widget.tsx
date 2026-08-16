"use client";

import { useCallback, useMemo, useState } from "react";
import { allQueensSolutions, nQueensSteps, type QueensPayload } from "@/lib/backtracking/puzzles";
import { cn } from "@/lib/cn";
import { PanelBox, StatReadout } from "../shared/panel-ui";
import { BacktrackingRunner, type ToggleGroup } from "./backtracking-runner";

const SIZES = [4, 5, 6, 7, 8];

interface BoardProps {
  n: number;
  /** queens[r] = column of the queen in row r. */
  queens: number[];
  tryCol?: number | null;
  tryRow?: number;
  tryOk?: boolean;
  blockedBy?: string | null;
  /** Tint every square a placed queen attacks. */
  showAttacks?: boolean;
}

function attackedSquares(queens: number[], n: number): Set<string> {
  const out = new Set<string>();
  queens.forEach((c, r) => {
    if (c === undefined || c < 0) return;
    for (let i = 0; i < n; i++) {
      out.add(`${r},${i}`);
      out.add(`${i},${c}`);
      const d1 = [
        [r + i, c + i],
        [r - i, c - i],
        [r + i, c - i],
        [r - i, c + i],
      ];
      for (const [rr, cc] of d1) {
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.add(`${rr},${cc}`);
      }
    }
  });
  return out;
}

function QueensBoard({ n, queens, tryCol, tryRow, tryOk, blockedBy, showAttacks = true }: BoardProps) {
  const attacked = showAttacks ? attackedSquares(queens, n) : new Set<string>();
  const queenAt = new Map(queens.map((c, r) => [`${r},${c}`, r]));

  return (
    <div
      className="grid gap-0.5 rounded-lg border border-border bg-surface-2/40 p-2"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      role="grid"
      aria-label={`${n} by ${n} chessboard with ${queens.length} queens placed`}
    >
      {Array.from({ length: n * n }).map((_, i) => {
        const row = Math.floor(i / n);
        const col = i % n;
        const key = `${row},${col}`;
        const hasQueen = queenAt.has(key);
        const isTry = tryRow === row && tryCol === col;
        const isBlocker = blockedBy === key;
        const isDark = (row + col) % 2 === 1;
        const isAttacked = attacked.has(key) && !hasQueen;

        return (
          <div
            key={key}
            role="gridcell"
            className={cn(
              "relative flex aspect-square items-center justify-center rounded-[3px] text-lg leading-none transition-colors",
              isDark ? "bg-surface-3" : "bg-surface",
              isAttacked && "bg-signal-coral/15",
              hasQueen && "bg-copper",
              isBlocker && "ring-2 ring-signal-coral",
              isTry && !hasQueen && (tryOk ? "ring-2 ring-signal-green" : "bg-signal-coral/40 ring-2 ring-signal-coral"),
            )}
          >
            {hasQueen && <span className="select-none text-white">♛</span>}
            {isTry && !hasQueen && !tryOk && <span className="select-none text-sm text-signal-coral">✕</span>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * N-Queens in two modes.
 *
 * "Watch" steps the solver. "Place them yourself" hands the board over, which
 * is worth the extra code: the reason one queen per row is the right framing
 * only really lands once you have tried placing them anywhere and run out of
 * board. The manual mode enforces nothing, it only reports conflicts, so the
 * dead end is something the reader walks into rather than reads about.
 */
export function NQueensWidget({ data }: { data: Record<string, unknown> }) {
  const [n, setN] = useState(typeof data.n === "number" && SIZES.includes(data.n) ? data.n : 6);
  const [stopAtFirst, setStopAtFirst] = useState(data.allSolutions !== true);
  const [manual, setManual] = useState(false);

  const run = useMemo(() => nQueensSteps(n, stopAtFirst), [n, stopAtFirst]);
  const solutions = useMemo(() => allQueensSolutions(n), [n]);

  const toggles: ToggleGroup[] = [
    {
      id: "size",
      label: "Board",
      active: String(n),
      onChange: (id) => setN(Number(id)),
      options: SIZES.map((s) => ({ id: String(s), label: `${s}×${s}` })),
    },
    {
      id: "mode",
      label: "Mode",
      active: manual ? "manual" : "watch",
      onChange: (id) => setManual(id === "manual"),
      options: [
        { id: "watch", label: "Watch it solve" },
        { id: "manual", label: "Place them yourself" },
      ],
    },
  ];

  if (!manual) {
    toggles.push({
      id: "stop",
      label: "Run",
      active: stopAtFirst ? "first" : "all",
      onChange: (id) => setStopAtFirst(id === "first"),
      options: [
        { id: "first", label: "First solution" },
        { id: "all", label: "Every solution" },
      ],
    });
  }

  if (manual) return <ManualQueens n={n} toggles={toggles} totalSolutions={solutions.length} />;

  return (
    <BacktrackingRunner
      run={run}
      toggles={toggles}
      solutionsLabel="Solutions found"
      hint={`${n}×${n} has ${solutions.length} solution${solutions.length === 1 ? "" : "s"} in total. Red squares are attacked by a queen already on the board.`}
      visual={(step) => {
        const p = step.payload as QueensPayload | undefined;
        return (
          <QueensBoard
            n={n}
            queens={p?.queens ?? []}
            tryRow={p?.tryRow}
            tryCol={p?.tryCol}
            tryOk={p?.ok ?? true}
            blockedBy={p?.blockedBy ?? null}
          />
        );
      }}
      panel={(step) => {
        const p = step.payload as QueensPayload | undefined;
        return (
          <PanelBox title="Rows filled">
            <div className="flex flex-col gap-1">
              {Array.from({ length: n }).map((_, r) => {
                const col = p?.queens[r];
                return (
                  <div key={r} className="flex items-center justify-between text-xs">
                    <span className="text-slate">row {r + 1}</span>
                    <span className={cn("font-mono font-bold", col === undefined ? "text-border-strong" : "text-copper-dark")}>
                      {col === undefined ? "empty" : `column ${"abcdefgh"[col]}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </PanelBox>
        );
      }}
    />
  );
}

/** The hands-on board: place queens anywhere, get told what conflicts. */
function ManualQueens({ n, toggles, totalSolutions }: { n: number; toggles: ToggleGroup[]; totalSolutions: number }) {
  const [placed, setPlaced] = useState<string[]>([]);

  const toggle = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    setPlaced((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const coords = placed.map((k) => k.split(",").map(Number) as [number, number]);

  const conflicts = coords.flatMap(([r1, c1], i) =>
    coords.slice(i + 1).flatMap(([r2, c2]) => {
      if (r1 === r2) return [{ a: `${r1 + 1}${"abcdefgh"[c1]}`, b: `${r2 + 1}${"abcdefgh"[c2]}`, why: "same row" }];
      if (c1 === c2) return [{ a: `${r1 + 1}${"abcdefgh"[c1]}`, b: `${r2 + 1}${"abcdefgh"[c2]}`, why: "same column" }];
      if (Math.abs(r1 - r2) === Math.abs(c1 - c2))
        return [{ a: `${r1 + 1}${"abcdefgh"[c1]}`, b: `${r2 + 1}${"abcdefgh"[c2]}`, why: "same diagonal" }];
      return [];
    }),
  );

  const solved = placed.length === n && conflicts.length === 0;

  return (
    <div className="rounded-xl border border-border bg-surface-card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {toggles.map((group) => (
          <div key={group.id} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate">{group.label}</span>
            {group.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => group.onChange(opt.id)}
                aria-pressed={opt.id === group.active}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  opt.id === group.active
                    ? "border-copper bg-copper-bg text-copper-dark"
                    : "border-border-strong text-ink-soft hover:bg-surface-2 hover:text-ink",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <ManualBoard n={n} coords={coords} onSquareClick={toggle} />
          <p className="mt-2 text-[11px] text-slate">
            Click any square to place or remove a queen. Nothing stops you putting two in one row, which is worth trying
            once before reading why the solver refuses to.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <PanelBox title="Progress">
            <StatReadout
              stats={[
                { label: "queens placed", value: `${placed.length} / ${n}` },
                { label: "conflicts", value: conflicts.length, tone: conflicts.length > 0 ? "warn" : "good" },
              ]}
            />
          </PanelBox>

          <PanelBox title="What is attacking what">
            {conflicts.length === 0 ? (
              <span className="text-xs italic text-slate">
                {placed.length === 0 ? "nothing placed yet" : "no conflicts so far"}
              </span>
            ) : (
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                {conflicts.map((c, i) => (
                  <span key={i} className="text-xs text-signal-coral">
                    {c.a} and {c.b}: {c.why}
                  </span>
                ))}
              </div>
            )}
          </PanelBox>

          {solved && (
            <p className="rounded-lg border border-signal-green bg-signal-green/10 px-3 py-2 text-sm font-semibold text-signal-green">
              That is a valid solution. There are {totalSolutions} in total on this board.
            </p>
          )}

          <button
            type="button"
            onClick={() => setPlaced([])}
            className="self-start rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            Clear board
          </button>
        </div>
      </div>
    </div>
  );
}

/** Free-placement board: any number of queens, anywhere, conflicts shown in red. */
function ManualBoard({
  n,
  coords,
  onSquareClick,
}: {
  n: number;
  coords: [number, number][];
  onSquareClick: (row: number, col: number) => void;
}) {
  const queenSet = new Set(coords.map(([r, c]) => `${r},${c}`));

  const conflicted = new Set<string>();
  coords.forEach(([r1, c1], i) => {
    coords.forEach(([r2, c2], j) => {
      if (i === j) return;
      if (r1 === r2 || c1 === c2 || Math.abs(r1 - r2) === Math.abs(c1 - c2)) {
        conflicted.add(`${r1},${c1}`);
        conflicted.add(`${r2},${c2}`);
      }
    });
  });

  return (
    <div
      className="grid gap-0.5 rounded-lg border border-border bg-surface-2/40 p-2"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: n * n }).map((_, i) => {
        const row = Math.floor(i / n);
        const col = i % n;
        const key = `${row},${col}`;
        const hasQueen = queenSet.has(key);
        const bad = conflicted.has(key);
        const isDark = (row + col) % 2 === 1;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSquareClick(row, col)}
            aria-label={`Row ${row + 1}, column ${col + 1}${hasQueen ? ", has a queen" : ""}`}
            className={cn(
              "flex aspect-square cursor-pointer items-center justify-center rounded-[3px] text-lg leading-none transition-colors hover:brightness-95",
              isDark ? "bg-surface-3" : "bg-surface",
              hasQueen && (bad ? "bg-signal-coral" : "bg-signal-green"),
            )}
          >
            {hasQueen && <span className="select-none text-white">♛</span>}
          </button>
        );
      })}
    </div>
  );
}

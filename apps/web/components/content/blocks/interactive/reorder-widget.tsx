"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

interface ReorderItem {
  id: string;
  name: string;
  cost: number;
}

interface BooleanReorderData {
  items: ReorderItem[];
  correctOrder: string[];
  opsOnSolve?: number;
  counterKey?: string;
  counterAmount?: number;
  className?: string;
}

function isReorderItem(value: unknown): value is ReorderItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.name === "string" && typeof v.cost === "number";
}

function isBooleanReorderData(data: unknown): data is BooleanReorderData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.items) &&
    d.items.every(isReorderItem) &&
    Array.isArray(d.correctOrder) &&
    d.correctOrder.every((id) => typeof id === "string")
  );
}

function expectedCost(order: ReorderItem[]): number {
  let running = 0;
  let total = 0;
  for (const item of order) {
    running += item.cost;
    total += running;
  }
  return total / order.length;
}

export function ReorderWidget({ data }: { data: Record<string, unknown> }) {
  if (!isBooleanReorderData(data)) {
    return <p className="text-sm text-signal-coral">Reorder widget: malformed data.</p>;
  }

  const initialItems = data.items;
  const correctOrder = data.correctOrder;

  const [items, setItems] = useState<ReorderItem[]>(initialItems);
  const [checked, setChecked] = useState(false);
  const [solvedOnce, setSolvedOnce] = useState(false);

  const current = expectedCost(items);
  const best = useMemo(
    () => expectedCost([...initialItems].sort((a, b) => a.cost - b.cost)),
    [initialItems],
  );
  const isOptimal = Math.abs(current - best) < 0.01;
  const maxBar = Math.max(current, best, 1);
  const solved = items.every((item, i) => item.id === correctOrder[i]);

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setChecked(false);
  };

  const checkOrder = () => {
    setChecked(true);
    if (solved && !solvedOnce) {
      setSolvedOnce(true);
    }
  };

  return (
    <div className={cn("rounded-xl border border-border bg-surface-card p-5 w-[90%] m-auto", data.className)}>
      <ul className="mb-4 flex flex-col gap-2">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5"
          >
            <span className="w-5 font-mono text-xs text-slate">{i + 1}</span>
            <span className="flex-1 font-mono text-sm text-ink">{item.name}</span>
            <span className="font-mono text-[11px] text-slate">cost ~{item.cost}</span>
            <span className="flex gap-1">
              <button
                type="button"
                aria-label="Move up"
                onClick={() => move(i, -1)}
                className="rounded-md border border-border-strong px-2 py-0.5 text-xs text-ink-soft hover:border-copper"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                onClick={() => move(i, 1)}
                className="rounded-md border border-border-strong px-2 py-0.5 text-xs text-ink-soft hover:border-copper"
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="mb-3 flex flex-wrap justify-between gap-2 font-mono text-[13px] text-ink-soft">
        <span>
          expected cost per check, current order:{" "}
          <span className={isOptimal ? "text-copper" : "text-ink"}>{current.toFixed(1)} units</span>
        </span>
        <span>
          best possible: <span className="text-ink">{best.toFixed(1)} units</span>
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <span className="w-16 shrink-0 text-slate">current</span>
          <div className="h-5 flex-1 overflow-hidden rounded border border-border bg-surface-2">
            <div
              className="h-full bg-signal-coral transition-all duration-300"
              style={{ width: `${(current / maxBar) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-slate">{current.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <span className="w-16 shrink-0 text-slate">optimal</span>
          <div className="h-5 flex-1 overflow-hidden rounded border border-border bg-surface-2">
            <div
              className="h-full bg-copper transition-all duration-300"
              style={{ width: `${(best / maxBar) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-slate">{best.toFixed(1)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={checkOrder}
        className="rounded-lg bg-copper px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-copper-dark"
      >
        Check order
      </button>

      {checked && (
        <div className="mt-4 border-t border-dashed border-border pt-4">
          {solved ? (
            <p className="font-mono text-[13px] text-copper">
              Cheapest to most expensive. That minimizes the expected cost per check, since whichever one
              fails, you paid the least to find out.
            </p>
          ) : (
            <p className="font-mono text-[13px] text-signal-coral">
              Not quite optimal yet. Compare the expected cost above to the best possible, then keep
              swapping.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

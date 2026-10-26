"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { WidgetButton } from "./shared/widget-ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ActionDock, WidgetShell } from "./shared/widget-shell";
import { Banner, PanelBox } from "./shared/widget-ui";

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

  const bar = (label: string, value: number, tone: string) => (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-xs font-semibold text-slate">
      <span>{label}</span>
      <div className="h-3.5 overflow-hidden rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full transition-all duration-300", tone)} style={{ width: `${(value / maxBar) * 100}%` }} />
      </div>
      <b className="text-right font-mono text-ink">{value.toFixed(1)}</b>
    </div>
  );

  return (
    <WidgetShell
      kind="Optimize"
      title="Order the checks, cheapest first"
      className={data.className}
      prompt="Order the checks so the cheapest runs first."
      stage={
        <ul className="mx-auto flex w-full max-w-[34rem] flex-col gap-2">
          {items.map((item, i) => (
            <li
              key={item.id}
              className="flex h-12 items-center gap-3 rounded-xl border-[1.5px] border-border-strong bg-surface-card pl-3 pr-2"
            >
              <span className="w-4 font-mono text-xs text-slate">{i + 1}</span>
              <span className="flex-1 text-sm font-semibold text-ink">{item.name}</span>
              <span className="font-mono text-xs text-slate">cost ~{item.cost}</span>
              <span className="flex gap-1">
                <WidgetButton size="xs" className="size-8 p-0" aria-label={`Move ${item.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp className="size-3.5" />
                </WidgetButton>
                <WidgetButton
                  size="xs"
                  className="size-8 p-0"
                  aria-label={`Move ${item.name} down`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronDown className="size-3.5" />
                </WidgetButton>
              </span>
            </li>
          ))}
        </ul>
      }
      side={
        <PanelBox title="Expected cost per check">
          <p className="text-[11px] leading-relaxed text-slate">Whichever check fails, you paid for everything before it.</p>
        </PanelBox>
      }
      readout={
        <div className="flex w-full max-w-[34rem] flex-col gap-2">
          {bar("Your order", current, isOptimal ? "bg-copper" : "bg-signal-coral")}
          {bar("Best possible", best, "bg-copper")}
        </div>
      }
      status={
        checked ? (
          solved ? (
            <Banner tone="good">
              Cheapest to most expensive. That minimizes the expected cost per check, since whichever one fails, you
              paid the least to find out.
            </Banner>
          ) : (
            <Banner tone="bad">
              Not quite optimal yet. Compare the expected cost above to the best possible, then keep swapping.
            </Banner>
          )
        ) : undefined
      }
      dock={
        <ActionDock hint="Use the arrows to swap neighbours.">
          <WidgetButton tone="primary" size="md" onClick={checkOrder}>
            Check order
          </WidgetButton>
        </ActionDock>
      }
    />
  );
}

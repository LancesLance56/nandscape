"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const DEFAULT_BITS = 8;
const DEFAULT_TITLE = "Number Base Explorer";

function resolveBits(data: Record<string, unknown>): number {
  const { bits } = data;
  return typeof bits === "number" && Number.isInteger(bits) && bits >= 4 && bits <= 16 ? bits : DEFAULT_BITS;
}

function resolveInitial(data: Record<string, unknown>, bits: number): number {
  const { initial } = data;
  const max = 2 ** bits - 1;
  return typeof initial === "number" && Number.isInteger(initial) && initial >= 0 && initial <= max
    ? initial
    : Math.min(156, max);
}

/**
 * A byte (or however many bits) of clickable switches, decimal and hex read
 * out live underneath - the same "flip a bit, watch the value change"
 * mechanic as the circuit demos, applied to number representation instead
 * of gates. Card by default so it stands alone in a blog post; pass
 * `frame={false}` in a context (like the hero carousel) that already
 * provides its own surrounding card.
 */
export function NumberBaseExplorerWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const bits = resolveBits(data);
  const title = typeof data.title === "string" ? data.title : DEFAULT_TITLE;
  const className = typeof data.className === "string" ? data.className : undefined;

  const [value, setValue] = useState(() => resolveInitial(data, bits));

  const toggleBit = (index: number) => {
    const shift = bits - 1 - index;
    setValue((v) => v ^ (1 << shift));
  };

  const binary = value.toString(2).padStart(bits, "0");
  const hex = value.toString(16).toUpperCase().padStart(Math.ceil(bits / 4), "0");
  const placeValues = Array.from({ length: bits }, (_, i) => 2 ** (bits - 1 - i));

  return (
    <div className={cn(frame && "rounded-xl border border-border bg-surface-card p-5", className)}>
      <div className="mb-4 text-xs font-semibold text-slate">{title}, click a bit to flip it</div>

      <div className="flex justify-center gap-1.5">
        {binary.split("").map((bit, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleBit(i)}
            aria-label={`Bit ${i}, value ${placeValues[i]}, currently ${bit}`}
            className={cn(
              "flex h-11 w-9 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all",
              bit === "1"
                ? "border-copper bg-copper-bg text-copper-dark"
                : "border-border-strong bg-surface-2 text-slate",
            )}
          >
            {bit}
          </button>
        ))}
      </div>

      <div className="mt-1 flex justify-center gap-1.5">
        {placeValues.map((pv) => (
          <span key={pv} className="w-9 text-center text-[10px] text-slate">
            {pv}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="text-[11px] text-slate">Binary</div>
          <div className="mt-1 text-base font-bold text-ink sm:text-lg">{binary}</div>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="text-[11px] text-slate">Decimal</div>
          <div className="mt-1 text-lg font-bold text-ink">{value}</div>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="text-[11px] text-slate">Hex</div>
          <div className="mt-1 text-lg font-bold text-ink">0x{hex}</div>
        </div>
      </div>
    </div>
  );
}

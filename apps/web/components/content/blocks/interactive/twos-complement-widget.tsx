"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const DEFAULT_BITS = 8;

function resolveBits(data: Record<string, unknown>): number {
  const { bits } = data;
  return typeof bits === "number" && Number.isInteger(bits) && bits >= 4 && bits <= 12 ? bits : DEFAULT_BITS;
}

function resolveInitial(data: Record<string, unknown>, bits: number): number {
  const { initial } = data;
  const max = 2 ** bits - 1;
  return typeof initial === "number" && Number.isInteger(initial) && initial >= 0 && initial <= max ? initial : 5;
}

/**
 * Same bit-toggle mechanic as the number base explorer, but reading the top
 * bit as a sign bit instead - flip bits and watch the unsigned and signed
 * (two's complement) values diverge, or hit Negate to see "invert every
 * bit, then add 1" actually happen to a specific number instead of staying
 * an abstract rule. Card by default; pass `frame={false}` when embedding
 * inside a context that already provides its own surrounding card.
 */
export function TwosComplementWidget({
  data,
  frame = true,
}: {
  data: Record<string, unknown>;
  frame?: boolean;
}) {
  const bits = resolveBits(data);
  const className = typeof data.className === "string" ? data.className : undefined;

  const [value, setValue] = useState(() => resolveInitial(data, bits));

  const mask = 2 ** bits - 1;

  const toggleBit = (index: number) => {
    const shift = bits - 1 - index;
    setValue((v) => v ^ (1 << shift));
  };

  const negate = () => {
    setValue((v) => (~v + 1) & mask);
  };

  const binary = value.toString(2).padStart(bits, "0");
  const isNegative = binary[0] === "1";
  const signed = isNegative ? value - 2 ** bits : value;

  return (
    <div className={cn(frame && "rounded-xl border border-border bg-surface-card p-5", className)}>
      <div className="mb-4 text-xs font-semibold text-slate">Two&rsquo;s complement, click a bit to flip it</div>

      <div className="flex justify-center gap-1.5">
        {binary.split("").map((bit, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleBit(i)}
            aria-label={i === 0 ? `Sign bit, currently ${bit}` : `Bit ${i}, currently ${bit}`}
            className={cn(
              "flex h-11 w-9 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all",
              bit === "1"
                ? i === 0
                  ? "border-signal-coral bg-signal-coral-bg text-signal-coral-strong"
                  : "border-copper bg-copper-bg text-copper-dark"
                : "border-border-strong bg-surface-2 text-slate",
            )}
          >
            {bit}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-center">
        <span className="text-[10px] text-slate">sign bit ↑</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="text-[11px] text-slate">As unsigned</div>
          <div className="mt-1 text-lg font-bold text-ink">{value}</div>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="text-[11px] text-slate">As two&rsquo;s complement</div>
          <div className={cn("mt-1 text-lg font-bold", isNegative ? "text-signal-coral-strong" : "text-ink")}>
            {signed}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={negate}
        className="mt-4 w-full rounded-lg border border-border-strong px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
      >
        Negate: invert every bit, then add 1
      </button>
    </div>
  );
}

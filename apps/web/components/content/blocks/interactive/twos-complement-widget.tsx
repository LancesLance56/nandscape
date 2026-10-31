"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ActionDock, WidgetShell } from "./shared/widget-shell";
import { StageNote, Stat, WidgetButton } from "./shared/widget-ui";

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
    <WidgetShell
      kind="Number systems"
      singleView
      title="Two's complement"
      bare={!frame}
      className={className}
      prompt="The same bits, read two ways. The first bit makes it negative."
      stage={
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <div className="flex flex-wrap justify-center gap-1.5">
              {binary.split("").map((bit, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleBit(i)}
                  aria-label={i === 0 ? `Sign bit, currently ${bit}` : `Bit ${i}, currently ${bit}`}
                  className={cn(
                    "grid h-12 w-10 place-items-center rounded-[10px] border-2 font-mono text-xl font-bold transition-colors",
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
            <span className="self-start pl-2 text-[10px] text-slate">sign bit ↑</span>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-2.5">
            <Stat label="As unsigned" value={value} />
            <Stat label="As two's complement" value={signed} tone={isNegative ? "warn" : "default"} />
          </div>
          {frame && (
            <StageNote>
              The top bit counts as −{2 ** (bits - 1)} instead of +{2 ** (bits - 1)}, so {binary} reads as {signed}.
            </StageNote>
          )}
        </div>
      }
      dock={
        <ActionDock hint="Click a bit to flip it.">
          <WidgetButton tone="primary" onClick={negate}>
            Negate: invert, then add 1
          </WidgetButton>
        </ActionDock>
      }
    />
  );
}

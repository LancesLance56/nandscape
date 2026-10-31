"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ActionDock, WidgetShell } from "./shared/widget-shell";
import { StageNote, Stat, WidgetButton } from "./shared/widget-ui";

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
    <WidgetShell
      kind="Number systems"
      singleView
      title={title}
      bare={!frame}
      className={className}
      // A host that draws its own box (the homepage bento) gets the bits and
      // the readouts only: its tile already says what the tool does.
      prompt={frame ? "Click a bit to flip it. All three readouts follow." : undefined}
      stage={
        <div className="flex flex-col items-center gap-5">
          <div className={cn("flex flex-wrap justify-center", frame ? "gap-1.5" : "gap-1")}>
            {binary.split("").map((bit, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleBit(i)}
                  aria-label={`Bit ${i}, value ${placeValues[i]}, currently ${bit}`}
                  className={cn(
                    frame ? "h-12 w-10 text-xl" : "h-10 w-8 text-lg",
                    "grid place-items-center rounded-[10px] border-2 font-mono font-bold transition-colors",
                    bit === "1" ? "border-copper bg-copper-bg text-copper-dark" : "border-border-strong bg-surface-2 text-slate",
                  )}
                >
                  {bit}
                </button>
                <span className="font-mono text-[10px] text-slate">{placeValues[i]}</span>
              </div>
            ))}
          </div>
          <div className={cn("grid w-full max-w-md gap-2.5", frame ? "grid-cols-3" : "grid-cols-2")}>
            {/* The bits above already are the binary, so a tile with no room
                to spare drops the repeat. */}
            {frame && <Stat label="Binary" value={binary} />}
            <Stat label="Decimal" value={value} tone="warn" />
            <Stat label="Hex" value={`0x${hex}`} />
          </div>
          {frame && (
            <StageNote>
              Each bit is worth twice the one to its right. Every group of four bits is exactly one hex digit.
            </StageNote>
          )}
        </div>
      }
      dock={
        frame ? (
          <ActionDock hint="Click a bit to flip it.">
          <WidgetButton onClick={() => setValue(0)}>Clear</WidgetButton>
          <WidgetButton onClick={() => setValue(Math.floor(Math.random() * 2 ** bits))}>Random</WidgetButton>
          </ActionDock>
        ) : undefined
      }
    />
  );
}

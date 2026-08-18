"use client";

import { useMemo, useState } from "react";
import { WidgetFrame } from "./widget-frame";
import { cn } from "@/lib/cn";
import { WidgetButton } from "./shared/widget-ui";

interface GrayCodeData {
  bits?: unknown;
  title?: unknown;
  className?: unknown;
}

const DEFAULT_TITLE = "Binary Counting vs. Gray Code";

function resolveBits(data: GrayCodeData): number {
  return typeof data.bits === "number" && data.bits >= 2 && data.bits <= 4 ? data.bits : 3;
}

function resolveText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function toBinary(value: number, bits: number): string {
  return value.toString(2).padStart(bits, "0");
}

function diffPositions(a: number, b: number, bits: number): Set<number> {
  const xor = a ^ b;
  const positions = new Set<number>();
  for (let p = 0; p < bits; p++) if (xor & (1 << p)) positions.add(p);
  return positions;
}

function CodeDisplay({
  value,
  bits,
  changed,
}: {
  value: number;
  bits: number;
  changed: Set<number>;
}) {
  const digits = toBinary(value, bits).split("");
  return (
    <div className="flex gap-1">
      {digits.map((d, i) => {
        const bitIndex = bits - 1 - i;
        const isChanged = changed.has(bitIndex);
        return (
          <span
            key={i}
            className={cn(
              "flex h-12 w-9 items-center justify-center rounded-md border-2 text-xl font-bold transition-colors",
              isChanged
                ? "border-copper bg-copper-bg text-copper-dark"
                : "border-border-strong bg-surface-card text-ink",
            )}
          >
            {d}
          </span>
        );
      })}
    </div>
  );
}

export function GrayCodeExplorerWidget({ data }: { data: Record<string, unknown> }) {
  const bits = resolveBits(data);
  const size = 1 << bits;
  const title = resolveText(data.title, DEFAULT_TITLE);
  const className = typeof data.className === "string" ? data.className : undefined;
  const [index, setIndex] = useState(0);

  const prevIndex = (index - 1 + size) % size;

  // "Binary counting order": position i just holds the value i, no reordering.
  const binaryNow = index;
  const binaryPrev = prevIndex;

  // Gray code: reflected-binary sequence, i ^ (i >> 1).
  const grayNow = index ^ (index >> 1);
  const grayPrev = prevIndex ^ (prevIndex >> 1);

  const binaryChanged = useMemo(() => diffPositions(binaryNow, binaryPrev, bits), [binaryNow, binaryPrev, bits]);
  const grayChanged = useMemo(() => diffPositions(grayNow, grayPrev, bits), [grayNow, grayPrev, bits]);

  const isWrap = index === 0;

  return (
    <WidgetFrame title={title} subtitle={`step ${index + 1} of ${size}`} className={className}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-center gap-3">
          <WidgetButton onClick={() => setIndex((i) => (i - 1 + size) % size)}>
            ← Prev
          </WidgetButton>
          <span className=" text-xs text-slate">
            {isWrap ? "wrapping from the last row back to the first" : `row ${prevIndex} → row ${index}`}
          </span>
          <WidgetButton onClick={() => setIndex((i) => (i + 1) % size)}>
            Next →
          </WidgetButton>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-2 p-4">
            <span className=" text-[11px] font-semibold text-slate">
              Binary counting order
            </span>
            <CodeDisplay value={binaryNow} bits={bits} changed={binaryChanged} />
            <span
              className={cn(
                " text-xs font-semibold",
                binaryChanged.size === 1 ? "text-signal-green-strong" : "text-signal-coral-strong",
              )}
            >
              {binaryChanged.size} bit{binaryChanged.size === 1 ? "" : "s"} changed
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-2 p-4">
            <span className=" text-[11px] font-semibold text-slate">
              Gray code order
            </span>
            <CodeDisplay value={grayNow} bits={bits} changed={grayChanged} />
            <span className=" text-xs font-semibold text-signal-green-strong">
              {grayChanged.size} bit changed
            </span>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}

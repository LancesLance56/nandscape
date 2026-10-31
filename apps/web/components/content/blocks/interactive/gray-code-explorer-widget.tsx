"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActionDock, WidgetShell } from "./shared/widget-shell";
import { cn } from "@/lib/cn";
import { StageNote, WidgetButton } from "./shared/widget-ui";

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
              "grid h-12 w-10 place-items-center rounded-[10px] border-2 font-mono text-xl font-bold transition-colors",
              isChanged
                ? "border-signal-blue bg-signal-blue-bg text-signal-blue-strong"
                : "border-border-strong bg-surface-2 text-ink",
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

  const pane = (label: string, value: number, changed: Set<number>, good: boolean) => (
    <div className="flex flex-col items-center gap-2.5 rounded-xl border border-border bg-surface-card p-4">
      <span className="text-xs font-semibold text-slate">{label}</span>
      <CodeDisplay value={value} bits={bits} changed={changed} />
      <span className={cn("text-[13px] font-bold", good ? "text-signal-green-strong" : "text-signal-coral-strong")}>
        {changed.size} bit{changed.size === 1 ? "" : "s"} changed
      </span>
    </div>
  );

  return (
    <WidgetShell
      kind="Number systems"
      singleView
      title={title}
      className={className}
      prompt={
        isWrap
          ? "Wrapping from the last row back to the first: Gray code still flips one bit."
          : `Row ${prevIndex} → row ${index}: binary flips ${binaryChanged.size} bit${binaryChanged.size === 1 ? "" : "s"}, Gray code flips 1.`
      }
      stage={
        <div className="flex flex-col gap-3">
          <div className="grid gap-3.5 sm:grid-cols-2">
            {pane("Binary counting order", binaryNow, binaryChanged, binaryChanged.size === 1)}
            {pane("Gray code order", grayNow, grayChanged, true)}
          </div>
          {/* The prompt already counts the flips; this is why it matters. */}
          <StageNote>
            {isWrap
              ? "The last row and the first differ in one bit, which is why a K-map's edges count as neighbours."
              : "One bit per step is why K-map rows and columns are labelled in this order."}
          </StageNote>
        </div>
      }
      dock={
        <ActionDock hint={isWrap ? "Back at the start." : `Row ${prevIndex} → row ${index}`}>
          <WidgetButton onClick={() => setIndex((i) => (i - 1 + size) % size)} aria-label="Previous row">
            <ChevronLeft className="size-3.5" />
            Prev
          </WidgetButton>
          <WidgetButton tone="primary" onClick={() => setIndex((i) => (i + 1) % size)} aria-label="Next row">
            Next
            <ChevronRight className="size-3.5" />
          </WidgetButton>
        </ActionDock>
      }
    />
  );
}

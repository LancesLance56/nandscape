"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface PollData {
  question: string;
  options: string[];
  className?: string;
}

export function isPollData(data: unknown): data is PollData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.question === "string" &&
    Array.isArray(d.options) &&
    d.options.every((option) => typeof option === "string")
  );
}

export function PollWidget({ data }: { data: Record<string, unknown> }) {
  const [selected, setSelected] = useState<number | null>(null);

  if (!isPollData(data)) {
    return <p className="text-sm text-signal-coral">Poll widget: malformed data.</p>;
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface-2 p-4", data.className)}>
      <p className="mb-3 font-semibold text-ink">{data.question}</p>
      <div className="flex flex-col gap-2">
        {data.options.map((option, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              selected === i
                ? "border-copper bg-copper-bg text-copper-dark"
                : "border-border-strong bg-surface-card text-ink hover:bg-surface",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p className="mt-3 font-mono text-xs text-slate">Thanks for voting</p>
      )}
    </div>
  );
}

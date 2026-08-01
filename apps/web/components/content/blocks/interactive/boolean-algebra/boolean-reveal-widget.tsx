"use client";

import { useState } from "react";
import { useOpsMeterStore } from "@/store/ops-meter-store";

interface BooleanRevealData {
  prompt: string;
  buttonLabel: string;
  beforeLabel?: string;
  beforeCode?: string;
  afterLabel: string;
  afterCode: string;
  explanation: string;
  opsOnReveal?: number;
}

function isBooleanRevealData(data: unknown): data is BooleanRevealData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.prompt === "string" &&
    typeof d.buttonLabel === "string" &&
    typeof d.afterLabel === "string" &&
    typeof d.afterCode === "string" &&
    typeof d.explanation === "string"
  );
}

export function BooleanRevealWidget({ data }: { data: Record<string, unknown> }) {
  const [revealed, setRevealed] = useState(false);
  const bump = useOpsMeterStore((s) => s.bump);

  if (!isBooleanRevealData(data)) {
    return <p className="text-sm text-signal-coral">Reveal widget: malformed data.</p>;
  }

  const handleReveal = () => {
    if (!revealed) bump(data.opsOnReveal ?? 1);
    setRevealed(true);
  };

  return (
    <div className="rounded-xl border border-border bg-surface-card p-5">
      <div className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-slate">
        {data.prompt}
      </div>
      <button
        type="button"
        onClick={handleReveal}
        className="rounded-lg bg-copper px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-copper-dark"
      >
        {data.buttonLabel}
      </button>
      {revealed && (
        <div className="mt-4 border-t border-dashed border-border pt-4">
          {data.beforeCode && (
            <>
              <span className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wide text-signal-coral">
                {data.beforeLabel ?? "Before"}
              </span>
              <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-[13px] leading-relaxed text-ink-soft">
                {data.beforeCode}
              </pre>
            </>
          )}
          <span className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wide text-copper">
            {data.afterLabel}
          </span>
          <pre className="mb-3 overflow-x-auto rounded-lg border border-copper/50 bg-surface-2 p-3 font-mono text-[13px] leading-relaxed text-ink">
            {data.afterCode}
          </pre>
          <p className="text-sm leading-relaxed text-ink-soft">{data.explanation}</p>
        </div>
      )}
    </div>
  );
}

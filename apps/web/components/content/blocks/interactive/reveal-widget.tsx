"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface RevealData {
  prompt: string;
  buttonLabel: string;
  beforeLabel?: string;
  beforeCode?: string;
  afterLabel: string;
  afterCode: string;
  explanation: string;
  opsOnReveal?: number;
  counterAmount?: number;
  className?: string;
}

export function isRevealData(data: unknown): data is RevealData {
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

export function RevealWidget({ data }: { data: Record<string, unknown> }) {
  const [revealed, setRevealed] = useState(false);

  if (!isRevealData(data)) {
    return <p className="text-sm text-signal-coral">Reveal widget: malformed data.</p>;
  }

  const handleReveal = () => {
    setRevealed(true);
  };

  return (
    <div className={cn("rounded-xl border border-border bg-surface-card p-5", data.className)}>
      <div className="mb-3 text-xs font-semibold text-slate">
        {data.prompt}
      </div>
      <button
        type="button"
        onClick={handleReveal}
        className="rounded-lg bg-copper px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-copper-dark"
      >
        {data.buttonLabel}
      </button>
      {revealed && (
        <div className="mt-4 border-t border-dashed border-border pt-4">
          {data.beforeCode && (
            <>
              <span className="mb-1.5 block text-[11px] font-semibold text-signal-coral">
                {data.beforeLabel ?? "Before"}
              </span>
              <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 text-[13px] leading-relaxed text-ink-soft">
                {data.beforeCode}
              </pre>
            </>
          )}
          <span className="mb-1.5 block text-[11px] font-semibold text-copper">
            {data.afterLabel}
          </span>
          <pre className="mb-3 overflow-x-auto rounded-lg border border-copper/50 bg-surface-2 p-3 text-[13px] leading-relaxed text-ink">
            {data.afterCode}
          </pre>
          <p className="text-sm leading-relaxed text-ink-soft">{data.explanation}</p>
        </div>
      )}
    </div>
  );
}

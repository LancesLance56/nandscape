"use client";

import { useState } from "react";

interface BooleanSliderData {
  totalRequests: number;
  initialPercent: number;
  explanationTemplate: string;
}

function isBooleanSliderData(data: unknown): data is BooleanSliderData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.totalRequests === "number" &&
    typeof d.initialPercent === "number" &&
    typeof d.explanationTemplate === "string"
  );
}

export function BooleanSliderWidget({ data }: { data: Record<string, unknown> }) {
  if (!isBooleanSliderData(data)) {
    return <p className="text-sm text-signal-coral">Slider widget: malformed data.</p>;
  }

  const [pct, setPct] = useState(data.initialPercent);
  const total = data.totalRequests;
  const good = Math.round((total * pct) / 100);
  const goodBarWidth = Math.max((good / total) * 100, 1);

  const explanation = data.explanationTemplate
    .replace("{pct}", String(pct))
    .replace("{saved}", (total - good).toLocaleString());

  return (
    <div className="rounded-xl border border-border bg-surface-card p-5">
      <div className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-slate">
        Drag the slider: what share of {total.toLocaleString()} requests are logged in?
      </div>
      <div className="mb-5 flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="flex-1 accent-copper"
        />
        <span className="w-14 text-right font-mono text-sm font-semibold text-copper">{pct}%</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <span className="w-20 shrink-0 text-slate">Bad order</span>
          <div className="h-5 flex-1 overflow-hidden rounded border border-border bg-surface-2">
            <div className="h-full bg-signal-coral" style={{ width: "100%" }} />
          </div>
          <span className="w-24 shrink-0 text-right text-slate">{total.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <span className="w-20 shrink-0 text-slate">Good order</span>
          <div className="h-5 flex-1 overflow-hidden rounded border border-border bg-surface-2">
            <div
              className="h-full bg-copper transition-all duration-300"
              style={{ width: `${goodBarWidth}%` }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-slate">{good.toLocaleString()}</span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{explanation}</p>
    </div>
  );
}

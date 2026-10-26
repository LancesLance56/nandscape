"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Slider } from "@/components/ui/slider";
import { ActionDock, WidgetShell } from "./shared/widget-shell";
import { StatReadout } from "./shared/widget-ui";

/**
 * Renamed/generalized from `boolean-algebra/boolean-slider-widget.tsx`.
 * This was already data-driven (totalRequests / initialPercent /
 * explanationTemplate), so the only tie was its folder and its hardcoded
 * "what share of N requests are logged in?" prompt. That prompt is now an
 * optional `promptTemplate` (with a `{total}` placeholder), defaulting to
 * the exact original copy so existing JSON renders identically.
 */
interface ComparisonSliderData {
  totalRequests: number;
  initialPercent: number;
  explanationTemplate: string;
  promptTemplate?: string;
  goodLabel?: string;
  badLabel?: string;
  className?: string;
}

const DEFAULT_PROMPT_TEMPLATE = "Drag the slider: what share of {total} requests are logged in?";

function isComparisonSliderData(data: unknown): data is ComparisonSliderData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.totalRequests === "number" &&
    typeof d.initialPercent === "number" &&
    typeof d.explanationTemplate === "string"
  );
}

export function ComparisonSliderWidget({ data }: { data: Record<string, unknown> }) {
  if (!isComparisonSliderData(data)) {
    return <p className="text-sm text-signal-coral">Comparison slider: malformed data.</p>;
  }

  const [pct, setPct] = useState(data.initialPercent);
  const total = data.totalRequests;
  const good = Math.round((total * pct) / 100);
  const goodBarWidth = Math.max((good / total) * 100, 1);
  const goodLabel = data.goodLabel ?? "Good order";
  const badLabel = data.badLabel ?? "Bad order";

  const prompt = (data.promptTemplate ?? DEFAULT_PROMPT_TEMPLATE).replace("{total}", total.toLocaleString());
  const explanation = data.explanationTemplate
    .replace("{pct}", String(pct))
    .replace("{saved}", (total - good).toLocaleString());

  const bar = (label: string, width: number, value: number, tone: string) => (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)_5rem] items-center gap-3 text-xs font-semibold text-slate">
      <span>{label}</span>
      <div className="h-4 overflow-hidden rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full transition-all duration-300", tone)} style={{ width: `${width}%` }} />
      </div>
      <b className="text-right font-mono text-ink">{value.toLocaleString()}</b>
    </div>
  );

  return (
    <WidgetShell
      kind="Estimate"
      title={prompt}
      className={data.className}
      prompt={prompt}
      stage={
        <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-5">
          <div className="flex items-center gap-4">
            <Slider min={0} max={100} value={pct} onChange={setPct} aria-label={prompt} className="flex-1" />
            <span className="w-14 text-right font-mono text-lg font-bold text-copper-dark">{pct}%</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {bar(badLabel, 100, total, "bg-signal-coral")}
            {bar(goodLabel, goodBarWidth, good, "bg-copper")}
          </div>
        </div>
      }
      readout={<StatReadout stats={[{ label: "calls that never needed to happen", value: (total - good).toLocaleString(), tone: "good" }]} />}
      caption={explanation}
      captionLabel="Why"
      dock={<ActionDock hint="Drag the slider, or use the arrow keys." />}
    />
  );
}

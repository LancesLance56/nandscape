"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { WidgetButton } from "./shared/widget-ui";
import { ActionDock, WidgetShell } from "./shared/widget-shell";

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
    <WidgetShell
      kind="Think first"
      title={data.prompt}
      className={data.className}
      prompt={data.prompt}
      stage={
        // The answer area keeps one height whether or not it is revealed (and
        // scrolls if the answer is long), so revealing never shoves the page.
        <div className="flex h-56 flex-col gap-3 overflow-y-auto">
          {revealed ? (
            <>
              <div className={cn("grid gap-3", data.beforeCode && "sm:grid-cols-2")}>
                {data.beforeCode && (
                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-signal-coral-strong">
                      {data.beforeLabel ?? "Before"}
                    </span>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-[10px] border border-border bg-surface-2 p-3 font-mono text-[13px] leading-relaxed text-ink-soft">
                      {data.beforeCode}
                    </pre>
                  </div>
                )}
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-copper-dark">
                    {data.afterLabel}
                  </span>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-[10px] border border-copper bg-surface-card p-3 font-mono text-[13px] leading-relaxed text-ink">
                    {data.afterCode}
                  </pre>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink-soft">{data.explanation}</p>
            </>
          ) : (
            <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border-strong">
              <p className="text-xs italic text-slate">The answer appears here once you reveal it.</p>
            </div>
          )}
        </div>
      }
      dock={
        <ActionDock hint={revealed ? "Same result, less work." : "Decide first, then check."}>
          {revealed ? (
            <WidgetButton onClick={() => setRevealed(false)}>Hide again</WidgetButton>
          ) : (
            <WidgetButton tone="primary" size="md" onClick={handleReveal}>
              {data.buttonLabel}
            </WidgetButton>
          )}
        </ActionDock>
      }
    />
  );
}

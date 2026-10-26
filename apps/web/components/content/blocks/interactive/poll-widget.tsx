"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Check } from "lucide-react";
import { ActionDock, WidgetShell } from "./shared/widget-shell";
import { WidgetButton } from "./shared/widget-ui";

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
    <WidgetShell
      kind="Poll"
      title={data.question}
      className={data.className}
      prompt={data.question}
      stage={
        <div className="flex flex-col gap-2.5">
          <div role="group" aria-label="Answer choices" className="mx-auto flex w-full max-w-[34rem] flex-col gap-2.5">
            {data.options.map((option, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={selected === i}
                onClick={() => setSelected(i)}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3.5 rounded-xl border-[1.5px] py-2.5 pl-2.5 pr-3.5 text-left text-sm leading-snug text-ink transition-colors",
                  selected === i ? "border-copper bg-copper-bg" : "border-border-strong bg-surface-card hover:border-slate",
                )}
              >
                <span
                  className={cn(
                    "grid size-[30px] shrink-0 place-items-center rounded-lg text-[13px] font-bold",
                    selected === i ? "bg-copper text-copper-ink" : "bg-surface-2 text-ink-soft",
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{option}</span>
                {selected === i && <Check className="size-[18px] shrink-0 text-copper-dark" aria-hidden />}
              </button>
            ))}
          </div>
        </div>
      }
      dock={
        <ActionDock hint={selected === null ? "Pick the answer you believe." : "Thanks for voting. Read on to see why it works."}>
          {selected !== null && <WidgetButton onClick={() => setSelected(null)}>Change vote</WidgetButton>}
        </ActionDock>
      }
    />
  );
}

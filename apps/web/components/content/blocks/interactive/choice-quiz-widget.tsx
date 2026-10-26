"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ActionDock, WidgetShell } from "./shared/widget-shell";
import { Banner, WidgetButton } from "./shared/widget-ui";

interface ChoiceOption {
  label?: string;
  sublabel?: string;
  code?: string;
  correct: boolean;
}

interface ChoiceQuizData {
  prompt: string;
  options: ChoiceOption[];
  verdictGood: string;
  explanation: string;
  opsOnAnswer?: number;
  counterKey?: string;
  counterAmount?: number;
  className?: string;
}

function isChoiceOption(value: unknown): value is ChoiceOption {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.correct === "boolean";
}

function isChoiceQuizData(data: unknown): data is ChoiceQuizData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.prompt === "string" &&
    Array.isArray(d.options) &&
    d.options.every(isChoiceOption) &&
    typeof d.verdictGood === "string" &&
    typeof d.explanation === "string"
  );
}

export function ChoiceQuizWidget({ data }: { data: Record<string, unknown> }) {
  const [answered, setAnswered] = useState<number | null>(null);

  if (!isChoiceQuizData(data)) {
    return <p className="text-sm text-signal-coral">Choice quiz: malformed data.</p>;
  }

  const handleClick = (index: number) => {
    if (answered !== null) return;
    setAnswered(index);
  };

  return (
    <WidgetShell
      kind="Check yourself"
      title={data.prompt}
      className={data.className}
      prompt={data.prompt}
      stage={
        <div role="group" aria-label="Answer choices" className="grid gap-3 sm:grid-cols-2">
          {data.options.map((option, i) => {
            const isAnswered = answered !== null;
            const isChosen = answered === i;
            return (
              <button
                key={i}
                type="button"
                disabled={isAnswered}
                aria-pressed={isChosen}
                onClick={() => handleClick(i)}
                className={cn(
                  "flex min-h-[64px] flex-col items-start justify-center gap-1 rounded-xl border-[1.5px] px-4 py-3 text-left text-sm font-medium transition-colors",
                  !isAnswered && "border-border-strong bg-surface-card text-ink hover:border-slate",
                  isAnswered && option.correct && "border-signal-green bg-signal-green-bg text-signal-green-strong",
                  isAnswered && !option.correct && isChosen && "border-signal-coral bg-signal-coral-bg text-signal-coral-strong",
                  isAnswered && !option.correct && !isChosen && "border-border-strong bg-surface-card text-ink-soft opacity-50",
                )}
              >
                {option.code ? (
                  <span className="font-mono text-[13px] leading-relaxed">{option.code}</span>
                ) : (
                  <span>
                    <span className="font-semibold">{option.label}</span> {option.sublabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      }
      status={
        answered !== null ? (
          <Banner tone={data.options[answered]?.correct ? "good" : "bad"}>
            <b>{data.verdictGood}</b> {data.explanation}
          </Banner>
        ) : undefined
      }
      dock={
        <ActionDock hint={answered === null ? "Pick one." : "Same logic, same result, different amount of work."}>
          {answered !== null && <WidgetButton onClick={() => setAnswered(null)}>Try again</WidgetButton>}
        </ActionDock>
      }
    />
  );
}

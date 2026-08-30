"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

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
    <div className={cn("rounded-xl border border-border bg-surface-card p-5", data.className)}>
      <div className="mb-3 text-xs font-semibold text-slate">
        {data.prompt}
      </div>
      <div className="flex flex-wrap gap-3">
        {data.options.map((option, i) => {
          const isAnswered = answered !== null;
          const isChosen = answered === i;
          const stateClass = !isAnswered
            ? "border-border-strong bg-surface-2 text-ink hover:border-copper"
            : option.correct
              ? "border-copper bg-copper-bg text-copper-dark"
              : isChosen
                ? "border-signal-coral bg-signal-coral-bg text-signal-coral"
                : "border-border-strong bg-surface-2 text-ink-soft opacity-60";
          return (
            <button
              key={i}
              type="button"
              disabled={isAnswered}
              onClick={() => handleClick(i)}
              className={cn(
                "min-w-[200px] flex-1 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
                stateClass,
              )}
            >
              {option.code ? (
                <span className="block text-[13px]">{option.code}</span>
              ) : (
                <span>
                  <span className=" font-semibold">{option.label}</span> {option.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {answered !== null && (
        <div className="mt-4 border-t border-dashed border-border pt-4">
          <div className="mb-2 text-xs font-semibold tracking-wide text-copper">
            {data.verdictGood}
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{data.explanation}</p>
        </div>
      )}
    </div>
  );
}

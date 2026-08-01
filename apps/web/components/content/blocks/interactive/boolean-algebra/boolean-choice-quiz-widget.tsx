"use client";

import { useState } from "react";
import { useOpsMeterStore } from "@/store/ops-meter-store";

interface ChoiceOption {
  label?: string;
  sublabel?: string;
  code?: string;
  correct: boolean;
}

interface BooleanChoiceQuizData {
  prompt: string;
  options: ChoiceOption[];
  verdictGood: string;
  explanation: string;
  opsOnAnswer?: number;
}

function isChoiceOption(value: unknown): value is ChoiceOption {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.correct === "boolean";
}

function isBooleanChoiceQuizData(data: unknown): data is BooleanChoiceQuizData {
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

export function BooleanChoiceQuizWidget({ data }: { data: Record<string, unknown> }) {
  const [answered, setAnswered] = useState<number | null>(null);
  const bump = useOpsMeterStore((s) => s.bump);

  if (!isBooleanChoiceQuizData(data)) {
    return <p className="text-sm text-signal-coral">Choice quiz: malformed data.</p>;
  }

  const handleClick = (index: number) => {
    if (answered !== null) return;
    setAnswered(index);
    bump(data.opsOnAnswer ?? 1);
  };

  return (
    <div className="rounded-xl border border-border bg-surface-card p-5">
      <div className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-slate">
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
              className={`min-w-[200px] flex-1 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${stateClass}`}
            >
              {option.code ? (
                <span className="block font-mono text-[13px]">{option.code}</span>
              ) : (
                <span>
                  <span className="font-mono font-semibold">{option.label}</span> {option.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {answered !== null && (
        <div className="mt-4 border-t border-dashed border-border pt-4">
          <div className="mb-2 font-mono text-xs font-semibold tracking-wide text-copper">
            {data.verdictGood}
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{data.explanation}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { WidgetFrame } from "./widget-frame";
import { cn } from "@/lib/cn";

interface QuizOption {
  label?: string;
  code?: string;
  correct: boolean;
}

interface QuizQuestion {
  id?: string;
  prompt: string;
  options: QuizOption[];
  explanation?: string;
}

interface QuizData {
  title?: string;
  questions: QuizQuestion[];
  passMessage?: string;
  failMessage?: string;
  counterKey?: string;
  counterAmountPerCorrect?: number;
  className?: string;
}

function isQuizOption(value: unknown): value is QuizOption {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.correct === "boolean";
}

function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.prompt === "string" && Array.isArray(v.options) && v.options.every(isQuizOption);
}

function isQuizData(data: unknown): data is QuizData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.questions) && d.questions.length > 0 && d.questions.every(isQuizQuestion);
}

export function QuizWidget({ data }: { data: Record<string, unknown> }) {
  if (!isQuizData(data)) {
    return <p className="text-sm text-signal-coral">Quiz widget: malformed data (needs a non-empty `questions` array).</p>;
  }

  const { questions } = data;
  const title = data.title ?? "Quiz";
  const passMessage = data.passMessage ?? "Correct.";
  const failMessage = data.failMessage ?? "Worth a re-read before moving on.";

  const [step, setStep] = useState(0);
  const [selectedByStep, setSelectedByStep] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);

  const current = questions[step];
  const answeredCurrent = selectedByStep[step] !== undefined;
  const isLast = step === questions.length - 1;

  const score = useMemo(
    () =>
      Object.entries(selectedByStep).reduce((acc, [qIndex, optIndex]) => {
        const q = questions[Number(qIndex)];
        return q?.options[optIndex]?.correct ? acc + 1 : acc;
      }, 0),
    [selectedByStep, questions],
  );

  const selectOption = (optionIndex: number) => {
    if (answeredCurrent) return;
    setSelectedByStep((prev) => ({ ...prev, [step]: optionIndex }));
  };

  const goNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setStep((s) => s + 1);
  };

  const restart = () => {
    setStep(0);
    setSelectedByStep({});
    setFinished(false);
  };

  const passed = score >= Math.ceil(questions.length / 2);

  return (
    <WidgetFrame
      title={title}
      subtitle={finished ? `score: ${score} / ${questions.length}` : `question ${step + 1} of ${questions.length}`}
      className={data.className}
    >
      {finished ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="font-mono text-3xl font-bold text-ink">
            {score} / {questions.length}
          </span>
          <p className={cn("text-sm font-semibold", passed ? "text-signal-green-strong" : "text-signal-coral-strong")}>
            {passed ? passMessage : failMessage}
          </p>
          <button
            type="button"
            onClick={restart}
            className="rounded-lg border border-border-strong px-4 py-2 font-mono text-xs font-semibold text-ink-soft hover:bg-surface-2"
          >
            Retake quiz
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="font-mono text-xs font-semibold uppercase tracking-wider text-slate">
            {current.prompt}
          </div>

          <div className="flex flex-wrap gap-3">
            {current.options.map((option, i) => {
              const isChosen = selectedByStep[step] === i;
              const isAnswered = answeredCurrent;
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
                  onClick={() => selectOption(i)}
                  className={cn(
                    "min-w-50 flex-1 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
                    stateClass,
                  )}
                >
                  {option.code ? (
                    <span className="block font-mono text-[13px]">{option.code}</span>
                  ) : (
                    <span>{option.label}</span>
                  )}
                </button>
              );
            })}
          </div>

          {answeredCurrent && (
            <div className="border-t border-dashed border-border pt-4">
              {current.explanation && (
                <p className="mb-3 text-sm leading-relaxed text-ink-soft">{current.explanation}</p>
              )}
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-copper px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-copper-dark"
              >
                {isLast ? "See results" : "Next question"}
              </button>
            </div>
          )}
        </div>
      )}
    </WidgetFrame>
  );
}

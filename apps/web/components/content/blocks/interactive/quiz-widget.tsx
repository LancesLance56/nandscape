"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, RotateCcw, X } from "lucide-react";
import { WidgetFrame } from "./widget-frame";
import { cn } from "@/lib/cn";
import { WidgetButton } from "./shared/widget-ui";

export interface QuizOption {
  label?: string;
  code?: string;
  correct: boolean;
}

export interface QuizQuestion {
  id?: string;
  prompt: string;
  options: QuizOption[];
  explanation?: string;
}

export interface QuizData {
  title?: string;
  questions: QuizQuestion[];
  passMessage?: string;
  failMessage?: string;
  counterKey?: string;
  counterAmountPerCorrect?: number;
  className?: string;
  /** Identifies this quiz when a finished run is recorded. Usually
   *  `<pageSlug>:<blockId>`; without it the run is not tracked. */
  quizKey?: string;
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

export function isQuizData(data: unknown): data is QuizData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.questions) && d.questions.length > 0 && d.questions.every(isQuizQuestion);
}

/**
 * The quiz widget.
 *
 * Rebuilt around two things the old one lacked: a sense of where you are, and
 * a record that you did it.
 *
 * Progress is now a segmented bar rather than a "question 3 of 5" caption, and
 * each segment colours itself as you answer, so the result screen is already
 * legible before you reach it. Options are a single column with their state
 * spelled out by an icon as well as by colour, which the old two-tone borders
 * left to hue alone. Explanations slide in under the answered question instead
 * of appearing in a reserved gap, and the layout no longer reserves 7rem of
 * blank space to keep the height steady.
 *
 * A finished run posts to /api/progress/quiz. That endpoint answers 204 for
 * signed-out readers, so the quiz behaves identically without an account and
 * simply is not recorded.
 */
export function QuizWidget({ data }: { data: Record<string, unknown> }) {
  if (!isQuizData(data)) {
    return (
      <p className="text-sm text-signal-coral">Quiz widget: malformed data (needs a non-empty `questions` array).</p>
    );
  }
  return <Quiz data={data} />;
}

function Quiz({ data }: { data: QuizData }) {
  const { questions } = data;
  const title = data.title ?? "Quiz";
  const passMessage = data.passMessage ?? "Correct.";
  const failMessage = data.failMessage ?? "Worth a re-read before moving on.";

  const [step, setStep] = useState(0);
  const [selectedByStep, setSelectedByStep] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const reduceMotion = useReducedMotion();

  const current = questions[step];
  const chosen = selectedByStep[step];
  const answeredCurrent = chosen !== undefined;
  const isLast = step === questions.length - 1;

  const score = useMemo(
    () =>
      Object.entries(selectedByStep).reduce((acc, [qIndex, optIndex]) => {
        const q = questions[Number(qIndex)];
        return q?.options[optIndex]?.correct ? acc + 1 : acc;
      }, 0),
    [selectedByStep, questions],
  );

  // Recorded once per run. Without the guard a re-render after finishing (a
  // theme change, a resize) would post the same result again.
  const recorded = useRef(false);
  useEffect(() => {
    if (!finished || recorded.current || !data.quizKey) return;
    recorded.current = true;

    fetch("/api/progress/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizKey: data.quizKey, score, total: questions.length }),
      // Nothing is shown for this, so a failure is genuinely nothing to
      // recover from.
    }).catch(() => {});
  }, [finished, data.quizKey, score, questions.length]);

  const selectOption = (optionIndex: number) => {
    if (answeredCurrent) return;
    setSelectedByStep((prev) => ({ ...prev, [step]: optionIndex }));
  };

  const goNext = () => (isLast ? setFinished(true) : setStep((s) => s + 1));

  const restart = () => {
    setStep(0);
    setSelectedByStep({});
    setFinished(false);
    recorded.current = false;
  };

  const passed = score >= Math.ceil(questions.length / 2);

  return (
    <WidgetFrame title={title} className={data.className}>
      <div className="flex flex-col gap-4">
        {/* One segment per question: answered ones carry their result, so the
            run so far is readable at a glance. */}
        <div className="flex gap-1" role="presentation">
          {questions.map((q, i) => {
            const answer = selectedByStep[i];
            const state =
              answer === undefined
                ? i === step && !finished
                  ? "bg-copper/40"
                  : "bg-border"
                : q.options[answer]?.correct
                  ? "bg-signal-green-strong"
                  : "bg-signal-coral";
            return <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", state)} />;
          })}
        </div>

        {finished ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="font-display text-4xl font-bold tabular-nums text-ink">
              {score}
              <span className="text-2xl text-slate">/{questions.length}</span>
            </span>
            <p
              className={cn(
                "text-sm font-semibold",
                passed ? "text-signal-green-strong" : "text-signal-coral-strong",
              )}
            >
              {passed ? passMessage : failMessage}
            </p>
            <WidgetButton size="md" onClick={restart}>
              <RotateCcw className="h-3.5 w-3.5" />
              Retake quiz
            </WidgetButton>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold leading-relaxed text-ink">{current.prompt}</p>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate">
                {step + 1}/{questions.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {current.options.map((option, i) => {
                const isChosen = chosen === i;
                const reveal = answeredCurrent;
                const isRight = option.correct;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={reveal}
                    onClick={() => selectOption(i)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                      !reveal && "border-border-strong bg-surface-2 text-ink hover:border-copper hover:bg-surface-card",
                      reveal && isRight && "border-signal-green-strong/50 bg-signal-green-bg text-signal-green-strong",
                      reveal && !isRight && isChosen && "border-signal-coral/50 bg-signal-coral-bg text-signal-coral",
                      reveal && !isRight && !isChosen && "border-border bg-surface-2 text-ink-soft opacity-50",
                    )}
                  >
                    {/* State is carried by shape as well as colour, so the
                        right answer is not conveyed by hue alone. */}
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                        !reveal && "border-border-strong text-slate",
                        reveal && isRight && "border-signal-green-strong bg-signal-green-strong text-white",
                        reveal && !isRight && isChosen && "border-signal-coral bg-signal-coral text-white",
                        reveal && !isRight && !isChosen && "border-border text-slate",
                      )}
                    >
                      {reveal && isRight ? (
                        <Check className="h-3 w-3" />
                      ) : reveal && isChosen ? (
                        <X className="h-3 w-3" />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </span>

                    {option.code ? (
                      <span className="font-mono text-[13px]">{option.code}</span>
                    ) : (
                      <span>{option.label}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {answeredCurrent && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3 border-t border-dashed border-border pt-3.5"
              >
                {current.explanation && (
                  <p className="text-sm leading-relaxed text-ink-soft">{current.explanation}</p>
                )}
                <WidgetButton tone="primary" size="md" onClick={goNext}>
                  {isLast ? "See results" : "Next question"}
                </WidgetButton>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}

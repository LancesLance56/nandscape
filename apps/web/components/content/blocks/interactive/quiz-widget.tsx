"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, RotateCcw, X } from "lucide-react";
import { ActionDock, DetailedOnly, WidgetShell } from "./shared/widget-shell";
import { cn } from "@/lib/cn";
import { Banner, WidgetButton } from "./shared/widget-ui";

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

  const answeredRight = answeredCurrent && current.options[chosen]?.correct;

  return (
    <WidgetShell
      kind="Check yourself"
      title={title}
      meta={finished ? "done" : `question ${step + 1} of ${questions.length}`}
      className={data.className}
      // One segment per question: answered ones carry their result, so the
      // run so far is readable at a glance. It sits where a mode switch would.
      primary={
        <div className="flex w-56 gap-1" role="presentation">
          {questions.map((q, i) => {
            const answer = selectedByStep[i];
            const state =
              answer === undefined
                ? i === step && !finished
                  ? "bg-copper"
                  : "bg-surface-4"
                : q.options[answer]?.correct
                  ? "bg-signal-green"
                  : "bg-signal-coral";
            return <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", state)} />;
          })}
        </div>
      }
      prompt={finished ? undefined : current.prompt}
      stage={
        finished ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="font-display text-4xl font-bold tabular-nums text-ink">
              {score}
              <span className="text-2xl text-slate">/{questions.length}</span>
            </span>
            <p className={cn("text-sm font-semibold", passed ? "text-signal-green-strong" : "text-signal-coral-strong")}>
              {passed ? passMessage : failMessage}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-3">
            <DetailedOnly>
              <p className="text-[15px] font-semibold leading-relaxed text-ink">{current.prompt}</p>
            </DetailedOnly>
            <div role="group" aria-label="Answer choices" className="flex flex-col gap-2.5">
              {current.options.map((option, i) => {
                const isChosen = chosen === i;
                const reveal = answeredCurrent;
                const isRight = option.correct;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={reveal}
                    aria-pressed={isChosen}
                    onClick={() => selectOption(i)}
                    className={cn(
                      "flex min-h-[52px] items-center gap-3.5 rounded-xl border-[1.5px] py-2 pl-2 pr-3.5 text-left text-sm transition-colors",
                      !reveal && "border-border-strong bg-surface-card text-ink hover:border-slate",
                      reveal && isRight && "border-signal-green bg-signal-green-bg text-signal-green-strong",
                      reveal && !isRight && isChosen && "border-signal-coral bg-signal-coral-bg text-signal-coral-strong",
                      reveal && !isRight && !isChosen && "border-border-strong bg-surface-card text-ink-soft opacity-50",
                    )}
                  >
                    {/* State is carried by shape as well as colour, so the
                        right answer is not conveyed by hue alone. */}
                    <span
                      className={cn(
                        "grid size-[30px] shrink-0 place-items-center rounded-lg text-[13px] font-bold",
                        !reveal && "bg-surface-2 text-ink-soft",
                        reveal && isRight && "bg-signal-green text-surface-card",
                        reveal && !isRight && isChosen && "bg-signal-coral text-surface-card",
                        reveal && !isRight && !isChosen && "bg-surface-2 text-slate",
                      )}
                    >
                      {reveal && isRight ? (
                        <Check className="size-4" />
                      ) : reveal && isChosen ? (
                        <X className="size-4" />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </span>

                    {option.code ? (
                      <span className="font-code text-[15px] font-semibold">{option.code}</span>
                    ) : (
                      <span>{option.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )
      }
      status={
        !finished && answeredCurrent ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="mx-auto w-full max-w-[34rem]"
          >
            <Banner tone={answeredRight ? "good" : "bad"}>
              <b>{answeredRight ? "Correct. " : "Not quite. "}</b>
              {current.explanation}
            </Banner>
          </motion.div>
        ) : undefined
      }
      dock={
        finished ? (
          <ActionDock hint={`${score} of ${questions.length} right.`}>
            <WidgetButton size="md" onClick={restart}>
              <RotateCcw className="h-3.5 w-3.5" />
              Retake quiz
            </WidgetButton>
          </ActionDock>
        ) : (
          <ActionDock hint={answeredCurrent ? undefined : "Pick an answer."}>
            {answeredCurrent && (
              <WidgetButton tone="primary" size="md" onClick={goNext}>
                {isLast ? "See results" : "Next question"}
              </WidgetButton>
            )}
          </ActionDock>
        )
      }
    />
  );
}

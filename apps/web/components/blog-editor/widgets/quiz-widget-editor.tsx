"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { Button } from "@/components/ui/button";
import type { QuizData, QuizOption, QuizQuestion } from "@/components/content/blocks/interactive/quiz-widget";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function emptyQuestion(): QuizQuestion {
  return { prompt: "", options: [{ label: "", correct: true }, { label: "", correct: false }] };
}

export function QuizWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const quiz = data as Partial<QuizData>;
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  const setQuestions = (next: QuizQuestion[]) => onChange({ ...data, questions: next });
  const updateQuestion = (i: number, patch: Partial<QuizQuestion>) =>
    setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const updateOption = (qIndex: number, oIndex: number, patch: Partial<QuizOption>) =>
    updateQuestion(qIndex, {
      options: questions[qIndex].options.map((o, j) => (j === oIndex ? { ...o, ...patch } : o)),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title (optional)">
          <input
            className={fieldInputClass}
            value={text(quiz.title)}
            onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          />
        </Field>
        <Field label="Pass message (optional)">
          <input
            className={fieldInputClass}
            value={text(quiz.passMessage)}
            onChange={(e) => onChange({ ...data, passMessage: e.target.value || undefined })}
          />
        </Field>
      </div>

      {questions.map((question, qIndex) => (
        <div key={qIndex} className="flex flex-col gap-2 rounded-lg border border-border-strong p-3">
          <div className="flex items-center justify-between">
            <span className=" text-[11px] font-semibold text-slate">
              Question {qIndex + 1}
            </span>
            <Button variant="ghost" size="app" onClick={() => setQuestions(questions.filter((_, j) => j !== qIndex))}>
              Remove question
            </Button>
          </div>

          <Field label="Prompt">
            <input
              className={fieldInputClass}
              value={question.prompt}
              onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
            />
          </Field>

          <div className="flex flex-col gap-1.5">
            {question.options.map((option, oIndex) => (
              <div key={oIndex} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={option.correct}
                  onChange={(e) => updateOption(qIndex, oIndex, { correct: e.target.checked })}
                  title="Correct answer"
                />
                <input
                  className={fieldInputClass}
                  placeholder="Option label"
                  value={option.label ?? ""}
                  onChange={(e) => updateOption(qIndex, oIndex, { label: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="app"
                  onClick={() =>
                    updateQuestion(qIndex, { options: question.options.filter((_, j) => j !== oIndex) })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="app"
              onClick={() => updateQuestion(qIndex, { options: [...question.options, { label: "", correct: false }] })}
            >
              + Add option
            </Button>
          </div>

          <Field label="Explanation (optional)">
            <textarea
              rows={2}
              className={`${fieldInputClass} resize-y`}
              value={question.explanation ?? ""}
              onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value || undefined })}
            />
          </Field>
        </div>
      ))}

      <Button variant="outline" size="app" onClick={() => setQuestions([...questions, emptyQuestion()])}>
        + Add question
      </Button>
    </div>
  );
}

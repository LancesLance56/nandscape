"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { Button } from "@/components/ui/button";
import type { PollData } from "@/components/content/blocks/interactive/poll-widget";

export function PollWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const poll = data as Partial<PollData>;
  const question = typeof poll.question === "string" ? poll.question : "";
  const options = Array.isArray(poll.options) ? poll.options.filter((o): o is string => typeof o === "string") : [];

  const setOptions = (next: string[]) => onChange({ ...data, options: next });

  return (
    <div className="flex flex-col gap-3">
      <Field label="Question">
        <input
          className={fieldInputClass}
          value={question}
          onChange={(e) => onChange({ ...data, question: e.target.value })}
        />
      </Field>
      <Field label="Options">
        <div className="flex flex-col gap-2">
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={fieldInputClass}
                value={option}
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
              />
              <Button variant="ghost" size="sm" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setOptions([...options, ""])}>
            + Add option
          </Button>
        </div>
      </Field>
    </div>
  );
}

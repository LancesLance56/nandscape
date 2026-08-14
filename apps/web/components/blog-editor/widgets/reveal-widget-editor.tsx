"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import type { RevealData } from "@/components/content/blocks/interactive/reveal-widget";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function RevealWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const reveal = data as Partial<RevealData>;
  const set = (patch: Partial<RevealData>) => onChange({ ...data, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <Field label="Prompt">
        <input className={fieldInputClass} value={text(reveal.prompt)} onChange={(e) => set({ prompt: e.target.value })} />
      </Field>
      <Field label="Button label">
        <input
          className={fieldInputClass}
          value={text(reveal.buttonLabel)}
          onChange={(e) => set({ buttonLabel: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Before label (optional)">
          <input
            className={fieldInputClass}
            value={text(reveal.beforeLabel)}
            onChange={(e) => set({ beforeLabel: e.target.value || undefined })}
          />
        </Field>
        <Field label="After label">
          <input
            className={fieldInputClass}
            value={text(reveal.afterLabel)}
            onChange={(e) => set({ afterLabel: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Before code (optional)">
        <textarea
          rows={4}
          className={`${fieldInputClass} resize-y text-xs`}
          value={text(reveal.beforeCode)}
          onChange={(e) => set({ beforeCode: e.target.value || undefined })}
        />
      </Field>
      <Field label="After code">
        <textarea
          rows={4}
          className={`${fieldInputClass} resize-y text-xs`}
          value={text(reveal.afterCode)}
          onChange={(e) => set({ afterCode: e.target.value })}
        />
      </Field>
      <Field label="Explanation">
        <textarea
          rows={3}
          className={`${fieldInputClass} resize-y`}
          value={text(reveal.explanation)}
          onChange={(e) => set({ explanation: e.target.value })}
        />
      </Field>
    </div>
  );
}

import type { CalloutBlock, CalloutTone } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { RichTextField } from "@/components/blog-editor/fields/rich-text-field";

const TONES: CalloutTone[] = ["note", "tip", "warning", "important"];

function toneLabel(tone: CalloutTone): string {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

export function CalloutBlockEditor({
  block,
  onChange,
}: {
  block: CalloutBlock;
  onChange: (patch: Partial<Omit<CalloutBlock, "id" | "type">>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Tone">
        <select
          className={fieldInputClass}
          value={block.tone}
          onChange={(e) => onChange({ tone: e.target.value as CalloutTone })}
        >
          {TONES.map((tone) => (
            <option key={tone} value={tone}>
              {toneLabel(tone)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Title (optional)">
        <input
          className={fieldInputClass}
          value={block.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value || undefined })}
          placeholder={toneLabel(block.tone)}
        />
      </Field>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-slate">Body</span>
        <RichTextField
          content={block.content}
          onChange={(content) => onChange({ content })}
          placeholder="Callout text…"
        />
      </label>
    </div>
  );
}

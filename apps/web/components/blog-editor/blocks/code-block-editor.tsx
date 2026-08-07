import type { CodeBlock } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";

export function CodeBlockEditor({
  block,
  onChange,
}: {
  block: CodeBlock;
  onChange: (patch: Partial<Omit<CodeBlock, "id" | "type">>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Language">
        <input
          className={fieldInputClass}
          value={block.language ?? ""}
          onChange={(e) => onChange({ language: e.target.value || undefined })}
          placeholder="typescript, bash, text…"
        />
      </Field>
      <Field label="Code">
        <textarea
          rows={10}
          className={`${fieldInputClass} resize-y font-mono`}
          value={block.code}
          onChange={(e) => onChange({ code: e.target.value })}
        />
      </Field>
    </div>
  );
}

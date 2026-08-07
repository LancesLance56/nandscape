import type { HeadingBlock } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";

export function HeadingBlockEditor({
  block,
  onChange,
}: {
  block: HeadingBlock;
  onChange: (patch: Partial<Omit<HeadingBlock, "id" | "type">>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Level">
        <select
          className={fieldInputClass}
          value={block.level}
          onChange={(e) => onChange({ level: Number(e.target.value) as HeadingBlock["level"] })}
        >
          {[1, 2, 3, 4].map((level) => (
            <option key={level} value={level}>
              H{level}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Text">
        <input className={fieldInputClass} value={block.text} onChange={(e) => onChange({ text: e.target.value })} />
      </Field>
    </div>
  );
}

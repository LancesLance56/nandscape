import type { ButtonBlock } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";

export function ButtonBlockEditor({
  block,
  onChange,
}: {
  block: ButtonBlock;
  onChange: (patch: Partial<Omit<ButtonBlock, "id" | "type">>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Label">
        <input className={fieldInputClass} value={block.label} onChange={(e) => onChange({ label: e.target.value })} />
      </Field>
      <Field label="Destination">
        <input className={fieldInputClass} value={block.href} onChange={(e) => onChange({ href: e.target.value })} />
      </Field>
      <Field label="Style">
        <select
          className={fieldInputClass}
          value={block.style ?? "primary"}
          onChange={(e) => onChange({ style: e.target.value as ButtonBlock["style"] })}
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
        </select>
      </Field>
    </div>
  );
}

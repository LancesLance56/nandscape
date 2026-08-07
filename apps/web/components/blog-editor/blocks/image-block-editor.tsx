import type { ImageBlock } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";

export function ImageBlockEditor({
  block,
  onChange,
}: {
  block: ImageBlock;
  onChange: (patch: Partial<Omit<ImageBlock, "id" | "type">>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Image URL">
        <input className={fieldInputClass} value={block.src} onChange={(e) => onChange({ src: e.target.value })} />
      </Field>
      <Field label="Alt text">
        <input className={fieldInputClass} value={block.alt} onChange={(e) => onChange({ alt: e.target.value })} />
      </Field>
      <Field label="Caption (optional)">
        <input
          className={fieldInputClass}
          value={block.caption ?? ""}
          onChange={(e) => onChange({ caption: e.target.value || undefined })}
        />
      </Field>
    </div>
  );
}

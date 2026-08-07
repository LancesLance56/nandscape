import type { VideoBlock } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";

export function VideoBlockEditor({
  block,
  onChange,
}: {
  block: VideoBlock;
  onChange: (patch: Partial<Omit<VideoBlock, "id" | "type">>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Provider">
        <select
          className={fieldInputClass}
          value={block.provider}
          onChange={(e) => onChange({ provider: e.target.value as VideoBlock["provider"] })}
        >
          <option value="youtube">YouTube</option>
          <option value="vimeo">Vimeo</option>
        </select>
      </Field>
      <Field label="Video ID">
        <input
          className={fieldInputClass}
          value={block.videoId}
          onChange={(e) => onChange({ videoId: e.target.value })}
        />
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

import type { CodeBlock, CodeVariant } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";

/** Offered as one-click adds; any shiki language id can still be typed in. */
const SUGGESTED = ["python", "cpp", "typescript", "java", "go", "rust"];

export function CodeBlockEditor({
  block,
  onChange,
}: {
  block: CodeBlock;
  onChange: (patch: Partial<Omit<CodeBlock, "id" | "type">>) => void;
}) {
  const variants = block.variants ?? [];

  const updateVariant = (index: number, patch: Partial<CodeVariant>) => {
    onChange({ variants: variants.map((v, i) => (i === index ? { ...v, ...patch } : v)) });
  };

  const addVariant = (language: string) => {
    onChange({ variants: [...variants, { language, code: "" }] });
  };

  const removeVariant = (index: number) => {
    const next = variants.filter((_, i) => i !== index);
    // Drop the key entirely when empty so the block round-trips back to its
    // original single-language shape instead of carrying an empty array.
    onChange({ variants: next.length > 0 ? next : undefined });
  };

  const alreadyPresent = new Set([block.language, ...variants.map((v) => v.language)]);

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

      <div className="border-t border-border pt-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate">
            Other languages {variants.length > 0 && `(${variants.length})`}
          </span>
          {SUGGESTED.filter((l) => !alreadyPresent.has(l)).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => addVariant(l)}
              className="rounded-md border border-border-strong px-2 py-0.5 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
            >
              + {l}
            </button>
          ))}
        </div>

        {variants.length === 0 && (
          <p className="text-[11px] text-slate">
            Add one to turn this block into language tabs. The block above stays as the first tab.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {variants.map((v, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface-2/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  className={`${fieldInputClass} h-8 flex-1`}
                  value={v.language}
                  onChange={(e) => updateVariant(i, { language: e.target.value })}
                  placeholder="python"
                />
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  aria-label={`Remove ${v.language} variant`}
                  className="rounded-md px-2 py-1 text-xs text-ink-soft transition-colors hover:text-signal-coral"
                >
                  Remove
                </button>
              </div>
              <textarea
                rows={8}
                className={`${fieldInputClass} resize-y font-mono`}
                value={v.code}
                onChange={(e) => updateVariant(i, { code: e.target.value })}
                placeholder={`The same snippet, in ${v.language || "another language"}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

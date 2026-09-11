"use client";

import { useId, useState } from "react";
import { MarkdownPreview } from "@/components/content/markdown-preview";
import { cn } from "@/lib/cn";

/**
 * A plain Markdown box with a preview tab.
 *
 * Deliberately not a rich-text editor. A rich-text surface has to decide what
 * happens to every paste, every keystroke and every half-formed structure, and
 * the result is a component with more behaviour than the posts it produces.
 * A textarea plus a preview is what Stack Overflow and Reddit both settled on
 * for the same reason: the author can always see the source, so nothing the
 * editor does is a surprise, and the stored value is exactly what was typed.
 *
 * The preview is the real renderer minus syntax highlighting - see
 * `MarkdownPreview` - so it is not an approximation of the layout.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 8,
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const id = useId();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <div className="flex items-center gap-1 border-b border-border bg-surface-2 px-2 py-1.5">
        {(["write", "preview"] as const).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            aria-pressed={tab === name}
            className={cn(
              "rounded-md px-3 py-1 text-xs capitalize transition-colors",
              tab === name
                ? "bg-surface-card font-semibold text-ink"
                : "font-medium text-ink-soft hover:text-ink",
            )}
          >
            {name}
          </button>
        ))}
        <span className="ml-auto pr-1 font-mono text-[11px] text-slate">
          Markdown &middot; **bold** `code` &gt; quote
        </span>
      </div>

      {tab === "write" ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="block w-full resize-y bg-surface-card px-3.5 py-3 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-slate"
        />
      ) : (
        // Matches the textarea's minimum height so switching tabs does not
        // make the page jump under the pointer.
        <div className="px-3.5 py-3" style={{ minHeight: `${rows * 1.6 + 1.5}rem` }}>
          <MarkdownPreview source={value} />
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useCodeLanguageStore } from "@/store/code-language-store";

export interface RenderedVariant {
  language: string;
  label: string;
  /** Pre-highlighted by shiki on the server, so no highlighter ships to the client. */
  html: string;
}

/**
 * Tabbed view over the same snippet in several languages. Highlighting is done
 * server-side; this component only picks which pre-rendered block to show.
 */
export function CodeTabs({ variants, className }: { variants: RenderedVariant[]; className?: string }) {
  const preferred = useCodeLanguageStore((s) => s.preferred);
  const setPreferred = useCodeLanguageStore((s) => s.setPreferred);
  const [active, setActive] = useState(0);

  // Follow the reader's site-wide pick when this block offers it. Blocks
  // without that language keep whatever tab they were on instead of
  // silently showing an unrelated one.
  useEffect(() => {
    if (!preferred) return;
    const i = variants.findIndex((v) => v.language === preferred);
    if (i >= 0) setActive(i);
  }, [preferred, variants]);

  const current = variants[Math.min(active, variants.length - 1)];

  return (
    <div className={cn("not-prose overflow-hidden rounded-xl border border-border bg-surface-2", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5" role="tablist">
        {variants.map((v, i) => (
          <button
            key={v.language}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => {
              setActive(i);
              setPreferred(v.language);
            }}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
              i === active ? "bg-surface-card text-ink shadow-sm" : "text-slate hover:text-ink",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="font-mono text-sm" dangerouslySetInnerHTML={{ __html: current.html }} />
    </div>
  );
}

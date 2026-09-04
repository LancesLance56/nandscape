"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CodeBlock } from "@/types/content-block";
import { shikiOptions } from "@/lib/shiki-code";

const HIGHLIGHT_DEBOUNCE_MS = 200;

/**
 * The published page's CodeBlockView is an async Server Component - it
 * calls a server-only shiki singleton (lib/shiki.ts) that can't run inside
 * this client-rendered live-preview tree. shiki also ships a browser bundle
 * built for exactly this ("shiki/bundle/web"): each language grammar is
 * fetched via dynamic import only when actually used, and results are
 * cached in a singleton highlighter after the first call, so this doesn't
 * pull the whole language list into the editor's bundle up front.
 */
export function PreviewCodeBlock({ block }: { block: CodeBlock }) {
  const [html, setHtml] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<number | null>(null);

  const variants = useMemo(
    () => [
      { language: block.language || "text", code: block.code },
      ...(block.variants ?? []).filter((v) => typeof v?.code === "string"),
    ],
    [block.language, block.code, block.variants],
  );

  const current = variants[Math.min(active, variants.length - 1)];

  useEffect(() => {
    let cancelled = false;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      import("shiki/bundle/web")
        .then(({ codeToHtml }) =>
          // Same contract as the published CodeBlockView - see lib/shiki-code.ts.
          codeToHtml(current.code, shikiOptions(current.language)),
        )
        .then((result) => {
          if (!cancelled) setHtml(result);
        })
        .catch(() => {
          // Unrecognized language, etc. - fall back to the plain <pre>
          // below rather than leaving the block stuck mid-highlight.
          if (!cancelled) setHtml(null);
        });
    }, HIGHLIGHT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [current.code, current.language]);

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border bg-surface-2">
      {variants.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
          {variants.map((v, i) => (
            <button
              key={`${v.language}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                i === active ? "bg-surface-card text-ink shadow-sm" : "text-slate hover:text-ink"
              }`}
            >
              {v.language || "text"}
            </button>
          ))}
        </div>
      ) : (
        block.language && (
          <div className="border-b border-border px-4 py-1.5 font-mono text-[11px] text-slate">{block.language}</div>
        )
      )}

      {html ? (
        <div className="font-mono text-sm" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="overflow-x-auto p-4 font-mono text-sm text-ink">
          <code>{current.code}</code>
        </pre>
      )}
    </div>
  );
}

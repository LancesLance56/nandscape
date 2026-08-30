"use client";

import { useMemo, useState } from "react";
import { Check, Code2, Copy } from "lucide-react";
import {
  buildEmbedSnippet,
  embedUrl,
  type EmbedOptions,
  type EmbedTarget,
} from "@/lib/embeds/embeddable";
import { cn } from "@/lib/cn";
import { useOrigin } from "@/hooks/use-origin";

/**
 * The "Embed" control, for anything embeddable.
 *
 * It takes a target rather than a circuit slug, since nothing about copying
 * an iframe tag is specific to circuits. A tool page, a project page and the
 * embeds gallery all render this same component with a different `target`.
 *
 * The option list is short on purpose. Size and colour scheme are what a host
 * page needs to control, and the credit link is here so that turning it off is
 * a visible choice rather than something you find by reading a query string.
 */
export function EmbedBuilder({
  target,
  title,
  defaultHeight,
  className,
  variant = "button",
}: {
  target: EmbedTarget;
  title: string;
  defaultHeight: number;
  className?: string;
  /** `button` hides the panel behind an Embed toggle; `inline` is always open,
   *  for a page whose whole subject is the embed. */
  variant?: "button" | "inline";
}) {
  const [open, setOpen] = useState(variant === "inline");
  const [copied, setCopied] = useState<"snippet" | "url" | null>(null);
  const [responsive, setResponsive] = useState(false);
  const [height, setHeight] = useState(defaultHeight);
  const [options, setOptions] = useState<EmbedOptions>({ credit: true, theme: "auto" });

  // Read from the browser rather than baked in at build time, so the snippet
  // matches whatever host the reader is actually on: localhost while
  // developing, the real domain in production. See use-origin for why this
  // cannot just read window.location directly.
  const origin = useOrigin();

  const snippet = useMemo(
    () =>
      buildEmbedSnippet({
        origin,
        target,
        title,
        width: responsive ? "responsive" : 640,
        height,
        options,
      }),
    [origin, target, title, responsive, height, options],
  );

  const directUrl = useMemo(() => embedUrl({ origin, target, options }), [origin, target, options]);

  const copy = async (text: string, which: "snippet" | "url") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be refused (insecure origin, permissions). The
      // textarea is selectable by hand, so the important thing here is not to
      // claim a copy that did not happen.
      setCopied(null);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", variant === "button" && "items-end", className)}>
      {variant === "button" && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
        >
          <Code2 className="h-3.5 w-3.5" />
          Embed
        </button>
      )}

      {open && (
        <div
          className={cn(
            "w-full rounded-xl border border-border bg-surface-card p-3",
            variant === "button" && "max-w-md shadow-lg",
          )}
        >
          <p className="mb-3 text-xs leading-relaxed text-ink-soft">
            Paste this anywhere that allows HTML. Your readers can drive it the same way you can, and there is no
            script to load.
          </p>

          <textarea
            readOnly
            rows={4}
            value={snippet}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-lg border border-border-strong bg-surface px-2 py-1.5 font-mono text-[11px] leading-relaxed text-ink outline-none focus:border-copper"
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-soft">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={responsive}
                onChange={(e) => setResponsive(e.target.checked)}
                className="accent-copper"
              />
              Full width
            </label>

            <label className="flex items-center gap-1.5">
              Height
              <input
                type="number"
                min={160}
                max={1600}
                step={20}
                value={height}
                onChange={(e) => setHeight(Math.max(160, Math.min(1600, Number(e.target.value) || defaultHeight)))}
                className="w-16 rounded-md border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink outline-none focus:border-copper"
              />
            </label>

            <label className="flex items-center gap-1.5">
              Theme
              <select
                value={options.theme}
                onChange={(e) => setOptions((o) => ({ ...o, theme: e.target.value as EmbedOptions["theme"] }))}
                className="rounded-md border border-border-strong bg-surface px-1.5 py-0.5 text-[11px] text-ink outline-none focus:border-copper"
              >
                <option value="auto">Match reader</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5" title="A small link back to Nandscape in the corner">
              <input
                type="checkbox"
                checked={options.credit}
                onChange={(e) => setOptions((o) => ({ ...o, credit: e.target.checked }))}
                className="accent-copper"
              />
              Credit link
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => copy(directUrl, "url")}
              className="text-[11px] font-medium text-slate underline decoration-border-strong underline-offset-2 transition-colors hover:text-copper-dark"
            >
              {copied === "url" ? "URL copied" : "Copy direct URL"}
            </button>
            <button
              type="button"
              onClick={() => copy(snippet, "snippet")}
              className="flex items-center gap-1.5 rounded-lg bg-copper px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-copper-dark"
            >
              {copied === "snippet" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "snippet" ? "Copied" : "Copy embed code"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

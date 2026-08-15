"use client";

import { useState } from "react";

const EMBED_WIDTH = 640;
const EMBED_HEIGHT = 420;

/**
 * Hands the reader a ready-made iframe snippet for this circuit.
 *
 * This is the passive half of link building: every blog post or course page
 * that pastes this snippet renders the embed, which carries a "Built with
 * Nandscape" link back (see embed-stage.tsx). Making the snippet one click
 * away is the difference between that happening and not.
 */
export function EmbedSnippet({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Built in the browser so the snippet always matches the host the reader
  // is actually on (localhost while developing, the real domain in
  // production) rather than a value baked in at build time.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const snippet =
    `<iframe src="${origin}/embed/${slug}" width="${EMBED_WIDTH}" height="${EMBED_HEIGHT}" ` +
    `style="border:1px solid #ddd;border-radius:12px" title="${name}" loading="lazy"></iframe>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions) - the
      // textarea below is still selectable by hand, so there's nothing to
      // recover from beyond not claiming success.
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
      >
        Embed
      </button>

      {open && (
        <div className="w-full max-w-md rounded-xl border border-border bg-surface-card p-3 shadow-lg">
          <p className="mb-2 text-xs text-ink-soft">
            Paste this anywhere that allows HTML. The circuit stays interactive for your readers.
          </p>
          <textarea
            readOnly
            rows={3}
            value={snippet}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-lg border border-border-strong bg-surface px-2 py-1.5 font-mono text-[11px] leading-relaxed text-ink outline-none focus:border-copper"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate">
              {copied ? "Copied to clipboard" : `${EMBED_WIDTH}×${EMBED_HEIGHT}, resize as needed`}
            </span>
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-copper px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-copper-dark"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Code2 } from "lucide-react";
import { buildEmbedSnippet } from "@/lib/embeds/embeddable";
import { useOrigin } from "@/hooks/use-origin";
import { cn } from "@/lib/cn";

/**
 * Copy this tool's iframe tag.
 *
 * The homepage used to carry a whole Embeds section to make the point that
 * everything here is embeddable: a pitch, a live preview, and one snippet for
 * whichever demo you had picked. It said it once, in a place you had to scroll
 * to, about one tool at a time.
 *
 * This says it nine times, on the tools themselves, and it is the working
 * thing rather than a description of it - press it and the tag for that tool
 * is on your clipboard. A button on every tile is a stronger claim than a
 * paragraph asserting the same fact further down the page.
 *
 * It sits above the tile's stretched link, so pressing it copies rather than
 * navigating.
 */
export function EmbedCopy({
  slug,
  title,
  height,
  className,
}: {
  /** The tool's slug, which is also its embed id. */
  slug: string;
  title: string;
  /** The tool's own sensible iframe height. */
  height: number;
  className?: string;
}) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);

  const copy = async (event: React.MouseEvent) => {
    // The tile behind this is one big link. Without both of these, copying
    // also navigates away from the page you wanted the snippet for.
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(
        buildEmbedSnippet({
          origin,
          target: { kind: "tool", id: slug },
          title,
          width: "responsive",
          height,
        }),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // A clipboard the browser refuses is not worth an error state on a
      // marketing tile. The tool's own page carries the snippet as text.
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : `Copy the embed code for ${title}`}
      aria-label={copied ? "Embed code copied" : `Copy the embed code for ${title}`}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold transition-colors",
        copied ? "text-signal-green-strong" : "text-slate hover:bg-surface-2 hover:text-copper-dark",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Embed"}
    </button>
  );
}

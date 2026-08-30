"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { buildEmbedSnippet, embedPath, type EmbedTarget } from "@/lib/embeds/embeddable";
import { cn } from "@/lib/cn";
import { useOrigin } from "@/hooks/use-origin";

/**
 * The embeds pitch, with a working demo next to it.
 *
 * This is the smallest section on the page that still proves something. The
 * claim is that anything here goes on your site in one line, so the panel on
 * the right shows that line running: a real iframe against a real embed URL
 * rather than a screenshot. Switching the chips changes the code and the
 * preview together.
 *
 * The demos are named here rather than read from the catalog, because this is
 * an advert. The first one should be the most impressive, not whichever tool
 * happens to sort first.
 */

interface Demo {
  id: string;
  label: string;
  target: EmbedTarget;
  title: string;
  height: number;
}

const DEMOS: Demo[] = [
  {
    id: "sorting",
    label: "Sorting visualizer",
    target: { kind: "tool", id: "sorting-algorithm-visualizer" },
    title: "Sorting Algorithm Visualizer",
    height: 720,
  },
  {
    id: "kmap",
    label: "K-map solver",
    target: { kind: "tool", id: "karnaugh-map-solver" },
    title: "Karnaugh Map Solver",
    height: 520,
  },
  {
    id: "flowchart",
    label: "Merge sort flowchart",
    target: { kind: "flowchart", id: "merge" },
    title: "Merge sort",
    height: 460,
  },
  {
    id: "graph",
    label: "Graph traversal",
    target: { kind: "tool", id: "graph-algorithm-visualizer" },
    title: "Graph Algorithm Visualizer",
    height: 520,
  },
];

/** Enough to show the tool working without letting the section take over the
 *  page. Real embeds use whatever height the host asks for. */
const PREVIEW_HEIGHT = 380;

export function EmbedsShowcase() {
  const [active, setActive] = useState(DEMOS[0]);
  const [copied, setCopied] = useState(false);

  const origin = useOrigin();

  const snippet = useMemo(
    () =>
      buildEmbedSnippet({
        origin,
        target: active.target,
        title: active.title,
        width: "responsive",
        height: active.height,
      }),
    [origin, active],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Embeds
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Put any of it on your own site</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            Every tool, visualizer, flowchart and circuit here is an embed. You paste one iframe, and your readers can
            drive it the same way you can, without loading a script or making an account. It is meant for teachers,
            course notes, and anyone explaining this stuff to somebody else.
          </p>
        </div>
        <Link
          href="/embeds"
          className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97]"
        >
          Browse embeddables &rarr;
        </Link>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="flex flex-wrap gap-1.5">
          {DEMOS.map((demo) => (
            <button
              key={demo.id}
              type="button"
              onClick={() => setActive(demo)}
              aria-pressed={demo.id === active.id}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                demo.id === active.id
                  ? "border-copper bg-copper text-white"
                  : "border-border bg-surface-card text-ink-soft hover:border-ink-soft hover:text-ink",
              )}
            >
              {demo.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* The line you paste. */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-card">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
              <span className="text-[11px] font-semibold text-ink">Paste this</span>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-md border border-border-strong px-2 py-1 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface-card hover:text-ink"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex-1 p-4">
              <code className="block whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-ink-soft">
                {snippet}
              </code>
            </div>
            <dl className="grid grid-cols-3 gap-px border-t border-border bg-border text-center">
              {[
                ["Just an iframe", "nothing to install"],
                ["Free", "and no account"],
                ["Themeable", "light, dark or auto"],
              ].map(([term, detail]) => (
                <div key={term} className="bg-surface-card px-2 py-2.5">
                  <dt className="text-[11px] font-semibold text-ink">{term}</dt>
                  <dd className="text-[10px] text-slate">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The same thing, running. A real iframe against the real route, so
              a broken embed shows up here before anyone reports it. No title
              bar: the panel opposite already says what this is, and the height
              it saves goes to the tool instead. */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
            <iframe
              key={active.id}
              src={embedPath(active.target)}
              title={`${active.title} embed preview`}
              loading="lazy"
              style={{ height: PREVIEW_HEIGHT, border: 0 }}
              className="w-full bg-surface"
            />
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeader } from "./section-header";
import { buildEmbedSnippet, embedSrc, type EmbedTarget } from "@/lib/embeds/embeddable";
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
  /** Inline config for a `widget` target - see lib/embeds/embeddable.ts. */
  data?: Record<string, unknown>;
}

const DEMOS: Demo[] = [
  {
    id: "sorting",
    label: "Quick sort visualizer",
    // The `widget` kind rather than the `tool` one: the tool page is the
    // "master" visualizer - all seven algorithms, a compare table, an FAQ -
    // and that is the wrong first impression for a paste-one-line pitch. This
    // is the same small, single-algorithm view the quick sort tutorial embeds
    // inline, with the picker locked to the one algorithm the label promises.
    target: { kind: "widget", id: "sorting-visualizer" },
    data: { layout: "compact", algorithms: ["quick"], preset: "random", size: 12 },
    title: "Quick sort visualizer",
    height: 400,
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
    height: 690,
  },
  {
    id: "graph",
    label: "Graph traversal",
    target: { kind: "tool", id: "graph-algorithm-visualizer" },
    title: "Graph Algorithm Visualizer",
    height: 520,
  },
];

/** The demo gets its own full-width row now, so it can afford a bit more
 *  height without letting the section take over the page. Real embeds use
 *  whatever height the host asks for. 20% taller than the original 460 -
 *  the K-map and graph demos were the tightest fit at that size. */
const PREVIEW_HEIGHT = 552;

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
        data: active.data,
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
      <ScrollReveal className="mb-10">
        <SectionHeader
          eyebrow="Embeds"
          title="Put any of it on your own site"
          blurb="Every tool, visualizer, flowchart and circuit here is an embed. You paste one iframe, and your readers can drive it the same way you can, without loading a script or making an account. It is meant for teachers, course notes, and anyone explaining this stuff to somebody else."
          action={{ href: "/embeds", label: "Browse embeddables" }}
        />
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
                  ? "border-copper bg-copper text-copper-ink"
                  : "border-border bg-surface-card text-ink-soft hover:border-ink-soft hover:text-ink",
              )}
            >
              {demo.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {/* The demo, running, on its own full-width row so it has room to
              breathe. A real iframe against the real route, so a broken embed
              shows up here before anyone reports it. No title bar: the code
              panel below already says what this is. */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
            <iframe
              key={active.id}
              src={embedSrc({ target: active.target, data: active.data })}
              title={`${active.title} embed preview`}
              loading="lazy"
              style={{ height: PREVIEW_HEIGHT, border: 0 }}
              className="w-full bg-surface"
            />
          </div>

          {/* The line you paste, sitting under the thing it produces. */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-card">
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
        </div>
      </ScrollReveal>
    </section>
  );
}

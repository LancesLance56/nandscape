"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmbedCopy } from "@/components/marketing/embed-copy";
import {
  BfsArt,
  BitsArt,
  FlowArt,
  KmapArt,
  KmapPracticeArt,
  SortArt,
  TopoArt,
  TruthArt,
  TwosArt,
} from "@/components/marketing/tool-art";
import { TOOL_GROUPS, type ToolGroup } from "@/lib/tools/tool-groups";
import { cn } from "@/lib/cn";

/**
 * The list of tools on /tools: a row of subject filters over a grid of cards.
 *
 * Each card leads with a picture of what the tool works on, tinted with its
 * subject's colour, so the page reads as a shelf of things rather than a
 * table of contents. The subject filter is the only control; with nine tools
 * a search box would be furniture.
 *
 * A phone gets a different shape rather than the same cards in one column,
 * which would be nine screens of pictures. The two tools worth seeing move
 * keep their cards, and the rest become a compact list, each with a monogram
 * in its subject's colour.
 */

export interface CatalogTool {
  slug: string;
  title: string;
  intro: string;
  group: ToolGroup;
  href: string;
  embedHeight: number;
}

/** Per-tool presentation: the card's picture, and the phone list's monogram and one-liner. */
const SHELF: Record<string, { art: ReactNode; mono: string; line: string }> = {
  "sorting-algorithm-visualizer": {
    art: <SortArt className="flex h-full w-full items-end gap-1 px-[22px] pt-[22px]" />,
    mono: "So",
    line: "Seven algorithms, one frame at a time.",
  },
  "graph-algorithm-visualizer": {
    art: <BfsArt r={22} labels={false} edge={2} className="w-[88%]" />,
    mono: "Gr",
    line: "Play and scrub a traversal.",
  },
  "karnaugh-map-solver": {
    art: <KmapArt className="w-[44%]" />,
    mono: "Km",
    line: "Set cells; the minimal expression is solved as you go.",
  },
  "number-base-converter": { art: <BitsArt />, mono: "Nb", line: "Flip a bit and watch all three move together." },
  "topological-sort-visualizer": {
    art: <TopoArt className="w-[44%]" />,
    mono: "Ts",
    line: "Kahn's algorithm or DFS, one node at a time.",
  },
  "karnaugh-map-practice": {
    art: <KmapPracticeArt className="w-[44%]" />,
    mono: "Kp",
    line: "A fresh map every time, marked as you go.",
  },
  "twos-complement-calculator": { art: <TwosArt />, mono: "2c", line: "The same bits, read signed and unsigned." },
  "truth-table-generator": { art: <TruthArt className="w-[40%]" />, mono: "Tt", line: "Step through every input combination." },
  "flowchart-maker": { art: <FlowArt className="w-[40%]" />, mono: "Fc", line: "Draw boxes and route every line yourself." },
};

/** Shelf order: the two most fun to watch first, then alternating subjects
 *  so no colour bunches up. A tool missing from this list goes last. */
const ORDER = [
  "sorting-algorithm-visualizer",
  "graph-algorithm-visualizer",
  "karnaugh-map-solver",
  "number-base-converter",
  "topological-sort-visualizer",
  "karnaugh-map-practice",
  "twos-complement-calculator",
  "truth-table-generator",
  "flowchart-maker",
];
const rank = (slug: string) => {
  const i = ORDER.indexOf(slug);
  return i < 0 ? ORDER.length : i;
};

/** The two that keep a full card on a phone. */
const FEATURED = new Set(["sorting-algorithm-visualizer", "graph-algorithm-visualizer"]);

const GROUP_ORDER = Object.keys(TOOL_GROUPS) as ToolGroup[];

function ToolCard({ tool, compact = false }: { tool: CatalogTool; compact?: boolean }) {
  const { color } = TOOL_GROUPS[tool.group];
  return (
    <article
      className="group/card relative flex flex-col overflow-hidden rounded-[20px] border border-border bg-surface-card shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--card-accent)_45%,transparent)] hover:shadow-[var(--shadow-lift)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:rounded-[22px]"
      style={{ "--card-accent": color } as CSSProperties}
    >
      <div
        className={cn("grid place-items-center overflow-hidden", compact ? "h-[170px]" : "h-[200px]")}
        style={{ background: `color-mix(in srgb, ${color} 12%, var(--surface))` }}
      >
        {SHELF[tool.slug]?.art}
      </div>

      <div className={cn("flex flex-1 flex-col gap-2", compact ? "px-4 pb-4 pt-3.5" : "px-5 pb-5 pt-[18px]")}>
        <span
          className="self-start rounded-full px-[9px] py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-ink"
          style={{ background: `color-mix(in srgb, ${color} 22%, var(--surface-card))` }}
        >
          {TOOL_GROUPS[tool.group].label}
        </span>
        <h2 className={cn("font-bold tracking-[-0.01em] text-ink", compact ? "text-[17px]" : "text-[19px]")}>
          {/* Stretched over the whole card, so the picture is a link too. */}
          <Link
            href={tool.href}
            className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-copper"
          >
            {tool.title}
          </Link>
        </h2>
        <p className="line-clamp-3 text-sm leading-[1.55] text-ink-soft">{tool.intro}</p>
        {!compact && (
          <div className="mt-auto flex items-center justify-between pt-3">
            <span className="text-sm font-bold text-copper-dark transition-colors group-hover/card:text-copper">
              Open tool →
            </span>
            <EmbedCopy
              slug={tool.slug}
              title={tool.title}
              height={tool.embedHeight}
              className="relative z-10 text-[13px]"
            />
          </div>
        )}
      </div>
    </article>
  );
}

function ToolRow({ tool }: { tool: CatalogTool }) {
  const { color, ink } = TOOL_GROUPS[tool.group];
  const shelf = SHELF[tool.slug];
  return (
    <Link
      href={tool.href}
      className="flex min-h-[76px] items-center gap-3.5 border-b border-border px-3.5 py-2.5 text-ink last:border-b-0 hover:bg-surface-2"
    >
      <span
        aria-hidden
        className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] font-label text-[17px] font-bold"
        style={{ background: color, color: ink }}
      >
        {shelf?.mono}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[15px]">{tool.title}</b>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{shelf?.line}</span>
      </span>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate" />
    </Link>
  );
}

export function ToolsCatalog({ tools }: { tools: CatalogTool[] }) {
  const [group, setGroup] = useState<ToolGroup | null>(null);
  const shown = tools.filter((t) => !group || t.group === group).sort((a, b) => rank(a.slug) - rank(b.slug));
  const featured = shown.filter((t) => FEATURED.has(t.slug));
  const rest = shown.filter((t) => !FEATURED.has(t.slug));

  const filters: { id: ToolGroup | null; label: string; color?: string; count: number }[] = [
    { id: null, label: "All", count: tools.length },
    ...GROUP_ORDER.map((id) => ({
      id,
      label: TOOL_GROUPS[id].label,
      color: TOOL_GROUPS[id].color,
      count: tools.filter((t) => t.group === id).length,
    })).filter((f) => f.count > 0),
  ];

  return (
    <div className="flex flex-col gap-6 md:gap-10">
      <div
        role="group"
        aria-label="Filter by subject"
        className="-mx-6 flex gap-2 overflow-x-auto px-6 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {filters.map((f) => {
          const on = f.id === group;
          return (
            <button
              key={f.label}
              type="button"
              aria-pressed={on}
              onClick={() => setGroup(f.id)}
              className={cn(
                "inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors",
                on
                  ? "border-ink bg-ink text-surface-card"
                  : "border-border-strong bg-surface-card text-ink hover:border-ink-soft",
              )}
            >
              {f.color && <span aria-hidden className="h-2 w-2 rounded-[3px]" style={{ background: f.color }} />}
              {f.label}
              <span className="font-label text-xs opacity-70">{f.count}</span>
            </button>
          );
        })}
      </div>

      {/* From md up: every tool as a card. */}
      <div className="hidden grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px] md:grid">
        {shown.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>

      {/* A phone: the featured cards, then everything else as a list. */}
      <div className="flex flex-col gap-6 md:hidden">
        {featured.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} compact />
        ))}
        {rest.length > 0 && (
          <div className="overflow-hidden rounded-[20px] border border-border bg-surface-card">
            {rest.map((tool) => (
              <ToolRow key={tool.slug} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

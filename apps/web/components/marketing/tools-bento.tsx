import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeader } from "./section-header";
import { BfsArt, BitsArt, FlowArt, KmapArt, KmapPracticeArt, SortArt, TopoArt } from "./tool-art";
import { TOOL_GROUPS, TOOLS, toolHref } from "@/lib/tools/tools";
import { cn } from "@/lib/cn";

/**
 * The tools shelf: the homepage's bento of interactive tools.
 *
 * Every tile shows the thing its tool works on - bars sorting themselves, a
 * graph being explored, a byte counting up - and none of the controls. The
 * controls are what the tool page is for; at tile size they were a row of
 * buttons nobody could read, and they crowded out the picture that makes
 * someone want to click. So each tile is one big link, and the three moving
 * drawings loop on their own while they are on screen.
 *
 * Sizes are deliberately uneven: the two algorithms that are most fun to
 * watch take half the width each, the byte takes a third, and the still
 * drawings share the rest. On a phone the same order folds to two columns.
 *
 * Which tools exist, what they are called and where they live all come from
 * TOOLS, and so does each tile's colour (its subject's). Only the order, the
 * sizes, the shorthand names and the artwork are decided here.
 */

type Size = "half" | "third" | "sixth";

interface Tile {
  /** Must match a slug in TOOLS; a tile whose tool is gone is dropped. */
  slug: string;
  /** Short enough for a narrow tile. TOOLS keeps the full, searchable title. */
  name: string;
  size: Size;
  art: ReactNode;
}

/**
 * Order matters: CSS auto-placement packs this into two full rows of six
 * columns (3 + 3, then 2 + 1 + 1 + 1 + 1), and into two columns without
 * holes on a phone.
 */
const TILES: Tile[] = [
  {
    slug: "sorting-algorithm-visualizer",
    name: "Sorting Visualizer",
    size: "half",
    art: <SortArt className="flex h-full w-full items-end gap-1 px-[18px] pt-5 lg:gap-1.5 lg:px-7 lg:pt-7" />,
  },
  {
    slug: "graph-algorithm-visualizer",
    name: "Graph Traversal",
    size: "half",
    art: (
      <span className="grid h-full place-items-center px-3.5 pt-2.5 lg:px-[22px] lg:pt-[18px]">
        <BfsArt r={21} className="h-full max-h-[170px] w-full lg:max-h-[270px]" />
      </span>
    ),
  },
  {
    slug: "number-base-converter",
    name: "Number Bases",
    size: "third",
    art: (
      <span className="grid h-full place-items-center pt-3.5 lg:pt-5">
        <BitsArt />
      </span>
    ),
  },
  { slug: "karnaugh-map-solver", name: "K-map Solver", size: "sixth", art: <KmapArt className="w-full max-w-[150px]" /> },
  { slug: "flowchart-maker", name: "Flowchart Maker", size: "sixth", art: <FlowArt className="w-full max-w-[110px] lg:max-w-[150px]" /> },
  {
    slug: "topological-sort-visualizer",
    name: "Topological Sort",
    size: "sixth",
    art: <TopoArt className="w-full max-w-[120px] lg:max-w-[160px]" />,
  },
  {
    slug: "karnaugh-map-practice",
    name: "K-map Practice",
    size: "sixth",
    art: <KmapPracticeArt className="w-full max-w-[150px]" />,
  },
];

const SIZE: Record<Size, string> = {
  half: "col-span-2 h-[230px] rounded-[20px] lg:col-span-3 lg:h-auto lg:min-h-[340px] lg:rounded-[22px]",
  third: "col-span-2 h-[170px] rounded-[20px] lg:h-auto lg:min-h-[220px] lg:rounded-[22px]",
  sixth: "col-span-1 h-40 rounded-[18px] lg:h-auto lg:min-h-[220px] lg:rounded-[22px]",
};

export function ToolsBento() {
  const bySlug = new Map(TOOLS.map((tool) => [tool.slug, tool]));
  const tiles = TILES.filter((tile) => bySlug.has(tile.slug));
  if (tiles.length === 0) return null;

  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 lg:mb-10">
        <SectionHeader
          eyebrow="Try them out"
          title="Tools &amp; visualizers"
          blurb={`${TOOLS.length} interactive tools that each do one job, free in the browser, and every one of them embeddable.`}
          action={{ href: "/tools", label: "Browse all tools" }}
        />
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6 lg:gap-3.5">
          {tiles.map((tile) => {
            const tool = bySlug.get(tile.slug)!;
            const accent = TOOL_GROUPS[tool.group].color;
            const big = tile.size !== "sixth";

            return (
              <Link
                key={tile.slug}
                href={toolHref(tool)}
                title={tool.title}
                style={{ "--tile-accent": accent } as CSSProperties}
                className={cn(
                  "group/tile grid grid-rows-[minmax(0,1fr)_auto] overflow-hidden border border-border bg-surface-card text-ink",
                  "transition-[transform,border-color,box-shadow] duration-300 ease-out",
                  "hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--tile-accent)_45%,transparent)] hover:shadow-[var(--shadow-lift)]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper",
                  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  SIZE[tile.size],
                )}
              >
                <span
                  className={cn(
                    // A grid row rather than a flex child, so the drawings'
                    // percentage heights resolve against a tile that only has
                    // a min-height.
                    "min-h-0",
                    !big && "grid place-items-center px-3 pt-3.5 lg:px-4 lg:pt-[18px]",
                  )}
                >
                  {tile.art}
                </span>
                <span className={cn("flex items-center gap-2", big ? "px-4 py-3 lg:px-[22px] lg:py-4" : "px-3.5 py-3 lg:px-4 lg:py-3.5")}>
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-[3px] lg:h-[9px] lg:w-[9px]" style={{ background: accent }} />
                  <span className={cn("min-w-0 flex-1 truncate font-bold", big ? "text-[15px]" : "text-[13.5px] lg:text-sm")}>
                    {tile.name}
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-slate transition-transform duration-300 group-hover/tile:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}

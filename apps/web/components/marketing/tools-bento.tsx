import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SortingVisualizerWidget } from "@/components/content/blocks/interactive/sorting/sorting-visualizer-widget";
import { NumberBaseExplorerWidget } from "@/components/content/blocks/interactive/number-base-explorer-widget";
import { GraphTraversalWidget } from "@/components/content/blocks/interactive/graph/graph-traversal-widget";
import { TOOLS } from "@/lib/tools/tools";
import { accentsFor } from "@/lib/ui/accent-palette";
import { cn } from "@/lib/cn";

/**
 * The tools shelf: every interactive widget on the site, laid out as a bento.
 *
 * This replaced a section that embedded the sorting visualizer live. One tool
 * running on the homepage said "we have a sorting visualizer"; nine tiles say
 * "this place is full of things you can drive", which is the actual pitch. The
 * sorting visualizer keeps the biggest tile, since it is the one that used to
 * hold the section on its own.
 *
 * Three tiles run the real thing: the sorting visualizer in its compact mode,
 * the number base explorer, and a graph traversal you can play and scrub.
 * They turn the grid from a picture of a toolbox into one you can put your
 * hands in. The rest draw a cheap little SVG or block of type standing in for
 * their tool and link to it, so they cost no client JavaScript at all.
 *
 * Sizes are deliberately uneven. A tile carrying nothing but a drawing and a
 * sentence does not earn two columns, so most of them take one; width is
 * spent on the live tiles and on the two drawings that are actually wide.
 *
 * Which tools exist, what they are called and where they live all come from
 * TOOLS. Only the ordering, the tile sizes, the shorthand names (a bento tile
 * is too narrow for "Binary, Decimal and Hex Converter") and the artwork are
 * decided here.
 */

/* ---------------------------------------------------------------- artwork */

/** A 4x4 map with one group ringed. */
function KmapArt({ accent, cells, ring }: { accent: string; cells: number[]; ring?: boolean }) {
  return (
    <svg viewBox="0 0 116 84" className="h-full w-full">
      {Array.from({ length: 16 }, (_, i) => {
        const on = cells.includes(i);
        return (
          <rect
            key={i}
            x={(i % 4) * 28 + 3}
            y={Math.floor(i / 4) * 20 + 3}
            width={25}
            height={17}
            rx={3}
            fill={on ? accent : "currentColor"}
            opacity={on ? 0.8 : 0.1}
          />
        );
      })}
      {ring && (
        <rect x={30} y={0} width={57} height={63} rx={7} fill="none" stroke={accent} strokeWidth={1.6} strokeDasharray="5 4" />
      )}
    </svg>
  );
}

function PracticeArt({ accent }: { accent: string }) {
  return (
    <div className="relative h-full w-full">
      <KmapArt accent={accent} cells={[4, 5, 9]} />
      <span
        className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full font-mono text-[13px] font-semibold"
        style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)`, color: accent }}
      >
        ?
      </span>
    </div>
  );
}

/** A DAG resolving left to right, numbered in the order it comes out. */
function DagArt({ accent }: { accent: string }) {
  const nodes = [
    [16, 44],
    [54, 20],
    [54, 68],
    [92, 44],
  ];

  return (
    <svg viewBox="0 0 116 88" className="h-full w-full">
      {[
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
      ].map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0] + 9}
          y1={nodes[a][1]}
          x2={nodes[b][0] - 9}
          y2={nodes[b][1]}
          stroke="currentColor"
          strokeWidth={1.4}
          opacity={0.28}
        />
      ))}
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={11} fill={accent} opacity={0.9 - i * 0.18} />
          <text x={x} y={y + 4} textAnchor="middle" className="font-mono text-[11px]" fill="var(--paper)">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Box, decision, two branches. */
function FlowArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 116 88" className="h-full w-full">
      <path d="M58 20 L58 34 M58 54 L58 66 M40 66 L76 66" stroke="currentColor" strokeWidth={1.4} opacity={0.3} fill="none" />
      <rect x={38} y={4} width={40} height={16} rx={8} fill="currentColor" opacity={0.18} />
      <path d="M58 34 L74 44 L58 54 L42 44 Z" fill={accent} opacity={0.85} />
      <rect x={22} y={66} width={36} height={16} rx={3} fill="currentColor" opacity={0.18} />
      <rect x={62} y={66} width={36} height={16} rx={3} fill="currentColor" opacity={0.18} />
    </svg>
  );
}

/* ------------------------------------------------------------------ tiles */

interface Tile {
  /** Must match a slug in TOOLS; a tile whose tool is gone is dropped. */
  slug: string;
  /** Short enough for a narrow tile. TOOLS keeps the full, searchable title. */
  name: string;
  blurb: string;
  /** Grid footprint. Two columns is a privilege, not the default. */
  span: string;
  /** The real widget, running in the tile. Beats any drawing, costs client JS. */
  widget?: ReactNode;
  /** Otherwise: a drawing standing in for the tool, and the tile is a link. */
  art?: (accent: string) => ReactNode;
}

/**
 * Order matters: the grid is packed by CSS auto-placement, and this sequence
 * fills a four-column layout exactly - three rows, no holes - and folds down
 * to two columns without leaving any either. Reordering or resizing a tile
 * means re-checking that, because auto-placement never backfills a gap.
 */
const TILES: Tile[] = [
  {
    slug: "sorting-algorithm-visualizer",
    name: "Sorting Visualizer",
    blurb: "Seven algorithms, one frame at a time, with the comparisons and writes counted underneath.",
    span: "col-span-2 row-span-2",
    widget: (
      <SortingVisualizerWidget
        data={{ compact: true, algorithm: "quick", preset: "random", size: 18, seed: 20260816 }}
        frame={false}
      />
    ),
  },
  {
    slug: "karnaugh-map-solver",
    name: "K-map Solver",
    blurb: "Cells to 1 or don't-care; the minimal sum-of-products falls out.",
    span: "col-span-1",
    art: (a) => <KmapArt accent={a} cells={[1, 2, 5, 6, 9, 10]} ring />,
  },
  {
    slug: "flowchart-maker",
    name: "Flowchart Maker",
    blurb: "Add boxes, connect them, layout is automatic.",
    span: "col-span-1",
    art: (a) => <FlowArt accent={a} />,
  },
  {
    slug: "number-base-converter",
    name: "Number Bases",
    blurb: "Flip a bit and watch binary, decimal and hex move together.",
    span: "col-span-2",
    widget: <NumberBaseExplorerWidget data={{ bits: 8, initial: 182, title: "One byte" }} frame={false} />,
  },
  {
    slug: "topological-sort-visualizer",
    name: "Topological Sort",
    blurb: "Kahn's algorithm a node at a time, in-degrees falling as it goes.",
    span: "col-span-1",
    art: (a) => <DagArt accent={a} />,
  },
  {
    slug: "karnaugh-map-practice",
    name: "K-map Practice",
    blurb: "A fresh random map every time. Group it yourself and find out if it is minimal.",
    span: "col-span-1",
    art: (a) => <PracticeArt accent={a} />,
  },
  {
    slug: "graph-algorithm-visualizer",
    name: "Graph Traversal",
    blurb: "Play or scrub a BFS or DFS; the queue and the visited order keep up.",
    span: "col-span-2",
    widget: <GraphTraversalWidget data={{ mode: "bfs" }} frame={false} />,
  },
];

export function ToolsBento() {
  const bySlug = new Map(TOOLS.map((tool) => [tool.slug, tool]));
  const tiles = TILES.filter((tile) => bySlug.has(tile.slug));
  if (tiles.length === 0) return null;

  // Same helper the /tools index uses, so a tool keeps its colour between the
  // two pages instead of being copper here and olive there.
  const accents = accentsFor(tiles.map((tile) => tile.slug));

  return (
    <section className="py-20">
      <ScrollReveal className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Try them out
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Tools &amp; Visualizers</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            {TOOLS.length} interactive tools that each do one job, from a K-map solver to a graph traversal you can
            scrub frame by frame. All free, all in the browser.
          </p>
        </div>
        <Link
          href="/tools"
          className="rounded-xl border border-border-strong/70 bg-surface-card/80 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition-all hover:border-ink-soft hover:shadow-md active:scale-[0.97]"
        >
          Browse all tools &rarr;
        </Link>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        {/* Rows have a floor, not a fixed height: the tiles running a real
            widget need whatever they need, and letting their band grow keeps
            every other tile in the row aligned with them. */}
        <div className="grid auto-rows-[minmax(8.5rem,auto)] grid-cols-2 gap-3 lg:auto-rows-[minmax(9.5rem,auto)] lg:grid-cols-4">
          {tiles.map((tile, i) => {
            const tool = bySlug.get(tile.slug)!;
            const accent = accents[i];
            const href = `/tools/${tool.slug}`;
            const chrome = "relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-card p-4";

            // A tile running a widget cannot be a link - every click inside it
            // belongs to the widget - so it carries the link in its corner and
            // sits still instead of lifting under the cursor.
            if (tile.widget) {
              return (
                <div
                  key={tile.slug}
                  style={{ "--tile-accent": accent } as CSSProperties}
                  className={cn(chrome, tile.span)}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                        <h3 className="truncate text-[13px] font-semibold text-ink">{tile.name}</h3>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-soft">{tile.blurb}</p>
                    </div>
                    <Link
                      href={href}
                      title={tool.title}
                      className="group/open flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-copper-dark"
                    >
                      Open
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/open:translate-x-0.5 motion-reduce:transition-none" />
                    </Link>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col justify-center">{tile.widget}</div>
                </div>
              );
            }

            return (
              <Link
                key={tile.slug}
                href={href}
                title={tool.title}
                style={{ "--tile-accent": accent } as CSSProperties}
                className={cn(
                  chrome,
                  "group/tile transition-[transform,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none",
                  "hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--tile-accent)_45%,transparent)]",
                  "hover:shadow-[0_18px_36px_-24px_rgba(20,27,20,0.5)]",
                  tile.span,
                )}
              >
                {/* A wash of the tile's own colour, only while hovered. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100 motion-reduce:transition-none"
                  style={{
                    background: `radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, ${accent} 12%, transparent), transparent 70%)`,
                  }}
                />

                <div
                  className={cn(
                    "relative flex min-h-0 flex-1 items-center justify-center text-ink opacity-80",
                    "transition-opacity duration-300 group-hover/tile:opacity-100 motion-reduce:transition-none",
                  )}
                >
                  {/* Capped, so a tile stretched by a tall neighbour shows a
                      normally sized drawing rather than a billboard. */}
                  <div className="h-full max-h-24 w-full">{tile.art?.(accent)}</div>
                </div>

                <div className="relative mt-3 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                    <h3 className="truncate text-[13px] font-semibold text-ink">{tile.name}</h3>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate transition-transform duration-300 group-hover/tile:translate-x-0.5 motion-reduce:transition-none" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">{tile.blurb}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}

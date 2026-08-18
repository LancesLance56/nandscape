import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The rail: a copper spine with nodes hanging off it.
 *
 * This replaces the bordered card for listing content that is ordered or
 * nested. A track holds sections, a section holds lessons, and a stack of
 * identical rounded boxes said none of that. It also happens to be the
 * shape the rest of the site already speaks in, since every widget on here
 * draws nodes joined by wires.
 *
 * `NodeGrid` below is the same language for content that is genuinely flat:
 * the marker and the hairline stay, the connecting wire does not.
 */

export function Rail({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

/*
 * A node centre sits 1.25rem below the top of its row: the row's `py-2` (8px),
 * the node's own offset (7px), and half the node (5px).
 *
 * Each row draws its own piece of wire rather than the Rail drawing one line
 * behind all of them. A single line has to guess where the first and last
 * nodes sit, and that guess is wrong the moment a row grows a second line of
 * text, which is exactly what happened: the wire ran 46px past the last node.
 */

export function RailItem({
  href,
  title,
  meta,
  detail,
  filled = false,
  className,
}: {
  href: string;
  title: string;
  /** Right-aligned count or label. */
  meta?: ReactNode;
  /** Optional second line under the title. */
  detail?: ReactNode;
  /**
   * Draws a solid node instead of a hollow one. Used for the entry point of a
   * track, so the eye lands on where to start rather than on the first row by
   * accident of position.
   */
  filled?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-start gap-3 rounded-lg py-2 pr-2 transition-colors hover:bg-copper-bg/40",
        // The wire. Full height of the row, then trimmed back to the node
        // centre on the first and last rows so it starts and stops on a node.
        "before:absolute before:left-1 before:top-0 before:bottom-0 before:w-0.5 before:bg-copper/30 before:content-['']",
        // Written out rather than interpolated: Tailwind generates utilities by
        // scanning source text, so a class assembled from a variable is never
        // emitted. Both values are that 1.25rem node centre.
        "first:before:top-5 last:before:bottom-[calc(100%-1.25rem)]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative z-1 mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full border-2 border-copper transition-transform group-hover:scale-125",
          filled ? "bg-copper" : "bg-surface-card",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink transition-colors group-hover:text-copper-dark">{title}</span>
        {detail && <span className="mt-0.5 block truncate text-xs text-slate">{detail}</span>}
      </span>
      {meta && <span className="mt-px shrink-0 text-xs tabular-nums text-slate">{meta}</span>}
    </Link>
  );
}

/**
 * A grid of entries marked in the rail's language but with no wire joining
 * them, for lists whose items have no order: tools, puzzles, articles.
 *
 * The node sits on the hairline rather than beside it, so a row of these reads
 * as taps off a horizontal wire.
 */
export function NodeGrid({
  children,
  columns = 3,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function NodeTile({
  href,
  children,
  accent,
  className,
}: {
  href: string;
  children: ReactNode;
  /** Overrides the copper node, for entries that already carry a tag colour. */
  accent?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col gap-2 border-t border-border py-5 transition-colors hover:border-copper",
        className,
      )}
    >
      <span
        aria-hidden
        style={accent ? { backgroundColor: accent } : undefined}
        className={cn(
          "absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-150",
          !accent && "bg-copper",
        )}
      />
      {children}
    </Link>
  );
}

/** The heading inside a NodeTile, so every list titles itself the same way. */
export function NodeTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display text-base font-bold leading-snug text-ink transition-colors group-hover:text-copper-dark">
      {children}
    </h3>
  );
}

/* -------------------------------------------------------------------------- */
/* Split index                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Identity on the left, a grid of colour-filled tiles on the right.
 *
 * The tiles carry the structure through colour rather than through rules, so
 * there are no dividers here at all. An earlier version drew hairline seams
 * between tiles, which was tidy and completely inert, the wrong note for the
 * first thing on the homepage.
 */
export function SplitIndex({
  title,
  intro,
  aside,
  children,
  className,
}: {
  title: ReactNode;
  intro?: ReactNode;
  /** Anything under the intro: a count, a link away, a note. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12",
        className,
      )}
    >
      <div className="lg:sticky lg:top-28 lg:self-start">
        {title}
        {intro}
        {aside}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

/**
 * A filled tile: big numeral, label, and a wash of its own accent colour.
 *
 * The accent arrives as a CSS variable rather than as a set of inline colours,
 * because inline styles cannot carry a dark-mode variant. With `--tile` set on
 * the element, the classes below can mix their own tints per theme, keeping the
 * fill readable on both a near-white and a near-black page.
 */
export function AccentTile({
  href,
  index,
  title,
  accent,
  children,
}: {
  href: string;
  /** Shown as the tile's numeral. Zero-padded by the caller if wanted. */
  index: ReactNode;
  title: string;
  /** Hex from the accent palette. Falls back to copper. */
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{ "--tile": accent ?? "#c15a2a" } as CSSProperties}
      className={cn(
        "group relative flex flex-col gap-1.5 overflow-hidden rounded-xl p-5 transition-all duration-200",
        "bg-[color-mix(in_oklab,var(--tile)_14%,transparent)]",
        "dark:bg-[color-mix(in_oklab,var(--tile)_22%,transparent)]",
        "hover:-translate-y-0.5 hover:bg-[color-mix(in_oklab,var(--tile)_26%,transparent)]",
        "dark:hover:bg-[color-mix(in_oklab,var(--tile)_34%,transparent)]",
      )}
    >
      {/* A soft bloom in the corner so a flat tint gains a little depth
          without reaching for a gradient across the whole tile. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[color-mix(in_oklab,var(--tile)_30%,transparent)] opacity-60 transition-transform duration-300 group-hover:scale-125"
      />
      <span className="relative font-display text-2xl font-bold leading-none tabular-nums text-[color-mix(in_oklab,var(--tile)_75%,black)] dark:text-[color-mix(in_oklab,var(--tile)_45%,white)]">
        {index}
      </span>
      <span className="relative font-display text-sm font-bold leading-snug text-ink">{title}</span>
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Numbered rows                                                              */
/* -------------------------------------------------------------------------- */

/** A hairline-ruled list. Denser than the grid, and it scales past a screenful. */
export function RowList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-t border-border", className)}>{children}</div>;
}

export function RowItem({
  href,
  index,
  title,
  description,
  badges,
  meta,
}: {
  href: string;
  index: ReactNode;
  title: string;
  description?: ReactNode;
  /** Pills under the description: difficulty, tags, constraints. */
  badges?: ReactNode;
  /** Right-aligned, held at the top of the row. */
  meta?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-5 border-b border-border py-4 transition-colors hover:bg-surface-2/50"
    >
      <span className="w-6 shrink-0 pt-1 text-xs tabular-nums text-slate">{index}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-bold text-ink transition-colors group-hover:text-copper-dark">
          {title}
        </span>
        {description && (
          <span className="mt-1 block line-clamp-1 text-xs leading-relaxed text-ink-soft">{description}</span>
        )}
        {badges && <span className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</span>}
      </span>
      {meta && <span className="shrink-0 pt-1 text-[11px] text-slate">{meta}</span>}
    </Link>
  );
}

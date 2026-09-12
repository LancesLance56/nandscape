import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The chrome the homepage sections share: the heading, the outbound link, and
 * the card tile.
 *
 * ---
 *
 * The heading every homepage section wears.
 *
 * There used to be one of these written out per section, and they had drifted:
 * five different eyebrow treatments, two heading scales, one section centred
 * while the rest were left-aligned, and the same forty-character "browse all"
 * className copied five times. A reader does not notice any one of those, but
 * they add up to a page that looks assembled rather than designed.
 *
 * The shape is fixed here instead: label, heading, optional sentence, optional
 * link parked at the right on the heading's baseline. A section supplies the
 * words and nothing else.
 */
export function SectionHeader({
  eyebrow,
  title,
  blurb,
  action,
  className,
}: {
  /** The small label above the heading. Set in caps by this component. */
  eyebrow: ReactNode;
  title: ReactNode;
  blurb?: ReactNode;
  /** The "browse all" link. Omit it and the heading simply runs full width. */
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-5", className)}>
      <div className="max-w-2xl">
        {/* Mono caps, which is the label idiom the rest of the site already
            uses - the footer column heads, the panel captions in the worked
            example - rather than a sixth invention. */}
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-copper-dark">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-copper" />
          {eyebrow}
        </p>

        <h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h2>

        {blurb && <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">{blurb}</p>}
      </div>

      {action && <SectionLink {...action} />}
    </div>
  );
}

/**
 * The section's outbound link.
 *
 * The arrow is a separate element rather than a character in the label, so it
 * can lean into the hover the way the arrows inside the cards below it do, and
 * so a label never has to carry punctuation.
 */
export function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border-strong/70 bg-surface-card/80",
        "px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm",
        // Named properties rather than `transition-all`, which was also
        // animating the backdrop filter on every one of these.
        "transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out",
        "hover:border-ink-soft hover:bg-surface-card hover:shadow-sm active:scale-[0.97]",
        "motion-reduce:transition-none",
      )}
    >
      {label}
      <span
        aria-hidden
        className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
      >
        &rarr;
      </span>
    </Link>
  );
}

/**
 * A card in one of the homepage grids.
 *
 * The lift is the same everywhere it appears, and the shadow is a token rather
 * than a literal so it survives the dark theme - the two grids used to carry
 * the same hard-coded ink wash, which on a dark ground was no shadow at all.
 * Reduced motion keeps the border and drops the travel.
 */
export const TILE_CLASS = cn(
  "group flex h-full flex-col rounded-xl border border-border bg-surface-card p-4",
  "transition-[transform,border-color,box-shadow] duration-300 ease-out",
  "hover:-translate-y-1 hover:border-copper/40 hover:shadow-[var(--shadow-lift)]",
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
);

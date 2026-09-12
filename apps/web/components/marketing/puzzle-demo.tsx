"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import type { PuzzleDifficulty } from "@/types/puzzle";

/**
 * A real logic problem, open on the homepage.
 *
 * The sibling of PracticeDemo above it, and built to the same argument: a tile
 * describes an editor, this contains one. The right-hand pane is the actual
 * /puzzles/[slug] page - the same canvas, the same gate palette, the same Run
 * tests button grading against the same truth table.
 *
 * It is an iframe rather than a mounted <CircuitEditor />, and that is not
 * laziness. The editor is a whole application: it registers global keyboard
 * shortcuts, drives a dozen shared zustand stores and autosaves puzzle
 * progress. Mounting it inside a marketing page would put every editor
 * shortcut on the homepage's keyboard and let its stores outlive the section.
 * A same-origin frame gives the real thing with none of that reaching out -
 * and because it is same-origin it reads the same stored theme, so the frame
 * follows the site's light/dark toggle.
 *
 * Left of it is the chip, which is this section's own artwork and the thing
 * that stops it reading as the coding section printed twice. The statement
 * itself is deliberately *not* repeated there: the editor carries its own
 * problem panel, and two copies of one specification in one card is worse
 * than none.
 */

/**
 * The layout splits at `xl`, not at `lg`, and the reason is the frame's width.
 *
 * The editor hides its sidebar - which is where the problem panel and the Run
 * tests button live - below 768px of *its own* viewport. A two-column split at
 * `lg` leaves the frame around 600px on a 1024px screen, which would quietly
 * take the Run button away. Stacked below `xl`, the frame gets the full card
 * and stays over the threshold.
 */
export interface DemoPuzzle {
  slug: string;
  title: string;
  difficulty: PuzzleDifficulty;
  description: string;
  /** Gate budget and any gate restriction, already worded. */
  constraints: string[];
  /** The chip drawing, rendered upstream. */
  chip: ReactNode;
}

export function PuzzleDemo({ puzzles }: { puzzles: DemoPuzzle[] }) {
  const [activeSlug, setActiveSlug] = useState(puzzles[0]?.slug);

  const active = puzzles.find((puzzle) => puzzle.slug === activeSlug) ?? puzzles[0];
  if (!active) return null;

  return (
    <div>
      {puzzles.length > 1 && (
        <div
          role="tablist"
          aria-label="Example logic problems"
          className="mb-4 inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-surface-card p-1"
        >
          {puzzles.map((puzzle) => {
            const selected = puzzle.slug === active.slug;
            return (
              <button
                key={puzzle.slug}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveSlug(puzzle.slug)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  selected ? "bg-surface-3 font-semibold text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {puzzle.title}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface-2/50 p-2 shadow-[var(--shadow-lift)]">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <article className="flex flex-col rounded-xl border border-border bg-surface-card px-5 py-5">
            <h3 className="font-display text-xl font-semibold leading-tight text-ink">
              {active.title}
            </h3>
            <div className="mt-2.5">
              <DifficultyTag difficulty={active.difficulty} />
            </div>

            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{active.description}</p>

            {/* The package you are being asked to fill in, drawn with its pins
                named. Hidden below `xl`, where the card is one column and the
                chip would simply push the editor off the screen. */}
            <div className="mt-5 hidden xl:block">{active.chip}</div>

            {active.constraints.length > 0 && (
              <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-xs text-ink-soft">
                {active.constraints.map((constraint) => (
                  <dd key={constraint} className="font-mono">
                    {constraint}
                  </dd>
                ))}
              </dl>
            )}

            <Link
              href={`/puzzles/${active.slug}`}
              className="group mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-copper-dark transition-colors hover:text-copper"
            >
              Open it full screen
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </article>

          <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate">
                The editor
              </span>
              <span className="font-mono text-[10px] text-slate">
                wire it up, then run the tests
              </span>
            </div>

            {/* Keyed by slug so switching the picker reloads the frame rather
                than leaving the previous puzzle's canvas in place. Lazy, so a
                reader who never scrolls this far never pays for React Flow and
                the simulation engine. */}
            <iframe
              key={active.slug}
              src={`/puzzles/${active.slug}`}
              title={`${active.title} - build it in the Nandscape editor`}
              loading="lazy"
              className="h-[32rem] w-full border-0 xl:h-[40rem]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

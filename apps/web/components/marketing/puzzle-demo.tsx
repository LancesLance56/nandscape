"use client";

import { useState } from "react";

/**
 * A real logic problem, open on the homepage.
 *
 * The sibling of PracticeDemo above it, and built to the same argument: a tile
 * describes an editor, this contains one. The frame is the actual
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
 * There is no statement column beside it, and that absence is the design. The
 * editor's own problem panel already gives the title, the difficulty, the
 * pins, the gate budget and the gate restriction, a few centimetres to the
 * right of where a second copy of all of it used to sit. Printing one
 * specification twice in one section helped nobody read it and cost the editor
 * half the width.
 *
 * Losing the column also settles what had been a breakpoint problem. The
 * editor hides its sidebar - the problem panel and the Run tests button -
 * below 768px of its own viewport, and a two-column split pushed the frame
 * under that on a 1024px screen. Taking the whole section, there is no width
 * left to lose.
 */
export interface DemoPuzzle {
  slug: string;
  title: string;
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

      {/* Keyed by slug so switching the picker reloads the frame rather than
          leaving the previous puzzle's canvas in place. Lazy, so a reader who
          never scrolls this far never pays for React Flow and the simulation
          engine. */}
      <iframe
        key={active.slug}
        src={`/puzzles/${active.slug}`}
        title={`${active.title} - build it in the Nandscape editor`}
        loading="lazy"
        className="h-[32rem] w-full rounded-xl border-0 xl:h-[40rem]"
      />
    </div>
  );
}

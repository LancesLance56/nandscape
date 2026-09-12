"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import type { PracticeDifficulty, PracticeLanguage } from "@/types/practice";

/**
 * A real coding problem, open on the homepage.
 *
 * The section used to be six tiles linking away. Tiles describe the thing; this
 * *is* the thing - the same workspace /practices/[slug] runs, loaded with a
 * seeded problem, with Run wired to the same judge. Someone can type an answer
 * and see it graded without an account and without leaving the page, which is
 * the only honest way to advertise an editor.
 *
 * The editor is deliberately not reimplemented here. It is the same
 * PracticeWorkspace, unmodified, dropped into a frame - so the demo cannot
 * drift from the product, and a change to the workspace shows up here for free.
 *
 * Statements are rendered upstream and handed down as slots, because the
 * Markdown renderer is a Server Component (it highlights fenced code with the
 * Shiki singleton while the tree renders) and this has to be a client component
 * to hold the picker.
 */

/**
 * Loaded after hydration rather than bundled into the landing page.
 *
 * CodeMirror plus three language modes is the single largest dependency on the
 * site, and the homepage is the one page that has to be fast for people who
 * will never scroll this far. Splitting it here costs a skeleton and saves
 * every one of them the download.
 */
function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-soft">
      <span className="h-2 w-2 animate-pulse rounded-full bg-copper" />
      Loading the editor
    </div>
  );
}

const PracticeWorkspace = dynamic(
  () => import("@/components/practices/practice-workspace").then((m) => m.PracticeWorkspace),
  { ssr: false, loading: EditorSkeleton },
);

export interface DemoProblem {
  slug: string;
  title: string;
  difficulty: PracticeDifficulty;
  tags: string[];
  summary: string;
  languages: PracticeLanguage[];
  starterCode: Partial<Record<PracticeLanguage, string>>;
  /** The statement, already rendered by the server component upstream. */
  statement: ReactNode;
  /** The worked examples, likewise. */
  examples: ReactNode;
}

export function PracticeDemo({ problems }: { problems: DemoProblem[] }) {
  const [activeSlug, setActiveSlug] = useState(problems[0]?.slug);
  // Undefined until the check comes back, so the workspace is not told "signed
  // out" and then corrected - that flip would discard a signed-in reader's
  // saved draft fetch and flash the sign-in notice at them.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled) setSignedIn(Boolean(body.user));
      })
      .catch(() => {
        // Treated as signed out: Run still works, which is the part of the
        // demo that matters.
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = problems.find((problem) => problem.slug === activeSlug) ?? problems[0];
  if (!active) return null;

  return (
    <div>
      {problems.length > 1 && (
        <div
          role="tablist"
          aria-label="Example problems"
          className="mb-4 inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-surface-card p-1"
        >
          {problems.map((problem) => {
            const selected = problem.slug === active.slug;
            return (
              <button
                key={problem.slug}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveSlug(problem.slug)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  selected
                    ? "bg-surface-3 font-semibold text-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {problem.title}
              </button>
            );
          })}
        </div>
      )}

      {/*
        One frame around both panes, with a thin margin of ground between them:
        the statement and the editor read as two halves of one instrument
        rather than as two cards that happen to be adjacent.

        The height is fixed from `lg` up so the editor is a workspace rather
        than a strip, and each pane scrolls inside it - a statement that pushed
        the page taller would bury every section below this one. Stacked on a
        phone, where two half-width columns would leave neither readable.
      */}
      <div className="rounded-2xl border border-border bg-surface-2/50 p-2 shadow-[var(--shadow-lift)]">
        <div className="grid gap-2 lg:h-[36rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <article className="max-h-[28rem] overflow-y-auto rounded-xl border border-border bg-surface-card px-5 py-5 lg:max-h-none">
            <header className="border-b border-border pb-4">
              <h3 className="font-display text-xl font-semibold leading-tight text-ink">
                {active.title}
              </h3>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <DifficultyTag difficulty={active.difficulty} />
                {active.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.65rem] text-ink-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </header>

            {active.summary && (
              <p className="mt-4 rounded-lg bg-surface-2/70 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                {active.summary}
              </p>
            )}

            <div className="mt-4">{active.statement}</div>

            <div className="mt-6">{active.examples}</div>

            <Link
              href={`/practices/${active.slug}`}
              className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-copper-dark transition-colors hover:text-copper"
            >
              Open the full problem
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </article>

          {/* The frame the workspace does not draw for itself: from `lg` up it
              is borderless, because on the problem page it *is* the right half
              of the viewport. Here it is a pane inside a card, so the border
              is this wrapper's job. */}
          <div className="h-[30rem] overflow-hidden rounded-xl border border-border bg-surface-card lg:h-full">
            {/* Held back until the session check answers. Mounting as signed
                out and correcting a moment later would flash the sign-in
                notice at someone who is already signed in, and disable Submit
                under their cursor.

                Keyed by slug: switching problems has to remount the editor
                with the new starter code, not reach in and overwrite the
                document someone may already be typing in. */}
            {signedIn === undefined ? (
              <EditorSkeleton />
            ) : (
              <PracticeWorkspace
                key={active.slug}
                practice={{
                  slug: active.slug,
                  languages: active.languages,
                  starterCode: active.starterCode,
                }}
                signedIn={signedIn}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

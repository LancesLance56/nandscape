import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { tutorialPath, type TutorialNavPage } from "@/types/tutorial";

/**
 * The "Previous / Next lesson" row at the foot of a tutorial page. Each track
 * is a single ordered sequence, so every lesson (bar the first and last) links
 * straight to its neighbours - the reader never has to go back to the track
 * index to continue.
 */
export function TutorialPager({
  prev,
  next,
}: {
  prev: TutorialNavPage | null;
  next: TutorialNavPage | null;
}) {
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Lesson navigation"
      className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={tutorialPath(prev.trackSlug, prev.slug)}
          className="group flex items-center gap-4 rounded-2xl bg-surface-card px-5 py-4 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-lift)"
        >
          <PagerArrow>
            <ArrowLeft className="h-4 w-4" />
          </PagerArrow>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate">Previous</span>
            <span className="text-sm font-semibold text-ink group-hover:text-copper">{prev.title}</span>
          </span>
        </Link>
      ) : (
        <span aria-hidden />
      )}

      {next ? (
        <Link
          href={tutorialPath(next.trackSlug, next.slug)}
          className="group flex items-center justify-end gap-4 rounded-2xl bg-surface-card px-5 py-4 text-right shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-lift) sm:col-start-2"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate">Next</span>
            <span className="text-sm font-semibold text-ink group-hover:text-copper">{next.title}</span>
          </span>
          <PagerArrow>
            <ArrowRight className="h-4 w-4" />
          </PagerArrow>
        </Link>
      ) : null}
    </nav>
  );
}

/** The round orange arrow button. */
function PagerArrow({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-copper text-copper-ink transition-transform group-hover:scale-105">
      {children}
    </span>
  );
}

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
          className="group flex flex-col gap-1 rounded-xl border border-border bg-surface-card px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate">
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </span>
          <span className="text-sm font-semibold text-ink group-hover:text-copper-dark">{prev.title}</span>
        </Link>
      ) : (
        <span aria-hidden />
      )}

      {next ? (
        <Link
          href={tutorialPath(next.trackSlug, next.slug)}
          className="group flex flex-col gap-1 rounded-xl border border-border bg-surface-card px-4 py-3 text-right transition-colors hover:border-border-strong hover:bg-surface-2 sm:col-start-2"
        >
          <span className="flex items-center justify-end gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate">
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold text-ink group-hover:text-copper-dark">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

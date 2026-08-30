import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Check, CircleDashed, Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserPreferences } from "@/lib/account/preferences";
import { listQuizHistory, listTrackOutlines, toTrackProgress } from "@/lib/account/learning";
import { listProgressForUser } from "@/lib/puzzles/puzzle-progress";
import { listPuzzleRecords } from "@/lib/puzzles/puzzle-records";
import { listTutorialProgress } from "@/lib/engagement/progress";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";
import { Meter } from "@/components/dashboard/charts/meter";
import { DataTable } from "@/components/dashboard/charts/chart-card";
import { cn } from "@/lib/cn";

/**
 * Everything the reader has finished, in one place.
 *
 * Lesson by lesson rather than a count, because the useful question on this
 * page is "what have I not done yet" and a number cannot answer it. The focus
 * track is opened by default and the rest are collapsed - `<details>` rather
 * than component state, so the whole page stays a server component and the
 * sections still work before any JavaScript arrives.
 */

export default async function AccountProgressPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [prefs, outlines, tutorials, puzzleProgress, puzzles, quizHistory] = await Promise.all([
    getUserPreferences(user.id).catch(() => null),
    listTrackOutlines().catch(() => []),
    listTutorialProgress(user.id).catch(() => []),
    listProgressForUser(user.id).catch(() => []),
    listPuzzleRecords().catch(() => []),
    listQuizHistory(user.id).catch(() => []),
  ]);

  const completedSlugs = new Set(tutorials.map((entry) => entry.pageSlug));
  const tracks = toTrackProgress(outlines, completedSlugs);
  const focusSlug = prefs?.focusTrackSlug ?? null;

  const solved = puzzleProgress.filter((entry) => entry.solved);
  const started = puzzleProgress.filter((entry) => !entry.solved);
  const titleOf = new Map(puzzles.map((puzzle) => [puzzle.slug, puzzle.title]));

  return (
    <DashboardPage
      title="Progress"
      description="Lessons marked done, puzzles solved, and every quiz you have run."
    >
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-ink">Tutorial tracks</h2>

        {tracks.length === 0 ? (
          <p className="text-xs text-slate">No tracks have been published yet.</p>
        ) : (
          tracks.map((track) => (
            <details
              key={track.slug}
              open={track.slug === focusSlug}
              className="rounded-2xl border border-border bg-surface-card p-4 md:p-5"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <BookOpen className="size-4 shrink-0 text-slate" />
                    <span className="truncate text-sm font-medium text-ink">{track.title}</span>
                    {track.slug === focusSlug && (
                      <span className="shrink-0 rounded-full bg-copper-bg px-2 py-0.5 text-xxs text-copper-dark">
                        Focus
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xxs tabular-nums text-slate">
                    {track.completed}/{track.pages.length}
                  </span>
                </div>
                <Meter
                  className="mt-3"
                  label={track.title}
                  value={track.completed}
                  total={track.pages.length}
                  caption={`${Math.round(
                    track.pages.length === 0 ? 0 : (track.completed / track.pages.length) * 100,
                  )}% complete`}
                />
              </summary>

              <ul className="mt-4 flex flex-col border-t border-border pt-3">
                {track.pages.map((page) => {
                  const done = completedSlugs.has(page.slug);
                  return (
                    <li key={page.slug}>
                      <Link
                        href={`/tutorials/${track.slug}/${page.slug}`}
                        className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-(--card-hover)"
                      >
                        {done ? (
                          <Check className="size-3.5 shrink-0 text-signal-green-strong" />
                        ) : (
                          <CircleDashed className="size-3.5 shrink-0 text-slate" />
                        )}
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-xs",
                            done ? "text-slate" : "text-ink",
                          )}
                        >
                          {page.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface-card p-4 md:p-5">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Puzzles</h2>
          <span className="text-xxs text-slate">
            {solved.length} solved · {started.length} in progress · {puzzles.length} published
          </span>
        </div>

        {puzzleProgress.length === 0 ? (
          <p className="text-xs text-slate">
            No puzzles opened yet.{" "}
            <Link href="/puzzles" className="underline hover:text-copper-dark">
              Try one
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {[...solved, ...started].map((entry) => (
              <li key={entry.puzzleSlug}>
                <Link
                  href={`/puzzles/${entry.puzzleSlug}`}
                  className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-(--card-hover)"
                >
                  {entry.solved ? (
                    <Trophy className="size-3.5 shrink-0 text-signal-green-strong" />
                  ) : (
                    <CircleDashed className="size-3.5 shrink-0 text-slate" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-ink">
                    {/* The progress row carries only a slug; the puzzle table
                        has the title, so fall back to the slug rather than
                        joining for a list this short. */}
                    {titleOf.get(entry.puzzleSlug) ?? entry.puzzleSlug.replace(/-/g, " ")}
                  </span>
                  <span className="shrink-0 text-xxs text-slate">
                    {entry.solved ? "solved" : "in progress"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface-card p-4 md:p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Quiz history</h2>
        <p className="mb-4 text-xs text-slate">
          Your best and most recent score on every quiz you have finished.
        </p>

        {quizHistory.length === 0 ? (
          <p className="text-xs text-slate">
            No quizzes run yet. They appear inside tutorial pages as you read.
          </p>
        ) : (
          <div className="custom-scrollbar-x -mx-1 px-1">
            <DataTable
              headers={["Quiz", "Best", "Latest", "Attempts", "Last run"]}
              rows={quizHistory.map((entry) => [
                entry.pageTitle ?? entry.pageSlug,
                `${entry.best}/${entry.total}`,
                `${entry.latest}/${entry.total}`,
                entry.attempts,
                new Date(entry.lastAttemptAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              ])}
            />
          </div>
        )}
      </section>
    </DashboardPage>
  );
}

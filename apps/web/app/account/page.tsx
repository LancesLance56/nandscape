import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CircuitBoard,
  Flame,
  FolderGit2,
  Sliders,
  Sparkles,
  Trophy,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserPreferences, MAX_PINNED_PROJECTS } from "@/lib/account/preferences";
import {
  activityThisWeek,
  currentStreak,
  listTrackOutlines,
  suggestPuzzles,
  toTrackProgress,
} from "@/lib/account/learning";
import { listProjectsForUser } from "@/lib/projects/projects";
import { listProgressForUser } from "@/lib/puzzles/puzzle-progress";
import { listPuzzleRecords } from "@/lib/puzzles/puzzle-records";
import { listQuizAttempts, listTutorialProgress, toActivityCounts } from "@/lib/engagement/progress";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";
import { StatTile } from "@/components/dashboard/charts/stat-tile";
import { Meter } from "@/components/dashboard/charts/meter";
import { LearningActivity } from "@/components/account/learning-activity";
import { PinButton } from "@/components/account/pin-button";

/**
 * The reader's own overview.
 *
 * Personal in the sense that it computes different things for different people,
 * not just that it says their name: the focus track decides which lesson "up
 * next" names, the weekly goal is the meter's denominator, the difficulty
 * preference filters the puzzle suggestions, and the pins choose which circuits
 * come first. Turn a card off in Personalisation and it is not rendered here at
 * all - see OVERVIEW_WIDGETS.
 *
 * Reads are individually `catch`ed to their empty value. This page is now the
 * only route to the settings pages, so a database hiccup in the puzzle table
 * must not be able to lock somebody out of changing their password.
 */

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const preferences = await getUserPreferences(user.id).catch(() => null);
  const prefs = preferences ?? {
    focusTrackSlug: null,
    weeklyGoal: 3,
    preferredDifficulty: null,
    pinnedProjectIds: [],
    hiddenWidgets: [],
  };

  const [projects, puzzleProgress, allPuzzles, tutorials, quizzes, outlines, suggestions] =
    await Promise.all([
      listProjectsForUser(user.id).catch(() => []),
      listProgressForUser(user.id).catch(() => []),
      listPuzzleRecords().catch(() => []),
      listTutorialProgress(user.id).catch(() => []),
      listQuizAttempts(user.id).catch(() => []),
      listTrackOutlines().catch(() => []),
      suggestPuzzles(user.id, prefs.preferredDifficulty).catch(() => []),
    ]);

  const shows = (id: string) => !prefs.hiddenWidgets.includes(id);

  const completedSlugs = new Set(tutorials.map((entry) => entry.pageSlug));
  const trackProgress = toTrackProgress(outlines, completedSlugs);
  const focus = trackProgress.find((track) => track.slug === prefs.focusTrackSlug) ?? null;

  const solved = puzzleProgress.filter((entry) => entry.solved);
  const activity = toActivityCounts(tutorials, quizzes);
  const streak = currentStreak(activity.keys());
  const thisWeek = activityThisWeek(tutorials, quizzes);

  const pinned = prefs.pinnedProjectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is (typeof projects)[number] => project !== undefined);
  const recent = [...projects]
    .sort((a, b) => msOf(b.updatedAt) - msOf(a.updatedAt))
    .filter((project) => !prefs.pinnedProjectIds.includes(project.id))
    .slice(0, 4);

  return (
    <DashboardPage
      title={`Hey, ${user.name?.split(" ")[0] ?? user.username}`}
      description={
        streak > 0
          ? `${streak} day${streak === 1 ? "" : "s"} in a row. Keep it going.`
          : "Pick something up where you left it."
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={BookOpen}
          label="Lessons done"
          value={tutorials.length}
          detail={focus ? `${focus.completed} in ${focus.title}` : undefined}
          href="/account/progress"
        />
        <StatTile
          icon={Trophy}
          label="Puzzles solved"
          value={solved.length}
          detail={allPuzzles.length > 0 ? `of ${allPuzzles.length} published` : undefined}
          href="/puzzles"
        />
        <StatTile
          icon={FolderGit2}
          label="Circuits saved"
          value={projects.length}
          detail={pinned.length > 0 ? `${pinned.length} pinned` : undefined}
          href="/account/circuits"
        />
        <StatTile
          icon={Flame}
          label="Day streak"
          value={streak}
          detail={streak === 0 ? "start one today" : "lessons and quizzes"}
        />
      </div>

      {shows("continue") && (
        <section className="rounded-2xl border border-border bg-surface-card p-4 md:p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Up next</h2>

          {!focus ? (
            // No focus track chosen, so there is no honest "next lesson" to
            // name. Saying so and offering the setting beats guessing.
            <EmptyPrompt
              text="Pick a track to focus on and this card will always show the next lesson in it."
              cta={{ label: "Choose a focus track", href: "/account/settings/preferences" }}
            />
          ) : focus.nextPage ? (
            <div className="flex flex-col gap-4">
              <Link
                href={`/tutorials/${focus.slug}/${focus.nextPage.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-copper hover:bg-(--card-hover)"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-copper-bg text-copper-dark">
                  <BookOpen className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {focus.nextPage.title}
                  </span>
                  <span className="block text-xxs text-slate">in {focus.title}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-slate transition-transform group-hover:translate-x-0.5 group-hover:text-copper" />
              </Link>

              <Meter
                label={focus.title}
                value={focus.completed}
                total={focus.pages.length}
                caption={`${focus.completed} of ${focus.pages.length} lessons`}
              />
            </div>
          ) : (
            <p className="py-2 text-xs text-signal-green-strong">
              You have finished every lesson in {focus.title}. Pick another track in
              Personalisation.
            </p>
          )}
        </section>
      )}

      {shows("goal") && (
        <section className="rounded-2xl border border-border bg-surface-card p-4 md:p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Weekly goal</h2>
            <Link
              href="/account/settings/preferences"
              className="text-xxs text-slate hover:text-copper-dark"
            >
              Change goal →
            </Link>
          </div>

          <Meter
            label="Lessons and quizzes finished"
            value={thisWeek}
            total={prefs.weeklyGoal}
            caption={`${thisWeek} of ${prefs.weeklyGoal} in the last 7 days`}
          />

          <p className="mt-2.5 text-xxs text-slate">
            {thisWeek >= prefs.weeklyGoal
              ? "Goal met. Anything else this week is a bonus."
              : `${prefs.weeklyGoal - thisWeek} to go.`}
          </p>
        </section>
      )}

      {shows("activity") && <LearningActivity counts={Object.fromEntries(activity)} />}

      {shows("tracks") && trackProgress.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface-card p-4 md:p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Track progress</h2>
          <ul className="flex flex-col gap-4">
            {trackProgress.map((track) => (
              <li key={track.slug}>
                <Meter
                  label={track.title}
                  value={track.completed}
                  total={track.pages.length}
                  caption={`${track.completed} of ${track.pages.length}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {shows("puzzles") && (
          <section className="rounded-2xl border border-border bg-surface-card p-4 md:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">Try next</h2>
              <span className="text-xxs text-slate">
                {prefs.preferredDifficulty ? `${prefs.preferredDifficulty} puzzles` : "any difficulty"}
              </span>
            </div>

            {suggestions.length === 0 ? (
              <EmptyPrompt
                text={
                  prefs.preferredDifficulty
                    ? `Nothing unsolved left at ${prefs.preferredDifficulty}. Widen the difficulty to see more.`
                    : "No unsolved puzzles left. That is the whole set."
                }
                cta={{ label: "Change difficulty", href: "/account/settings/preferences" }}
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {suggestions.map((puzzle) => (
                  <li key={puzzle.slug}>
                    <Link
                      href={`/puzzles/${puzzle.slug}`}
                      className="group flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-copper hover:bg-(--card-hover)"
                    >
                      <Sparkles className="size-3.5 shrink-0 text-slate group-hover:text-copper" />
                      <span className="min-w-0 flex-1 truncate text-xs text-ink">
                        {puzzle.title}
                      </span>
                      <span className="shrink-0 text-xxs text-slate capitalize">
                        {puzzle.started ? "resume" : puzzle.difficulty}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {shows("circuits") && (
          <section className="rounded-2xl border border-border bg-surface-card p-4 md:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">Your circuits</h2>
              <Link href="/account/circuits" className="text-xxs text-slate hover:text-copper-dark">
                All circuits →
              </Link>
            </div>

            {projects.length === 0 ? (
              <EmptyPrompt
                text="No circuits saved yet."
                cta={{ label: "Open the editor", href: "/logic-editor" }}
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {[...pinned, ...recent].slice(0, 5).map((project) => (
                  <li key={project.id} className="flex items-center gap-2">
                    <Link
                      href={`/projects/${project.slug}`}
                      className="group -mx-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-(--card-hover)"
                    >
                      <CircuitBoard className="size-3.5 shrink-0 text-slate group-hover:text-copper" />
                      <span className="min-w-0 flex-1 truncate text-xs text-ink">
                        {project.name}
                      </span>
                      <span className="shrink-0 text-xxs tabular-nums text-slate">
                        {formatDay(project.updatedAt)}
                      </span>
                    </Link>
                    <PinButton
                      projectId={project.id}
                      pinned={prefs.pinnedProjectIds.includes(project.id)}
                      currentPins={prefs.pinnedProjectIds}
                      atLimit={prefs.pinnedProjectIds.length >= MAX_PINNED_PROJECTS}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {prefs.hiddenWidgets.length > 0 && (
        <p className="flex items-center gap-1.5 text-xxs text-slate">
          <Sliders className="size-3" />
          {prefs.hiddenWidgets.length} card{prefs.hiddenWidgets.length === 1 ? "" : "s"} hidden.{" "}
          <Link href="/account/settings/preferences" className="underline hover:text-copper-dark">
            Show them again
          </Link>
        </p>
      )}
    </DashboardPage>
  );
}

/* -------------------------------------------------------------------------- */

function EmptyPrompt({ text, cta }: { text: string; cta: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-start gap-2.5 py-1">
      <p className="text-xs text-slate">{text}</p>
      <Link
        href={cta.href}
        className="rounded-lg border border-border-strong px-2.5 py-1 text-xxs font-semibold text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
      >
        {cta.label}
      </Link>
    </div>
  );
}

/**
 * The query helpers type these timestamps as `string`, but the raw pg driver
 * returns a `Date` for a timestamptz column - so the annotation is a lie at
 * runtime and sorting on it with `localeCompare` would throw. Both shapes go
 * through here instead.
 */
function msOf(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function formatDay(value: string | Date | null | undefined): string {
  const ms = msOf(value);
  return ms === 0 ? "" : new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

import { redirect } from "next/navigation";
import { Hand, KeyRound, LogIn, Puzzle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAdminAnalytics } from "@/lib/analytics/admin-analytics";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";
import { StatTile } from "@/components/dashboard/charts/stat-tile";
import { RankedBars } from "@/components/dashboard/charts/ranked-bars";
import { ChartCard, DataTable } from "@/components/dashboard/charts/chart-card";
import { Meter } from "@/components/dashboard/charts/meter";

/**
 * The breakdowns that do not belong on the overview.
 *
 * Three questions, in order: what is being read, what is being learned, and
 * where people get stuck. The last one is the useful one - a quiz with a low
 * average score is a lesson that is not landing, and the quiz table is sorted
 * worst-first for exactly that reason rather than showing a leaderboard of
 * things that are already working.
 */

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const analytics = await getAdminAnalytics();
  const { audience, library } = analytics;

  return (
    <DashboardPage
      title="Analytics"
      description="Counted straight off the tables the site writes. Nothing here is sampled or estimated."
    >
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Audience</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            icon={LogIn}
            label="Signed in somewhere"
            value={audience.usersWithLiveSession}
            detail="unexpired sessions"
          />
          <StatTile
            icon={KeyRound}
            label="Password accounts"
            value={audience.passwordUsers}
            detail={`${audience.googleUsers} via Google`}
          />
          <StatTile
            icon={Hand}
            label="Claps given"
            value={analytics.totalClaps}
            detail="readers and visitors"
          />
          <StatTile
            icon={Puzzle}
            label="Puzzles unsolved"
            value={analytics.untouchedPuzzles}
            detail={`of ${library.puzzles} published`}
          />
        </div>
        {/* Sign-in methods overlap - an account created with Google can also
            set a password - so the two counts above are deliberately not
            presented as a split of the whole. */}
        <p className="text-xxs text-slate">
          A single account can hold both a password and a Google identity, so those two counts
          overlap rather than partitioning the {audience.totalUsers} total.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RankedBars
          title="Most applauded"
          subtitle="Total claps, all time. Claps are per reader and capped, so the count measures enthusiasm rather than reach."
          valueLabel="Claps"
          emptyText="Nobody has clapped anything yet."
          bars={analytics.topContent.map((item) => ({
            key: `${item.kind}:${item.slug}`,
            label: item.title ?? item.slug,
            value: item.claps,
            detail: `${item.clappers} ${item.clappers === 1 ? "person" : "people"}`,
            href: item.kind === "BLOG" ? `/blog/${item.slug}` : `/tutorials/${item.slug}`,
          }))}
        />

        <RankedBars
          title="Most completed lessons"
          subtitle="Readers who marked the page done."
          valueLabel="Completions"
          emptyText="No lessons have been marked done yet."
          bars={analytics.topLessons.map((lesson) => ({
            key: lesson.slug,
            label: lesson.title ?? lesson.slug,
            value: lesson.completions,
          }))}
        />
      </div>

      <ChartCard
        title="How far learners get"
        subtitle="Average pages completed per learner who has started the track."
        table={
          <DataTable
            headers={["Track", "Published pages", "Learners", "Completions", "Avg pages each"]}
            rows={analytics.tracks.map((track) => [
              track.title,
              track.publishedPages,
              track.learners,
              track.completions,
              track.learners === 0 ? "—" : (track.completions / track.learners).toFixed(1),
            ])}
          />
        }
      >
        {analytics.tracks.length === 0 ? (
          <p className="py-4 text-xs text-slate">No tracks have been created yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {analytics.tracks.map((track) => {
              // Per learner, not in total. Raw completions divided by page
              // count would climb past 100% the moment a second reader
              // finished the same page, which would make the meter a lie; per
              // learner it stays a proportion of the track and answers the
              // question the card asks.
              const average = track.learners === 0 ? 0 : track.completions / track.learners;

              return (
                <li key={track.slug}>
                  <Meter
                    label={track.title}
                    value={average}
                    total={track.publishedPages}
                    caption={
                      track.learners === 0
                        ? `no learners yet · ${track.publishedPages} pages`
                        : `${average.toFixed(1)} of ${track.publishedPages} pages · ${
                            track.learners
                          } ${track.learners === 1 ? "learner" : "learners"}`
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </ChartCard>

      <ChartCard
        title="Quizzes, hardest first"
        subtitle="Mean score per quiz. A low average is a signal about the lesson before it, not about the readers."
        table={
          <DataTable
            headers={["Quiz", "Attempts", "Average score"]}
            rows={analytics.quizzes.map((quiz) => [
              quiz.quizKey,
              quiz.attempts,
              `${quiz.averagePercent}%`,
            ])}
          />
        }
      >
        {analytics.quizzes.length === 0 ? (
          <p className="py-4 text-xs text-slate">
            No quiz has been run yet. Scores appear here as soon as a reader finishes one.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {analytics.quizzes.map((quiz) => (
              <li key={quiz.quizKey}>
                <Meter
                  label={quiz.quizKey}
                  value={quiz.averagePercent}
                  total={100}
                  caption={`${quiz.averagePercent}% over ${quiz.attempts} ${
                    quiz.attempts === 1 ? "attempt" : "attempts"
                  }`}
                />
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      <ChartCard
        title="Puzzles people have opened"
        subtitle="Puzzles with at least one saved attempt. Everything else has never been started."
        table={
          <DataTable
            headers={["Puzzle", "Difficulty", "Solved", "In progress"]}
            rows={analytics.puzzles.map((puzzle) => [
              puzzle.title,
              puzzle.difficulty.toLowerCase(),
              puzzle.solvers,
              puzzle.attempting,
            ])}
          />
        }
      >
        {analytics.puzzles.length === 0 ? (
          <p className="py-4 text-xs text-slate">Nobody has opened a puzzle yet.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {analytics.puzzles.map((puzzle) => (
              <li
                key={puzzle.slug}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-ink">{puzzle.title}</p>
                  <p className="text-xxs text-slate capitalize">
                    {puzzle.difficulty.toLowerCase()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xxs">
                  <span className="flex flex-col items-end">
                    <span className="font-medium tabular-nums text-ink">{puzzle.solvers}</span>
                    <span className="text-slate">solved</span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-medium tabular-nums text-ink">{puzzle.attempting}</span>
                    <span className="text-slate">in progress</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      {/* Twelve classes, none of them ordered and none of them comparable by
          size - a chart here would be twelve colours saying nothing. A table
          is the form. */}
      <section className="rounded-2xl border border-border bg-surface-card p-4 md:p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Content inventory</h2>
        <p className="mb-4 text-xs text-slate">Everything in the database, published or not.</p>
        <div className="custom-scrollbar-x -mx-1 px-1">
          <DataTable
            headers={["Kind", "Count"]}
            rows={[
              ["Published posts", library.publishedPosts],
              ["Draft posts", library.draftPosts],
              ["Published tutorial pages", library.publishedPages],
              ["Draft tutorial pages", library.draftPages],
              ["Tracks", library.tracks],
              ["Sections", library.sections],
              ["Puzzles", library.puzzles],
              ["Diagram presets", library.diagramPresets],
              ["Public circuits", library.publicProjects],
              ["Unlisted circuits", library.unlistedProjects],
              ["Private circuits", library.privateProjects],
              ["Forked circuits", library.forkedProjects],
            ]}
          />
        </div>
      </section>
    </DashboardPage>
  );
}

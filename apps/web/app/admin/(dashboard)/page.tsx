import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, FileText, Sparkles, TrendingUp, UserCheck, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAdminAnalytics } from "@/lib/analytics/admin-analytics";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";
import { StatTile } from "@/components/dashboard/charts/stat-tile";
import { ColumnTrend } from "@/components/dashboard/charts/column-trend";
import { SERIES } from "@/components/dashboard/charts/series";

/**
 * What the admin sees first.
 *
 * A KPI row, then the two questions a teaching site actually has: are people
 * arriving, and are they doing anything once they are here. Deeper breakdowns
 * live on /admin/analytics rather than being crammed in here, because an
 * overview that shows everything shows nothing.
 *
 * Every figure is a count over a table this app writes. Where there is no data
 * the tile reads zero and the chart says so - see lib/analytics.
 */

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const analytics = await getAdminAnalytics();
  const { audience, library, windowDays } = analytics;

  const lessonsThisWindow = analytics.activity.reduce((sum, day) => sum + day.lessons, 0);
  const eventsThisWindow = analytics.activity.reduce(
    (sum, day) => sum + day.lessons + day.quizzes + day.puzzles,
    0,
  );

  return (
    <DashboardPage
      title="Overview"
      description={`Everything below is measured over the last ${windowDays} days, against the ${windowDays} before it.`}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Users}
          label="Accounts"
          value={audience.totalUsers}
          detail={`${audience.verifiedUsers} email-verified`}
          href="/admin/users"
        />
        <StatTile
          icon={TrendingUp}
          label="New sign-ups"
          value={audience.newUsers}
          previous={audience.previousNewUsers}
          previousLabel={`prev ${windowDays} days`}
        />
        <StatTile
          icon={UserCheck}
          label="Active learners"
          value={audience.activeLearners}
          previous={audience.previousActiveLearners}
          previousLabel={`prev ${windowDays} days`}
        />
        <StatTile
          icon={Sparkles}
          label="Things finished"
          value={eventsThisWindow}
          detail={`${lessonsThisWindow} of them lessons`}
          href="/admin/analytics"
        />
      </div>

      <ColumnTrend
        title="Learning activity"
        subtitle={`Lessons marked done, quizzes run and puzzles solved, per day for ${windowDays} days.`}
        points={analytics.activity.map((day) => ({
          day: day.day,
          values: { lessons: day.lessons, quizzes: day.quizzes, puzzles: day.puzzles },
        }))}
        series={SERIES.activity}
        unit="event"
      />

      <ColumnTrend
        title="New accounts"
        subtitle={`Sign-ups per day for ${windowDays} days.`}
        points={analytics.signups.map((day) => ({ day: day.day, values: { signups: day.count } }))}
        series={SERIES.signups}
        unit="sign-up"
      />

      <section className="rounded-2xl border border-border bg-surface-card p-4 md:p-5">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Library</h2>
          <Link href="/admin/analytics" className="text-xxs text-slate hover:text-copper-dark">
            Full breakdown →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <LibraryCount
            icon={FileText}
            label="Posts"
            published={library.publishedPosts}
            drafts={library.draftPosts}
            href="/admin/blog"
          />
          <LibraryCount
            icon={BookOpen}
            label="Tutorial pages"
            published={library.publishedPages}
            drafts={library.draftPages}
            href="/admin/tutorials"
          />
          <LibraryCount icon={Sparkles} label="Puzzles" published={library.puzzles} />
          <LibraryCount
            icon={Users}
            label="Public circuits"
            published={library.publicProjects}
            detail={`${library.privateProjects} private`}
          />
        </div>

        {/* A published lesson with no section never appears in the directory,
            so it is effectively unreachable. Worth saying out loud, and only
            when it is actually true. */}
        {library.orphanPages > 0 && (
          <p className="mt-4 rounded-lg bg-copper-bg px-3 py-2 text-xs text-copper-dark">
            {library.orphanPages} published tutorial{" "}
            {library.orphanPages === 1 ? "page is" : "pages are"} not in any section, so{" "}
            {library.orphanPages === 1 ? "it does" : "they do"} not appear in the directory.
          </p>
        )}
      </section>
    </DashboardPage>
  );
}

function LibraryCount({
  icon: Icon,
  label,
  published,
  drafts,
  detail,
  href,
}: {
  icon: typeof Users;
  label: string;
  published: number;
  drafts?: number;
  detail?: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xxs text-slate">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="mt-1.5 block font-display text-xl font-bold text-ink">{published}</span>
      <span className="text-xxs text-slate">
        {drafts !== undefined ? `${drafts} draft${drafts === 1 ? "" : "s"}` : (detail ?? "published")}
      </span>
    </>
  );

  const className = "rounded-xl border border-border p-3 transition-colors";
  return href ? (
    <Link href={href} className={`${className} hover:border-border-strong hover:bg-(--card-hover)`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

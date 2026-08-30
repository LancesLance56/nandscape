import Link from "next/link";
import { BookOpen, CircuitBoard, FolderGit2, Puzzle, Sparkles, Trophy } from "lucide-react";
import { LearningActivity } from "./learning-activity";
import type { ProjectSummary } from "@/lib/projects/projects";
import type { PuzzleProgressRecord } from "@/lib/puzzles/puzzle-progress";
import { cn } from "@/lib/cn";

/**
 * What the account page shows above the settings forms.
 *
 * The card shape and the stat row come from Watermelon UI's demostack
 * dashboard: a bordered rounded-2xl tile with its icon in a filled square, and
 * a three-across grid that collapses to one column. The rest of that template
 * did not come across, and could not have. Those dashboard blocks are whole
 * app shells - each ships its own sidebar, top bar and theme provider, which
 * would fight the site's Navbar and next-themes, plus a data.ts of mock
 * content to strip out. Only the content pane was worth taking.
 *
 * Everything here is real. The counts are computed from the user's own
 * PuzzleProgress and Project rows rather than being decorative, so an empty
 * account renders an honest zero and a prompt rather than a fake sparkline.
 */

/**
 * Row timestamps are not reliably strings.
 *
 * The query helpers type `updatedAt` / `solvedAt` as `string`, but the raw pg
 * driver hands back a JS `Date` for a timestamptz column, so the declared type
 * is a lie at runtime. That is survivable for display (`new Date` accepts
 * either) and fatal for sorting: `.localeCompare` does not exist on a Date.
 * Everything here goes through this instead of trusting the annotation.
 */
function time(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function formatDay(value: string | Date | null | undefined): string {
  const ms = time(value);
  return ms === 0 ? "" : new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export interface UserDashboardData {
  username: string;
  projects: ProjectSummary[];
  progress: PuzzleProgressRecord[];
  /** How many puzzles exist in total, so "7 solved" can be "7 of 24". */
  totalPuzzles: number;
  /** Tutorial pages this reader has marked done, newest first. */
  tutorials: { pageSlug: string; trackSlug: string | null; completedAt: Date }[];
  /** Every published lesson, so the list can show what is left as well as
   *  what is done. */
  totalTutorials: number;
  /** Day key -> activity count, for the heatmap. */
  activity: Record<string, number>;
}

export function UserDashboard({
  username,
  projects,
  progress,
  totalPuzzles,
  tutorials,
  totalTutorials,
  activity,
}: UserDashboardData) {
  const solved = progress.filter((p) => p.solved);
  const inProgress = progress.length - solved.length;

  // Derived rather than passed in: the session carries no createdAt, and
  // widening SessionUser across the auth package for one subtitle is a worse
  // trade than dating the account from its oldest surviving activity.
  const stamps = [...progress.map((p) => p.updatedAt), ...projects.map((p) => p.updatedAt)]
    .map(time)
    .filter((ms) => ms > 0);
  const firstSeen = stamps.length > 0 ? Math.min(...stamps) : null;

  // Newest first. The progress rows carry solvedAt only once solved, so
  // updatedAt is the field that always sorts.
  const recentSolved = [...solved]
    .sort((a, b) => time(b.solvedAt ?? b.updatedAt) - time(a.solvedAt ?? a.updatedAt))
    .slice(0, 4);
  const recentProjects = [...projects].sort((a, b) => time(b.updatedAt) - time(a.updatedAt)).slice(0, 4);
  const recentTutorials = [...tutorials].sort((a, b) => time(b.completedAt) - time(a.completedAt)).slice(0, 4);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Hey, {username}</h1>
        {firstSeen && (
          <p className="mt-1 text-sm text-ink-soft">
            Building since {new Date(firstSeen).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Trophy}
          label="Puzzles solved"
          value={solved.length}
          detail={totalPuzzles > 0 ? `of ${totalPuzzles}` : undefined}
          href="/puzzles"
        />
        <StatCard
          icon={Puzzle}
          label="In progress"
          value={inProgress}
          detail={inProgress > 0 ? "keep going" : "nothing half-done"}
          href="/puzzles"
        />
        <StatCard
          icon={BookOpen}
          label="Lessons done"
          value={tutorials.length}
          detail={totalTutorials > 0 ? `of ${totalTutorials}` : undefined}
          href="/tutorials"
        />
        <StatCard icon={FolderGit2} label="Circuits saved" value={projects.length} href="/projects" />
      </div>

      <LearningActivity counts={activity} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel
          title="Your circuits"
          action={{ label: "All projects", href: "/projects" }}
          empty={
            recentProjects.length === 0
              ? { text: "No circuits yet.", cta: { label: "Open the editor", href: "/logic-editor" } }
              : undefined
          }
        >
          {recentProjects.map((project) => (
            <Row
              key={project.id}
              href={`/projects/${project.slug}`}
              icon={CircuitBoard}
              title={project.name}
              meta={formatDay(project.updatedAt)}
              badge={project.visibility === "PRIVATE" ? "Private" : undefined}
            />
          ))}
        </Panel>

        <Panel
          title="Recently solved"
          action={{ label: "All puzzles", href: "/puzzles" }}
          empty={
            recentSolved.length === 0
              ? { text: "No puzzles solved yet.", cta: { label: "Try one", href: "/puzzles" } }
              : undefined
          }
        >
          {recentSolved.map((entry) => (
            <Row
              key={entry.puzzleSlug}
              href={`/puzzles/${entry.puzzleSlug}`}
              icon={Sparkles}
              // Slugs are the only title available here without joining the
              // puzzle table for what is a four-row list.
              title={entry.puzzleSlug.replace(/-/g, " ")}
              meta={formatDay(entry.solvedAt)}
              titleClassName="capitalize"
            />
          ))}
        </Panel>

        <Panel
          title="Lessons finished"
          action={{ label: "All tutorials", href: "/tutorials" }}
          empty={
            recentTutorials.length === 0
              ? { text: "No lessons marked done yet.", cta: { label: "Start a track", href: "/tutorials" } }
              : undefined
          }
        >
          {recentTutorials.map((entry) => (
            <Row
              key={entry.pageSlug}
              href={
                entry.trackSlug
                  ? `/tutorials/${entry.trackSlug}/${entry.pageSlug}`
                  : `/tutorials/${entry.pageSlug}`
              }
              icon={BookOpen}
              title={entry.pageSlug.replace(/-/g, " ")}
              meta={formatDay(entry.completedAt)}
              titleClassName="capitalize"
            />
          ))}
        </Panel>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
}: {
  icon: typeof Trophy;
  label: string;
  value: number;
  detail?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface-card p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-copper/12 text-copper-dark">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span>
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold tabular-nums text-ink">{value}</span>
          {detail && <span className="text-[11px] text-slate">{detail}</span>}
        </span>
        <span className="mt-0.5 block text-xs text-ink-soft">{label}</span>
      </span>
    </Link>
  );
}

function Panel({
  title,
  action,
  empty,
  children,
}: {
  title: string;
  action: { label: string; href: string };
  empty?: { text: string; cta: { label: string; href: string } };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <Link href={action.href} className="text-[11px] font-medium text-slate hover:text-copper-dark">
          {action.label} →
        </Link>
      </div>

      {empty ? (
        <div className="flex flex-col items-start gap-2 py-3">
          <p className="text-xs text-slate">{empty.text}</p>
          <Link
            href={empty.cta.href}
            className="rounded-lg border border-border-strong px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
          >
            {empty.cta.label}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">{children}</div>
      )}
    </div>
  );
}

function Row({
  href,
  icon: Icon,
  title,
  meta,
  badge,
  titleClassName,
}: {
  href: string;
  icon: typeof Trophy;
  title: string;
  meta: string;
  badge?: string;
  titleClassName?: string;
}) {
  return (
    <Link
      href={href}
      className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate transition-colors group-hover:text-copper" />
      <span className={cn("min-w-0 flex-1 truncate text-xs text-ink", titleClassName)}>{title}</span>
      {badge && (
        <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-slate">
          {badge}
        </span>
      )}
      <span className="shrink-0 text-[10px] tabular-nums text-slate">{meta}</span>
    </Link>
  );
}

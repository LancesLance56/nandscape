import type { Metadata } from "next";
import Link from "next/link";
import { CommunityShell, SectionHead } from "@/components/community/community-shell";
import { Rail, RailItem } from "@/components/ui/rail";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStreak } from "@/lib/community/activity";
import { listActiveThreads } from "@/lib/community/discussions";
import { getLeaderboard } from "@/lib/community/leaderboard";
import { shortAgo } from "@/lib/community/format";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Community",
  seoTitle: "Nandscape Community: Discussion, Circuits and Rankings",
  seoDescription:
    "Discussion threads on algorithms, data structures and digital logic, public circuits shared by readers, and an activity ranking counted from solved problems and answers.",
  path: "/community",
  type: "website",
});

export default async function CommunityPage() {
  const user = await getCurrentUser().catch(() => null);

  const [threads, board, streak] = await Promise.all([
    listActiveThreads(6).catch(() => []),
    getLeaderboard("solved", "week").catch(() => []),
    user ? getStreak(user.id).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <CommunityShell
      active="hub"
      eyebrow="Community"
      title="Community Overview"
      intro="Discussion threads, shared circuits and activity rankings across everything on Nandscape: algorithms, data structures, digital logic and the tooling around them."
      action={
        <Button size="app" render={<Link href="/community/discussions/new" />}>
          Start a discussion
        </Button>
      }
      wide
    >
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <SectionHead
            title="Active discussions"
            action={{ label: "All discussions", href: "/community/discussions" }}
            note="Threads stand on their own or attach to a problem, lesson or circuit."
          />
          {threads.length === 0 ? (
            <EmptyRail>
              No discussions yet. Starting one is the fastest way to find out if anyone else hit the
              same thing.
            </EmptyRail>
          ) : (
            <Rail>
              {threads.map((thread) => (
                <RailItem
                  key={thread.href}
                  href={thread.href}
                  title={thread.title}
                  detail={
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-5 items-center rounded-4xl bg-surface-2 px-2 font-mono text-[10px] font-medium text-ink-soft">
                        {thread.kindLabel}
                      </span>
                      <span className="truncate">
                        {thread.scope || `@${thread.author}`}
                      </span>
                    </span>
                  }
                  meta={
                    <span className="flex items-center gap-3">
                      <span className="hidden sm:inline">{shortAgo(thread.lastActivity)}</span>
                      <span className="w-6 text-right font-mono text-copper-dark">
                        {thread.count}
                      </span>
                    </span>
                  }
                />
              ))}
            </Rail>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-8">
          <section>
            <SectionHead
              title="Most solved this week"
              action={{ label: "Full board", href: "/community/leaderboard" }}
            />
            {board.length === 0 ? (
              <EmptyRail>Nobody has solved anything this week yet.</EmptyRail>
            ) : (
              <Rail>
                {board.slice(0, 5).map((entry) => (
                  <RailItem
                    key={entry.username}
                    href={`/u/${entry.username}`}
                    filled={entry.rank <= 3}
                    title={
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 shrink-0 font-mono text-xs text-slate">
                          {String(entry.rank).padStart(2, "0")}
                        </span>
                        <span className="truncate">@{entry.username}</span>
                      </span>
                    }
                    meta={<span className="font-mono text-copper-dark">{entry.value}</span>}
                  />
                ))}
              </Rail>
            )}
          </section>

          {streak ? (
            <Card className="p-5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
                Your streak
              </p>
              <p className="mb-3.5 font-mono text-[28px] font-semibold text-accent-display">
                {streak.days} {streak.days === 1 ? "day" : "days"}
              </p>
              <div className="mb-3.5 flex gap-1">
                {streak.cells.map((cell) => (
                  <span
                    key={cell.date}
                    title={cell.date}
                    className={cn("h-5.5 flex-1 rounded-sm", cell.active ? "bg-copper" : "bg-surface-2")}
                  />
                ))}
              </div>
              <p className="text-[13px] leading-relaxed text-ink-soft">
                One solved problem, one published circuit or one answer keeps it alive.
              </p>
            </Card>
          ) : (
            <Card className="p-5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
                Your streak
              </p>
              <p className="mb-4 text-[13px] leading-relaxed text-ink-soft">
                Sign in to track a run of days. One solved problem, one published circuit or one
                answer keeps it alive.
              </p>
              <Button size="app" render={<Link href="/login" />}>
                Sign in
              </Button>
            </Card>
          )}
        </aside>
      </div>
    </CommunityShell>
  );
}

function EmptyRail({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-slate">
      {children}
    </p>
  );
}

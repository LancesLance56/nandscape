import type { Metadata } from "next";
import Link from "next/link";
import { CommunityShell } from "@/components/community/community-shell";
import { AvatarDisc } from "@/components/community/avatar-disc";
import { Rail, RailItem } from "@/components/ui/rail";
import {
  getLeaderboard,
  isFrame,
  isMetric,
  FRAMES,
  FRAME_LABEL,
  METRICS,
  METRIC_LABEL,
  type Frame,
  type Metric,
} from "@/lib/community/leaderboard";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/cn";

/**
 * The board.
 *
 * Metric and timeframe live in the URL rather than in component state, which
 * makes every view of this page linkable and keeps the whole thing a server
 * component - there is nothing here that needs to run in the browser.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Leaderboard",
  seoTitle: "Nandscape Leaderboard: Most Solved, Most Forked, Longest Streak",
  seoDescription:
    "Activity ranking across Nandscape, counted from solved problems, forks of published circuits, answers written and consecutive active days.",
  path: "/community/leaderboard",
  type: "website",
});

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; frame?: string }>;
}) {
  const params = await searchParams;
  const metric: Metric = isMetric(params.metric) ? params.metric : "solved";
  const frame: Frame = isFrame(params.frame) ? params.frame : "week";

  const board = await getLeaderboard(metric, frame).catch(() => []);

  const href = (next: { metric?: Metric; frame?: Frame }) =>
    `/community/leaderboard?metric=${next.metric ?? metric}&frame=${next.frame ?? frame}`;

  return (
    <CommunityShell
      active="board"
      eyebrow="Leaderboard"
      title="Activity Ranking"
      intro="Counted from solved problems, forks of your published circuits, answers written, and consecutive active days. Nothing here is sampled or estimated."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-5 border-b border-border">
          {METRICS.map((id) => (
            <Link
              key={id}
              href={href({ metric: id })}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm transition-colors",
                id === metric
                  ? "border-copper font-semibold text-ink"
                  : "border-transparent font-medium text-ink-soft hover:text-ink",
              )}
            >
              {METRIC_LABEL[id]}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-surface-2 p-1">
          {FRAMES.map((id) => (
            <Link
              key={id}
              href={href({ frame: id })}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs transition-colors",
                id === frame
                  ? "bg-surface-card font-semibold text-ink"
                  : "font-medium text-ink-soft hover:text-ink",
              )}
            >
              {FRAME_LABEL[id]}
            </Link>
          ))}
        </div>
      </div>

      {board.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-[13px] text-slate">
          Nothing to rank in this window yet. Try All time.
        </p>
      ) : (
        <Rail>
          {board.map((entry) => (
            <RailItem
              key={entry.username}
              href={`/u/${entry.username}`}
              // The top three get a solid node, so the eye lands on the head of
              // the board rather than on row one by accident of position.
              filled={entry.rank <= 3}
              leading={
                <span className="flex items-center gap-3.5">
                  <span className="w-6 shrink-0 font-mono text-[13px] text-slate">
                    {String(entry.rank).padStart(2, "0")}
                  </span>
                  <AvatarDisc username={entry.username} size="lg" />
                </span>
              }
              title={<span className="font-mono">@{entry.username}</span>}
              meta={
                <span className="flex items-center gap-4">
                  <span className="hidden text-xs text-ink-soft sm:inline">{entry.support}</span>
                  <span className="w-24 text-right font-mono text-[15px] font-semibold text-copper-dark">
                    {entry.value} {entry.unit}
                  </span>
                </span>
              }
            />
          ))}
        </Rail>
      )}
    </CommunityShell>
  );
}

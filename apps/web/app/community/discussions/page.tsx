import type { Metadata } from "next";
import Link from "next/link";
import { CommunityShell } from "@/components/community/community-shell";
import { Rail, RailItem } from "@/components/ui/rail";
import { Button } from "@/components/ui/button";
import { listActiveThreads } from "@/lib/community/discussions";
import { shortAgo } from "@/lib/community/format";
import { buildContentMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Discussions",
  seoTitle: "Nandscape Discussions: Algorithms, Data Structures and Logic",
  seoDescription:
    "Every discussion thread on Nandscape, covering algorithms, data structures, digital logic and the tooling around them. Threads stand alone or attach to a problem, lesson or circuit.",
  path: "/community/discussions",
  type: "website",
});

export default async function DiscussionsPage() {
  const threads = await listActiveThreads(60).catch(() => []);

  return (
    <CommunityShell
      active="discussions"
      eyebrow="Discussions"
      title="Community Discussion"
      intro="Questions, approaches and corrections. A thread can stand on its own, or hang off the problem, lesson or circuit it is about."
      action={
        <Button size="app" render={<Link href="/community/discussions/new" />}>
          Start a discussion
        </Button>
      }
    >
      {threads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-[13px] text-slate">
          No discussions yet. Start the first one.
        </p>
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
                    {/* An attached thread names its content; a standalone one
                        names whoever opened it, since it is about itself. */}
                    {thread.scope || `@${thread.author}`}
                  </span>
                </span>
              }
              meta={
                <span className="flex items-center gap-3">
                  <span className="hidden sm:inline">{shortAgo(thread.lastActivity)}</span>
                  <span className="w-6 text-right font-mono text-copper-dark">{thread.count}</span>
                </span>
              }
            />
          ))}
        </Rail>
      )}
    </CommunityShell>
  );
}

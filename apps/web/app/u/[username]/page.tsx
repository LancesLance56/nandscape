import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AvatarDisc } from "@/components/community/avatar-disc";
import { Rail, RailItem } from "@/components/ui/rail";
import { CardLink } from "@/components/ui/card";
import { CircuitPreviewThumbnail } from "@/components/projects/circuit-preview-thumbnail";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import {
  getForkCounts,
  getProfileByUsername,
  listPersonPosts,
  listSolvedProblems,
} from "@/lib/community/people";
import { listPersonActivity } from "@/lib/community/activity";
import { listPublicProjects } from "@/lib/projects/projects";
import { joinedLabel, longAgo, shortAgo } from "@/lib/community/format";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "circuits", label: "Public circuits" },
  { id: "solved", label: "Solved" },
  { id: "activity", label: "Activity" },
  { id: "posts", label: "Discussions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTab(value: unknown): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username).catch(() => null);
  if (!profile) return { title: "Profile not found" };

  return buildContentMetadata({
    title: `@${profile.username}`,
    seoTitle: `@${profile.username} on Nandscape: Circuits, Solved Problems and Answers`,
    seoDescription:
      profile.bio ??
      `@${profile.username} has published ${profile.stats.circuits} circuits and solved ${profile.stats.solved} coding problems on Nandscape.`,
    path: `/u/${profile.username}`,
  });
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ username }, { tab }] = await Promise.all([params, searchParams]);

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const active: TabId = isTab(tab) ? tab : "circuits";
  const { stats } = profile;

  const statTiles = [
    { label: "Problems solved", value: stats.solved, note: `${stats.puzzles} puzzles as well` },
    { label: "Public circuits", value: stats.circuits, note: `${stats.forks} forks by others` },
    { label: "Discussion posts", value: stats.answers, note: "questions and answers" },
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 sm:px-10">
        <header className="mb-7 flex flex-wrap items-start gap-5">
          <AvatarDisc username={profile.username} size="xl" />
          <div className="min-w-60 flex-1">
            {/* The handle is the identity. There is no display-name field, so
                there is nothing here that could disagree with the byline on a
                post or the row on the leaderboard. */}
            <h1 className="mb-1 font-display text-2xl font-bold tracking-tight text-ink">
              @{profile.username}
            </h1>
            <p className="mb-2.5 font-mono text-[13px] text-slate">
              {joinedLabel(profile.createdAt)}
            </p>
            {profile.bio && (
              <p className="max-w-xl text-sm leading-relaxed text-ink-soft">{profile.bio}</p>
            )}
          </div>
        </header>

        <div className="mb-9 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3">
          {statTiles.map((tile) => (
            <div key={tile.label} className="bg-surface-card px-5 py-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">{tile.label}</p>
              <p className="font-mono text-[22px] font-semibold text-ink">{tile.value}</p>
              <p className="mt-1 text-xs text-ink-soft">{tile.note}</p>
            </div>
          ))}
        </div>

        <div className="mb-7 flex items-center gap-6 border-b border-border">
          {TABS.map((entry) => (
            <Link
              key={entry.id}
              href={`/u/${profile.username}?tab=${entry.id}`}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm transition-colors",
                entry.id === active
                  ? "border-copper font-semibold text-ink"
                  : "border-transparent font-medium text-ink-soft hover:text-ink",
              )}
            >
              {entry.label}
            </Link>
          ))}
        </div>

        {active === "circuits" && <CircuitsTab username={profile.username} />}
        {active === "solved" && <SolvedTab userId={profile.id} />}
        {active === "activity" && <ActivityTab userId={profile.id} />}
        {active === "posts" && <PostsTab userId={profile.id} />}
      </main>
      <Footer />
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-[13px] text-slate">
      {children}
    </p>
  );
}

async function CircuitsTab({ username }: { username: string }) {
  const [projects, forks] = await Promise.all([
    listPublicProjects({ ownerUsername: username }).catch(() => []),
    getForkCounts(username).catch(() => new Map<string, number>()),
  ]);

  if (projects.length === 0) return <Empty>No public circuits yet.</Empty>;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <CardLink key={project.slug} href={`/projects/${project.slug}`} className="flex flex-col overflow-hidden">
          <CircuitPreviewThumbnail
            nodes={project.nodes}
            edges={project.edges}
            blocks={project.blocks}
            scopes={project.scopes}
            className="h-33 border-b border-border"
          />
          <div className="flex flex-col gap-1 px-4 py-3">
            <span className="truncate text-sm font-semibold text-ink group-hover:text-copper-dark">
              {project.name}
            </span>
            {project.description && (
              <span className="line-clamp-2 text-xs text-ink-soft">{project.description}</span>
            )}
            <span className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
              <span>{forks.get(project.slug) ?? 0} forks</span>
              <span className="text-border-strong">&middot;</span>
              <span>{shortAgo(project.updatedAt)}</span>
            </span>
          </div>
        </CardLink>
      ))}
    </div>
  );
}

async function SolvedTab({ userId }: { userId: string }) {
  const solved = await listSolvedProblems(userId).catch(() => []);
  if (solved.length === 0) return <Empty>No accepted submissions yet.</Empty>;

  return (
    <Rail className="max-w-3xl">
      {solved.map((problem) => (
        <RailItem
          key={problem.slug}
          href={`/practices/${problem.slug}`}
          title={problem.title}
          meta={
            <span className="flex items-center gap-3">
              <DifficultyTag difficulty={problem.difficulty} />
              <span className="w-20 text-right font-mono">{shortAgo(problem.solvedAt)}</span>
            </span>
          }
        />
      ))}
    </Rail>
  );
}

async function ActivityTab({ userId }: { userId: string }) {
  const events = await listPersonActivity(userId).catch(() => []);
  if (events.length === 0) return <Empty>Nothing yet.</Empty>;

  return (
    <Rail className="max-w-3xl">
      {events.map((event, index) => (
        <RailItem
          key={`${event.href}-${event.at}-${index}`}
          href={event.href}
          title={
            <span>
              <span className="font-semibold capitalize">{event.verb}</span>
              <span className="text-ink-soft"> {event.detail}</span>
            </span>
          }
          meta={<span className="font-mono">{longAgo(event.at)}</span>}
        />
      ))}
    </Rail>
  );
}

async function PostsTab({ userId }: { userId: string }) {
  const posts = await listPersonPosts(userId).catch(() => []);
  if (posts.length === 0) return <Empty>No discussion posts yet.</Empty>;

  return (
    <Rail className="max-w-3xl">
      {posts.map((post, index) => (
        <RailItem
          key={`${post.href}-${index}`}
          href={post.href}
          title={post.heading}
          detail={post.body.split("\n")[0]}
          meta={<span className="font-mono text-copper-dark">{post.score}</span>}
        />
      ))}
    </Rail>
  );
}

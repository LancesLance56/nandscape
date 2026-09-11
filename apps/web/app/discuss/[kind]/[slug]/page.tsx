import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { DiscussionThread } from "@/components/community/discussion-thread";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  isDiscussionSort,
  kindFromSlug,
  listDiscussion,
  resolveTarget,
  type DiscussionSort,
} from "@/lib/community/discussions";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/cn";

/**
 * One discussion, addressed by what it is about.
 *
 * A single route for every kind rather than a Discuss tab bolted onto each
 * content page: the practice workspace in particular is a locked-viewport
 * split with its own scrolling, and threading a scrolling article column into
 * it would break the layout that makes a judge usable. The link back to the
 * content keeps the two reading as one thing.
 */

export const dynamic = "force-dynamic";

const SORTS: { id: DiscussionSort; label: string }[] = [
  { id: "hot", label: "Hot" },
  { id: "new", label: "New" },
  { id: "top", label: "Top" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string; slug: string }>;
}): Promise<Metadata> {
  const { kind: kindSegment, slug } = await params;
  const kind = kindFromSlug(kindSegment);
  if (!kind) return { title: "Discussion not found" };

  const target = await resolveTarget(kind, slug).catch(() => null);
  if (!target) return { title: "Discussion not found" };

  return buildContentMetadata({
    title: target.title,
    seoTitle: `${target.title}: Discussion on Nandscape`,
    seoDescription: `Questions, approaches and worked answers on ${target.title}.`,
    path: `/discuss/${kindSegment}/${slug}`,
    type: "website",
  });
}

export default async function DiscussPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const [{ kind: kindSegment, slug }, { sort: sortParam }] = await Promise.all([
    params,
    searchParams,
  ]);

  const kind = kindFromSlug(kindSegment);
  if (!kind) notFound();

  const target = await resolveTarget(kind, slug);
  if (!target) notFound();

  const sort: DiscussionSort = isDiscussionSort(sortParam) ? sortParam : "hot";

  const user = await getCurrentUser().catch(() => null);
  // The viewer is part of the query: each post carries whether *this* reader
  // has already voted on it, which is why this page is never cached across
  // readers.
  const posts = await listDiscussion(kind, slug, user?.id ?? null, sort).catch(() => []);

  const total = posts.reduce((sum, post) => sum + 1 + post.replies.length, 0);
  const standalone = kind === "GENERAL";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 sm:px-10">
        <p className="mb-3 font-mono text-[11px] text-slate">
          <Link href="/community/discussions" className="hover:text-copper-dark">
            Discussions
          </Link>
          {!standalone && <> / {target.breadcrumb}</>}
        </p>
        <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-ink">
          {target.title}
        </h1>

        {standalone ? (
          <p className="mb-6 text-sm text-ink-soft">
            A standalone thread. Answers are Markdown, and solutions can be hidden behind a click.
          </p>
        ) : (
          <p className="mb-6 text-sm text-ink-soft">
            Attached to this {target.label}.{" "}
            <Link href={target.href} className="text-copper-dark hover:underline">
              Open the {target.label}
            </Link>
            .
          </p>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <p className="text-[13px] text-slate">
            <span className="font-mono text-ink-soft">{total}</span> {total === 1 ? "post" : "posts"}
            {" · solutions are hidden until you ask for them"}
          </p>
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-surface-2 p-1">
            {SORTS.map((entry) => (
              <Link
                key={entry.id}
                href={`/discuss/${kindSegment}/${slug}?sort=${entry.id}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs transition-colors",
                  entry.id === sort
                    ? "bg-surface-card font-semibold text-ink"
                    : "font-medium text-ink-soft hover:text-ink",
                )}
              >
                {entry.label}
              </Link>
            ))}
          </div>
        </div>

        <DiscussionThread
          kind={kind}
          slug={slug}
          posts={posts}
          signedIn={Boolean(user)}
          canPost={Boolean(user?.emailVerified)}
        />
      </main>
      <Footer />
    </>
  );
}

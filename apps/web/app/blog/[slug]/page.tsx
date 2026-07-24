import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BlockRenderer } from "@/components/blog/blocks/block-renderer";
import { getPublishedPostBySlug, listPublishedPosts } from "@/lib/blog/posts";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await listPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} - Nandscape`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const date = formatDate(post.publishedAt);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 sm:px-10">
        <article>
          <header className="mb-8">
            <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-slate">
              {date && <span>{date}</span>}
              {post.authorName && (
                <>
                  <span className="text-border-strong">·</span>
                  <span>{post.authorName}</span>
                </>
              )}
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight text-ink lg:text-4xl">{post.title}</h1>
          </header>

          {post.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt=""
              className="mb-8 w-full rounded-2xl border border-border object-cover"
            />
          )}

          <BlockRenderer blocks={post.body} />
        </article>
      </main>
    </>
  );
}

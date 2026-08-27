import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BlockRenderer } from "@/components/content/blocks/block-renderer";
import { ArticleShell, ArticleMeta } from "@/components/content/article-shell";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { readingTimeLabel } from "@/lib/content/reading-time";
import { getPublishedPostBySlug, listPublishedPosts } from "@/lib/blog/posts";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Runs at build time, when the DB may not be reachable (e.g. building the
  // Docker image before postgres is networked in) - fall back to generating
  // no static params rather than failing the whole build. Pages still render
  // fine on demand; they just won't be pre-built.
  try {
    const posts = await listPublishedPosts();
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};

  return buildContentMetadata({
    title: post.title,
    seoTitle: post.seoTitle,
    excerpt: post.excerpt,
    seoDescription: post.seoDescription,
    keywords: post.keywords,
    path: `/blog/${post.slug}`,
    coverImage: post.coverImage,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    authorName: post.authorName,
  });
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
      <main className="mx-auto max-w-3xl px-6 pb-28 pt-32 sm:px-10">
        <ArticleJsonLd
          headline={post.title}
          description={post.seoDescription ?? post.excerpt}
          path={`/blog/${post.slug}`}
          publishedAt={post.publishedAt}
          updatedAt={post.updatedAt}
          authorName={post.authorName}
          image={post.coverImage}
          keywords={post.keywords}
        />
        <BreadcrumbJsonLd
          items={[
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]}
        />

        <ArticleShell
          title={post.title}
          lede={post.excerpt ?? undefined}
          meta={<ArticleMeta items={[date, post.authorName, readingTimeLabel(post.body)]} />}
          cover={
            post.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.coverImage}
                alt=""
                className="w-full rounded-2xl border border-border object-cover"
              />
            )
          }
        >
          <BlockRenderer blocks={post.body} />
        </ArticleShell>
      </main>
      <Footer />
    </>
  );
}

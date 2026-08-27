import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BlockRenderer } from "@/components/content/blocks/block-renderer";
import { ArticleShell, ArticleMeta } from "@/components/content/article-shell";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { readingTimeLabel } from "@/lib/content/reading-time";
import { getPublishedTutorialPageBySlug, listTutorialPages } from "@/lib/tutorials/tutorials";
import { getTrackSlugForPage, getTutorialTrackBySlug } from "@/lib/tutorials/tutorial-tracks";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ track: string; slug: string }>;
}

export async function generateStaticParams() {
  // Runs at build time, when the DB may not be reachable (e.g. building the
  // Docker image before postgres is networked in) - fall back to generating
  // no static params rather than failing the whole build.
  try {
    const pages = await listTutorialPages();
    const published = pages.filter((p) => p.status === "published");
    const params = await Promise.all(
      published.map(async (p) => {
        const track = await getTrackSlugForPage(p.slug);
        return track ? { track, slug: p.slug } : null;
      }),
    );
    return params.filter((p): p is { track: string; slug: string } => p !== null);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { track, slug } = await params;
  const page = await getPublishedTutorialPageBySlug(slug);
  if (!page) return {};

  return buildContentMetadata({
    title: page.title,
    seoTitle: page.seoTitle,
    excerpt: page.excerpt,
    seoDescription: page.seoDescription,
    keywords: page.keywords,
    path: `/tutorials/${track}/${page.slug}`,
    suffix: "Nandscape Tutorials",
    coverImage: page.coverImage,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
    authorName: page.authorName,
  });
}

export default async function TutorialPage({ params }: PageProps) {
  const { track, slug } = await params;

  const page = await getPublishedTutorialPageBySlug(slug);
  if (!page) notFound();

  // A lesson has exactly one correct URL. Reaching it under the wrong
  // track would otherwise serve identical content on two paths, which is
  // duplicate content as far as a crawler is concerned - send it to the
  // canonical one instead.
  const realTrack = await getTrackSlugForPage(slug);
  if (realTrack && realTrack !== track) permanentRedirect(`/tutorials/${realTrack}/${slug}`);

  const trackRecord = realTrack ? await getTutorialTrackBySlug(realTrack) : null;
  const path = `/tutorials/${track}/${page.slug}`;
  const updated = formatDate(page.updatedAt);

  return (
    <>
      {/* TechArticle rather than Article: these are step-by-step
          explanations of how something works, which is what the subtype is
          for. */}
      <ArticleJsonLd
        type="TechArticle"
        headline={page.title}
        description={page.seoDescription ?? page.excerpt}
        path={path}
        publishedAt={page.publishedAt}
        updatedAt={page.updatedAt}
        authorName={page.authorName}
        image={page.coverImage}
        keywords={page.keywords}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Tutorials", path: "/tutorials" },
          ...(trackRecord ? [{ name: trackRecord.title, path: `/tutorials/${trackRecord.slug}` }] : []),
          { name: page.title, path },
        ]}
      />

      <ArticleShell
        // Lessons run wider than a blog post - the layout column already
        // caps and centres them (max-w-5xl), so the shell shouldn't also
        // clamp to its default reading measure.
        className="max-w-none"
        title={page.title}
        lede={page.excerpt ?? undefined}
        breadcrumb={
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate">
            <Link href="/tutorials" className="hover:text-copper-dark">
              Tutorials
            </Link>
            {trackRecord && (
              <>
                <span className="mx-1.5 text-border-strong">/</span>
                <Link href={`/tutorials/${trackRecord.slug}`} className="hover:text-copper-dark">
                  {trackRecord.title}
                </Link>
              </>
            )}
          </nav>
        }
        meta={<ArticleMeta items={[updated && `Updated ${updated}`, readingTimeLabel(page.body)]} />}
      >
        <BlockRenderer blocks={page.body} />
      </ArticleShell>
    </>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

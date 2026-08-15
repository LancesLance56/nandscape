import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/content/blocks/block-renderer";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { buildContentMetadata } from "@/lib/seo/metadata";
import { getPublishedTutorialPageBySlug, listTutorialPages } from "@/lib/tutorials/tutorials";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Runs at build time, when the DB may not be reachable (e.g. building the
  // Docker image before postgres is networked in) - fall back to generating
  // no static params rather than failing the whole build.
  try {
    const pages = await listTutorialPages();
    return pages.filter((p) => p.status === "published").map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedTutorialPageBySlug(slug);
  if (!page) return {};

  return buildContentMetadata({
    title: page.title,
    seoTitle: page.seoTitle,
    excerpt: page.excerpt,
    seoDescription: page.seoDescription,
    keywords: page.keywords,
    path: `/tutorials/${page.slug}`,
    suffix: "Nandscape Tutorials",
    coverImage: page.coverImage,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
    authorName: page.authorName,
  });
}

export default async function TutorialPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPublishedTutorialPageBySlug(slug);
  if (!page) notFound();

  const path = `/tutorials/${page.slug}`;

  return (
    <article>
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
          { name: page.title, path },
        ]}
      />
      <h1 className="font-display text-3xl font-bold leading-tight text-ink">{page.title}</h1>
      <div className="mt-8">
        <BlockRenderer blocks={page.body} />
      </div>
    </article>
  );
}
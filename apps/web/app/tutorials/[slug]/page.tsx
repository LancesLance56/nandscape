import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/content/blocks/block-renderer";
import { getPublishedTutorialPageBySlug, listTutorialPages } from "@/lib/tutorials/tutorials";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const pages = await listTutorialPages();
  return pages.filter((p) => p.status === "published").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedTutorialPageBySlug(slug);
  if (!page) return {};

  return {
    title: `${page.title} - Nandscape Tutorials`,
    description: page.excerpt ?? undefined,
  };
}

export default async function TutorialPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPublishedTutorialPageBySlug(slug);
  if (!page) notFound();

  return (
    <article>
      <h1 className="font-display text-3xl font-bold leading-tight text-ink">{page.title}</h1>
      {page.excerpt && <p className="mt-2 text-base text-ink-soft">{page.excerpt}</p>}
      <div className="mt-8">
        <BlockRenderer blocks={page.body} />
      </div>
    </article>
  );
}
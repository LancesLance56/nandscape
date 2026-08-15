import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getTutorialPageBySlug } from "@/lib/tutorials/tutorials";
import { listTutorialSections } from "@/lib/tutorials/tutorial-sections";
import { ArticleEditor } from "@/components/blog-editor/article-editor";
import { toIsoStringOrNull, type DocumentMetadata } from "@/lib/blog-editor/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditTutorialPagePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const { slug } = await params;
  const isNew = slug === "new";
  const [page, sections] = await Promise.all([
    isNew ? Promise.resolve(null) : getTutorialPageBySlug(slug),
    listTutorialSections(),
  ]);
  if (!isNew && !page) notFound();

  const initialMetadata: DocumentMetadata | undefined = page
    ? {
        slug: page.slug,
        title: page.title,
        excerpt: page.excerpt ?? "",
        coverImage: page.coverImage ?? "",
        authorName: page.authorName ?? "",
        status: page.status,
        tags: page.tags,
        seoTitle: page.seoTitle ?? "",
        seoDescription: page.seoDescription ?? "",
        keywords: page.keywords,
        publishedAt: toIsoStringOrNull(page.publishedAt),
        sectionId: page.sectionId,
        position: page.position,
      }
    : undefined;

  return (
    <ArticleEditor
      documentKind="tutorial"
      originalSlug={page?.slug ?? null}
      initialMetadata={initialMetadata}
      initialBlocks={page?.body}
      sections={sections}
    />
  );
}

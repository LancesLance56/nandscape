import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPostBySlug } from "@/lib/blog/posts";
import { ArticleEditor } from "@/components/blog-editor/article-editor";
import { toIsoStringOrNull, type DocumentMetadata } from "@/lib/blog-editor/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const { slug } = await params;
  const isNew = slug === "new";
  const post = isNew ? null : await getPostBySlug(slug);
  if (!isNew && !post) notFound();

  const initialMetadata: DocumentMetadata | undefined = post
    ? {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? "",
        coverImage: post.coverImage ?? "",
        authorName: post.authorName ?? "",
        status: post.status,
        tags: post.tags,
        publishedAt: toIsoStringOrNull(post.publishedAt),
        sectionId: null,
        position: 0,
      }
    : undefined;

  return (
    <ArticleEditor
      documentKind="post"
      originalSlug={post?.slug ?? null}
      initialMetadata={initialMetadata}
      initialBlocks={post?.body}
    />
  );
}

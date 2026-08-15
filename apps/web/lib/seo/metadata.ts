import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import type { SeoFields } from "@/types/blog";

/** Google truncates the <title> around 60 characters and the meta
 *  description around 160. These aren't hard limits (it rewrites both
 *  freely), they're the point past which the tail stops being shown - so
 *  they're the budget the seed content is written against, not something to
 *  silently truncate at runtime. See
 *  https://developers.google.com/search/docs/appearance/title-link */
export const MAX_TITLE_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 160;

export interface ContentMetadataInput extends Partial<SeoFields> {
  /** The on-page H1. Used as the <title> when no seoTitle is set. */
  title: string;
  /** Listing/card copy. Used as the meta description when no
   *  seoDescription is set. */
  excerpt?: string | null;
  /** Site-root-relative, e.g. "/tutorials/graph-bfs-dfs". Becomes the
   *  canonical URL, which the SEO audit flagged as missing: without it,
   *  every query-string variant of a URL (?ref=, utm_*, and the trailing
   *  slash form) is a separate, competing page as far as a crawler is
   *  concerned. */
  path: string;
  /** Appended after the title when composing a fallback. */
  suffix?: string;
  coverImage?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string | null;
  /** "article" for a post/tutorial, "website" for a listing page. */
  type?: "article" | "website";
}

/**
 * One place that turns a piece of content into its full tag set: title,
 * description, canonical, Open Graph and Twitter cards. Every page that
 * renders DB-backed content should go through this rather than hand-rolling
 * a Metadata object, so a fix (or a new tag) lands everywhere at once.
 */
export function buildContentMetadata(input: ContentMetadataInput): Metadata {
  const {
    title,
    seoTitle,
    excerpt,
    seoDescription,
    keywords,
    path,
    suffix = "Nandscape",
    coverImage,
    publishedAt,
    updatedAt,
    authorName,
    type = "article",
  } = input;

  const metaTitle = seoTitle?.trim() || `${title} | ${suffix}`;
  const description = seoDescription?.trim() || excerpt?.trim() || undefined;
  const canonical = `${siteUrl()}${path}`;
  const images = coverImage ? [coverImage] : undefined;

  return {
    title: metaTitle,
    description,
    // Emitted for schema.org `keywords` and as an editorial record of what
    // each page targets. The <meta name="keywords"> tag itself has been
    // ignored by Google since 2009, so it is deliberately not rendered:
    // https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag
    alternates: { canonical },
    openGraph: {
      type,
      url: canonical,
      title: metaTitle,
      description,
      siteName: "Nandscape",
      images,
      ...(type === "article"
        ? {
            publishedTime: publishedAt ?? undefined,
            modifiedTime: updatedAt ?? undefined,
            authors: authorName ? [authorName] : undefined,
            tags: keywords && keywords.length > 0 ? keywords : undefined,
          }
        : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: metaTitle,
      description,
      images,
    },
  };
}

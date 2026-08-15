import { siteUrl } from "@/lib/site-url";

/**
 * Structured data, which the SEO audit flagged as missing. Rendered as a
 * JSON-LD <script>, the format Google explicitly recommends over microdata
 * or RDFa: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
 *
 * This is what makes a result eligible for rich presentation (breadcrumb
 * trails, article bylines and dates) instead of a bare blue link. It's
 * dangerouslySetInnerHTML because that's the only way to emit a raw
 * <script> body in React - the payload is our own serialized object, never
 * user input, and JSON.stringify escapes the content anyway.
 */
function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // `</script>` inside a string would otherwise close this tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export interface ArticleJsonLdProps {
  headline: string;
  description?: string | null;
  /** Site-root-relative, e.g. "/blog/some-post". */
  path: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string | null;
  image?: string | null;
  keywords?: string[];
  /** TechArticle is the better fit for a how-it-works tutorial; plain
   *  Article for a blog post. Both are valid Article subtypes. */
  type?: "Article" | "TechArticle";
}

export function ArticleJsonLd({
  headline,
  description,
  path,
  publishedAt,
  updatedAt,
  authorName,
  image,
  keywords,
  type = "Article",
}: ArticleJsonLdProps) {
  const base = siteUrl();
  const url = `${base}${path}`;

  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": type,
        headline,
        ...(description ? { description } : {}),
        // Tells Google which URL this markup describes, matching the
        // canonical tag rather than whatever URL the crawler arrived on.
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        url,
        ...(image ? { image: [image] } : {}),
        ...(publishedAt ? { datePublished: publishedAt } : {}),
        ...(updatedAt ? { dateModified: updatedAt } : {}),
        author: { "@type": authorName ? "Person" : "Organization", name: authorName || "Nandscape" },
        publisher: {
          "@type": "Organization",
          name: "Nandscape",
          url: base,
        },
        ...(keywords && keywords.length > 0 ? { keywords: keywords.join(", ") } : {}),
      }}
    />
  );
}

export interface Breadcrumb {
  name: string;
  /** Site-root-relative. */
  path: string;
}

/** Turns the trail into the breadcrumb line Google shows above a result in
 *  place of the raw URL. */
export function BreadcrumbJsonLd({ items }: { items: Breadcrumb[] }) {
  const base = siteUrl();

  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${base}${item.path}`,
        })),
      }}
    />
  );
}

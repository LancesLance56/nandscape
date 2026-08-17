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

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * FAQPage markup for the tool pages.
 *
 * Worth having because these questions ("how do you group a K-map?", "what
 * is a don't-care?") are things people type into a search box verbatim, and
 * an FAQ block is one of the few structured-data types that can put the
 * answer directly on the results page. The questions have to be genuinely
 * answered in the visible page content, which is why the tool page renders
 * the same list it passes here rather than hiding it in a script tag.
 */
export function FaqJsonLd({ entries }: { entries: FaqEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: entries.map((e) => ({
          "@type": "Question",
          name: e.question,
          acceptedAnswer: { "@type": "Answer", text: e.answer },
        })),
      }}
    />
  );
}

/** Marks a tool page as a usable web application rather than an article. */
export function SoftwareAppJsonLd({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name,
        description,
        url: `${siteUrl()}${path}`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any",
        // Free and browser-based, which is what people filter for when they
        // search "<thing> calculator online free".
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }}
    />
  );
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

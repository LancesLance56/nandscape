import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ArticleShellProps {
  title: string;
  /** One-line standfirst under the title. Usually the post/page excerpt. */
  lede?: string;
  /** The date · author · reading-time row. Rendered in small muted type. */
  meta?: ReactNode;
  /** Anything above the title: a breadcrumb nav, a kicker. */
  breadcrumb?: ReactNode;
  /** A cover image / media element, shown between the header and the body. */
  cover?: ReactNode;
  /** The article body - a <BlockRenderer/>, which supplies its own
   *  `.article-prose` rhythm and reading measure. */
  children: ReactNode;
  className?: string;
}

/**
 * The shared header + reading-width frame for a long-form article (a blog
 * post or a tutorial lesson). It owns the title scale, the standfirst, the
 * byline row and the rule that separates all of that from the body; the body
 * itself owns its own spacing via `.article-prose`.
 */
export function ArticleShell({
  title,
  lede,
  meta,
  breadcrumb,
  cover,
  children,
  className,
}: ArticleShellProps) {
  return (
    <article className={cn("mx-auto w-full max-w-[72ch]", className)}>
      <header>
        {breadcrumb}
        <h1 className="text-balance font-display text-3xl font-bold leading-tight text-ink lg:text-4xl">
          {title}
        </h1>
        {meta && (
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">{meta}</div>
        )}
        {lede && <p className="mt-5 text-pretty text-lg leading-relaxed text-ink-soft">{lede}</p>}
        {cover && <div className="mt-8">{cover}</div>}
      </header>

      <hr className="mt-8 mb-10 border-border" />

      {children}
    </article>
  );
}

/** A "·"-separated meta row, so both article routes render the byline the
 *  same way. Falsy entries are dropped. */
export function ArticleMeta({ items }: { items: Array<ReactNode | null | undefined | false> }) {
  const shown = items.filter(Boolean);
  return (
    <>
      {shown.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-border-strong">·</span>}
          {item}
        </span>
      ))}
    </>
  );
}

import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import {
  HEADING_BASE_CLASS,
  HEADING_LEVEL_CLASSES,
  headingAnchorId,
} from "@/components/content/blocks/heading-block";
import {
  CALLOUT_FRAME_CLASS,
  CALLOUT_TONES,
} from "@/components/content/blocks/callout-block";
import { LIST_BASE_CLASS, LIST_ITEM_CLASS } from "@/components/content/blocks/list-block";
import { PARAGRAPH_CLASS } from "@/components/content/blocks/paragraph-block";
import { TableFrame, TableScroll, tableClasses } from "@/components/ui/table-frame";
import { cn } from "@/lib/cn";

/**
 * Every Markdown element except the code fence.
 *
 * Split out from the renderer so the published view and the live preview draw
 * from one map. The fence is the only element that differs: the published view
 * highlights it through the Shiki singleton, which is server-only, and the
 * preview runs in the browser. Nothing in this file may import that singleton,
 * directly or transitively, or the preview stops being able to load it.
 *
 * Giving every element a class is not decoration, it is the whole reason a
 * component map exists. Tailwind's preflight resets headings to body size and
 * strips list markers, and `.article-prose` only supplies vertical rhythm; the
 * site's visual treatment lives on the block components. So a bare `<h3>` or
 * `<ul>` out of Markdown is *correct HTML that looks like a paragraph*, which
 * reads exactly like "### and - do nothing".
 *
 * The classes are imported from those block components rather than copied, so
 * a Markdown `##` and a heading block are the same thing on the page, and stay
 * that way when one of them is restyled.
 */
export const markdownElements: Components = {
  h1: (props) => <Heading level={1} {...props} />,
  h2: (props) => <Heading level={2} {...props} />,
  h3: (props) => <Heading level={3} {...props} />,
  h4: (props) => <Heading level={4} {...props} />,
  // Markdown allows deeper levels than the block system defines; they clamp to
  // the smallest rather than falling back to unstyled.
  h5: (props) => <Heading level={4} {...props} />,
  h6: (props) => <Heading level={4} {...props} />,

  p: ({ children }) => <p className={PARAGRAPH_CLASS}>{children}</p>,

  ul: ({ children }) => <ul className={cn(LIST_BASE_CLASS, "list-disc")}>{children}</ul>,
  ol: ({ children }) => <ol className={cn(LIST_BASE_CLASS, "list-decimal")}>{children}</ol>,
  li: ({ children }) => <li className={LIST_ITEM_CLASS}>{children}</li>,

  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-slate line-through">{children}</del>,
  hr: () => <hr className="border-border" />,

  a: ({ href, children }) => (
    <a
      href={href}
      className="text-copper-dark underline underline-offset-2 dark:text-copper"
      // Discussion links are reader-supplied. noreferrer keeps the destination
      // from learning which thread sent the visitor, and nofollow keeps a
      // comment box from being worth spamming for ranking.
      rel="nofollow noreferrer"
    >
      {children}
    </a>
  ),

  // GFM task lists. The parser emits a disabled checkbox, and preflight strips
  // its appearance - so without this a `- [x]` shows an empty box whether or
  // not it is ticked, which inverts the meaning of half of them.
  input: ({ checked, type }) =>
    type === "checkbox" ? (
      <input
        type="checkbox"
        checked={Boolean(checked)}
        readOnly
        className="mr-2 h-3.5 w-3.5 -translate-y-px accent-copper align-middle"
      />
    ) : null,

  sup: ({ children }) => (
    <sup className="ml-0.5 font-mono text-[0.7em] text-copper-dark">{children}</sup>
  ),

  // GFM footnotes land in a trailing <section>; the list inside it is already
  // styled by the `ol` entry above.
  section: ({ children, className }) =>
    className?.includes("footnotes") ? (
      <section className="mt-8 border-t border-border pt-4 text-sm text-slate">{children}</section>
    ) : (
      <section>{children}</section>
    ),

  // A `>` quote reads as an aside, which on this site is a callout - so it
  // gets the neutral tone's filled grey box rather than a bare left rule.
  blockquote: ({ children }) => (
    <blockquote className={cn(CALLOUT_FRAME_CLASS, CALLOUT_TONES.note.wrapper)}>
      <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed text-ink-soft">
        {children}
      </div>
    </blockquote>
  ),

  table: ({ children }) => (
    <TableFrame>
      <TableScroll>
        <table className={tableClasses.table}>{children}</table>
      </TableScroll>
    </TableFrame>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tr: ({ children }) => <tr className={tableClasses.row}>{children}</tr>,
  th: ({ children }) => <th className={tableClasses.th}>{children}</th>,
  td: ({ children }) => <td className={tableClasses.td}>{children}</td>,

  // A fenced block arrives as <pre><code/>. Both renderers replace the <code>
  // with a block-level box, so the <pre> would only nest a second one.
  pre: ({ children }) => <>{children}</>,
};

/** The frame a fenced code block sits in, shared by both renderers. */
export const CODE_FRAME_CLASS =
  "not-prose block overflow-hidden rounded-xl border border-border bg-surface-2 font-mono text-sm";

/** The inline `code` span, shared by both renderers. */
export const INLINE_CODE_CLASS =
  "rounded bg-surface-3 px-1 py-0.5 font-mono text-[0.9em] text-ink";

/** Headings carry the same anchor ids as heading blocks, so deep links work. */
function Heading({ level, children }: { level: 1 | 2 | 3 | 4; children?: ReactNode }) {
  const Tag = `h${level}` as const;
  const text = typeof children === "string" ? children : extractText(children);

  return (
    <Tag
      id={text ? headingAnchorId(text) : undefined}
      className={cn(HEADING_BASE_CLASS, HEADING_LEVEL_CLASSES[level])}
    >
      {children}
    </Tag>
  );
}

/** Heading text can arrive as nested nodes (`## Some \`code\` here`). */
export function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/** Pulls the language out of react-markdown's `language-xxx` class. */
export function fenceLanguage(className?: string): string | undefined {
  return /language-(\w+)/.exec(className ?? "")?.[1];
}

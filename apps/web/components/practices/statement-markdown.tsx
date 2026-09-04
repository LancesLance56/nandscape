import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { highlight } from "@/components/content/blocks/code-block";
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
 * A problem statement, written as Markdown.
 *
 * Every element is given a class here, and that is not decoration - it is the
 * whole reason the renderer needs a component map at all. Tailwind's preflight
 * resets headings to body size and strips list markers, and `.article-prose`
 * only supplies vertical rhythm; the site's visual treatment lives on the
 * block components, which each carry their own classes. So a bare `<h3>` or
 * `<ul>` out of Markdown is *correct HTML that looks like a paragraph* - which
 * reads exactly like "### and - do nothing".
 *
 * The classes are imported from those block components rather than copied, so
 * a Markdown `##` and a heading block are the same thing on the page, and stay
 * that way when one of them is restyled.
 *
 * A Server Component, which is what makes highlighting cheap: the Shiki
 * singleton's `codeToHtml` is synchronous once the highlighter exists, so a
 * fenced block is coloured inline while the tree renders - no client pass, no
 * flash of unhighlighted code - through the same `highlight()` the blog uses.
 */
export function StatementMarkdown({ source }: { source: string }) {
  if (!source.trim()) return null;

  return (
    <div className="article-prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <Heading level={1} {...props} />,
          h2: (props) => <Heading level={2} {...props} />,
          h3: (props) => <Heading level={3} {...props} />,
          h4: (props) => <Heading level={4} {...props} />,
          // Markdown allows deeper levels than the block system defines; they
          // clamp to the smallest rather than falling back to unstyled.
          h5: (props) => <Heading level={4} {...props} />,
          h6: (props) => <Heading level={4} {...props} />,

          p: ({ children }) => <p className={PARAGRAPH_CLASS}>{children}</p>,

          ul: ({ children }) => (
            <ul className={cn(LIST_BASE_CLASS, "list-disc")}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className={cn(LIST_BASE_CLASS, "list-decimal")}>{children}</ol>
          ),
          li: ({ children }) => <li className={LIST_ITEM_CLASS}>{children}</li>,

          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="border-border" />,

          a: ({ href, children }) => (
            <a
              href={href}
              className="text-copper-dark underline underline-offset-2 dark:text-copper"
            >
              {children}
            </a>
          ),

          // A `>` quote reads as an aside, which on this site is a callout -
          // so it gets the neutral tone's filled grey box rather than a bare
          // left rule. Same frame and colours as a note callout block.
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

          code(props) {
            // `node` is react-markdown's mdast node, not a DOM attribute -
            // spreading it onto <code> rendered a literal node="[object Object]".
            const { className, children, ...rest } = props;
            delete (rest as { node?: unknown }).node;
            const language = /language-(\w+)/.exec(className ?? "")?.[1];

            // No language class means an inline span, not a fenced block.
            if (!language) {
              return (
                <code
                  className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[0.9em] text-ink"
                  {...rest}
                >
                  {children}
                </code>
              );
            }

            const code = String(children).replace(/\n$/, "");
            return (
              <span
                className="not-prose block overflow-hidden rounded-xl border border-border bg-surface-2 font-mono text-sm"
                dangerouslySetInnerHTML={{ __html: highlight(code, language) }}
              />
            );
          },

          // A fenced block arrives as <pre><code/>. The replacement above is
          // already a block-level box, so the <pre> would only nest a second
          // one - unwrap it and let the box sit directly in the prose flow.
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}

/** Headings carry the same anchor ids as heading blocks, so deep links work. */
function Heading({
  level,
  children,
}: {
  level: 1 | 2 | 3 | 4;
  children?: ReactNode;
}) {
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
function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { highlight } from "@/components/content/blocks/code-block";
import {
  CODE_FRAME_CLASS,
  INLINE_CODE_CLASS,
  fenceLanguage,
  markdownElements,
} from "@/components/content/markdown-elements";
import { cn } from "@/lib/cn";

/**
 * Markdown, rendered in the site's own voice.
 *
 * One renderer for every published Markdown surface: problem statements and
 * discussion posts both come through here, so there is a single dialect to
 * learn and a single place to extend. GFM is always on, which buys tables,
 * task lists, strikethrough, footnotes and autolinked URLs.
 *
 * A Server Component, which is what makes highlighting cheap: the Shiki
 * singleton's `codeToHtml` is synchronous once the highlighter exists, so a
 * fenced block is coloured inline while the tree renders - no client pass, no
 * flash of unhighlighted code - through the same `highlight()` the blog uses.
 * The live preview in the composer is the client-side twin of this, in
 * `markdown-preview.tsx`, and shares every element but the fence.
 */
export function MarkdownProse({
  source,
  softBreaks = false,
  className,
}: {
  source: string;
  /**
   * Treat a single newline as a line break.
   *
   * Off for authored content, where the Markdown convention (a blank line
   * starts a paragraph) is what the author expects. On for discussion posts,
   * where people type the way they type everywhere else and a hard-wrapped
   * paragraph would otherwise collapse into one run-on line.
   */
  softBreaks?: boolean;
  className?: string;
}) {
  if (!source.trim()) return null;

  return (
    <div className={cn("article-prose", className)}>
      <Markdown
        remarkPlugins={softBreaks ? [remarkGfm, remarkBreaks] : [remarkGfm]}
        components={{
          ...markdownElements,
          code(props) {
            // `node` is react-markdown's mdast node, not a DOM attribute -
            // spreading it onto <code> rendered a literal node="[object Object]".
            const { className: codeClass, children, ...rest } = props;
            delete (rest as { node?: unknown }).node;
            const language = fenceLanguage(codeClass);

            // No language class means an inline span, not a fenced block.
            if (!language) {
              return (
                <code className={INLINE_CODE_CLASS} {...rest}>
                  {children}
                </code>
              );
            }

            const code = String(children).replace(/\n$/, "");

            // The singleton registers a fixed language list (lib/shiki.ts), so
            // a fence in anything outside it makes codeToHtml throw. This runs
            // during the server render, so an unguarded throw fails the entire
            // page rather than one code block.
            let highlighted: string | null = null;
            try {
              highlighted = highlight(code, language);
            } catch {
              highlighted = null;
            }

            if (highlighted === null) {
              // Plain text through React, which escapes it. Never through
              // dangerouslySetInnerHTML on a value we did not just build.
              return (
                <span className={CODE_FRAME_CLASS}>
                  <code className="block overflow-x-auto p-4 text-ink">{code}</code>
                </span>
              );
            }

            return (
              <span className={CODE_FRAME_CLASS} dangerouslySetInnerHTML={{ __html: highlighted }} />
            );
          },
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}

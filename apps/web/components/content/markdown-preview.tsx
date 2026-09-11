"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  CODE_FRAME_CLASS,
  INLINE_CODE_CLASS,
  fenceLanguage,
  markdownElements,
} from "@/components/content/markdown-elements";
import { cn } from "@/lib/cn";

/**
 * The live preview twin of `MarkdownProse`.
 *
 * Every element comes from the same map, so what an author sees while typing
 * is what the post will look like. The one deliberate difference is the code
 * fence: highlighting runs through the Shiki singleton, which is server-only
 * and several hundred kilobytes, and shipping it to colour a draft nobody has
 * posted yet is not worth it. A fence previews in plain mono on the same
 * frame, and gains its colours when the post is published.
 */
export function MarkdownPreview({
  source,
  softBreaks = true,
  className,
}: {
  source: string;
  softBreaks?: boolean;
  className?: string;
}) {
  if (!source.trim()) {
    return <p className="text-sm text-slate">Nothing to preview yet.</p>;
  }

  return (
    <div className={cn("article-prose", className)}>
      <Markdown
        remarkPlugins={softBreaks ? [remarkGfm, remarkBreaks] : [remarkGfm]}
        components={{
          ...markdownElements,
          code(props) {
            const { className: codeClass, children, ...rest } = props;
            delete (rest as { node?: unknown }).node;

            if (!fenceLanguage(codeClass)) {
              return (
                <code className={INLINE_CODE_CLASS} {...rest}>
                  {children}
                </code>
              );
            }

            return (
              <span className={CODE_FRAME_CLASS}>
                <code className="block overflow-x-auto p-4 text-ink">
                  {String(children).replace(/\n$/, "")}
                </code>
              </span>
            );
          },
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}

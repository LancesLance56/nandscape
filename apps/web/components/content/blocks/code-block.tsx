import { highlighter } from "@/lib/shiki";
import type { CodeBlock } from "@/types/blog";
import { cn } from "@/lib/cn";
import { languageLabel, shikiOptions } from "@/lib/shiki-code";
import { CodeTabs, type RenderedVariant } from "./code-tabs";

/**
 * Highlight one snippet with the site's shared contract (lib/shiki-code.ts),
 * through the server-only singleton. `codeToHtml` is synchronous once the
 * highlighter exists, which is what lets the Markdown renderer call it from
 * inside a React tree.
 */
export function highlight(code: string, language: string): string {
  return highlighter.codeToHtml(code, shikiOptions(language));
}

export async function CodeBlockView({
  block,
}: {
  block: CodeBlock & { className?: string };
}) {
  const primary = { language: block.language || "text", code: block.code };
  const extras = (block.variants ?? []).filter((v) => typeof v?.code === "string" && v.code.length > 0);

  // Single-language blocks keep the original chrome: a plain label strip, no
  // tabs to click, which is what most snippets on the site still are.
  if (extras.length === 0) {
    const html = highlight(primary.code, primary.language);
    return (
      <div className={cn("not-prose overflow-hidden rounded-xl border border-border bg-surface-2", block.className)}>
        {block.language && (
          <div className="border-b border-border px-4 py-1.5 font-mono text-[11px] text-slate">{block.language}</div>
        )}
        <div className="font-mono text-sm" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  const rendered: RenderedVariant[] = [primary, ...extras].map((v) => ({
    language: v.language,
    label: languageLabel(v.language),
    html: highlight(v.code, v.language),
  }));

  return <CodeTabs variants={rendered} className={block.className} />;
}

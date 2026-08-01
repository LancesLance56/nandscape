import { highlighter } from "@/lib/shiki";
import type { CodeBlock } from "@/types/blog";

export async function CodeBlockView({
  block,
}: {
  block: CodeBlock;
}) {
  const html = highlighter.codeToHtml(block.code, {
    lang: block.language || "text",
    theme: "github-dark",
    transformers: [
      {
        pre(node) {
          node.properties.class = "overflow-x-auto p-4";
          node.properties.style =
            "background: transparent; margin: 0;";
        },
      },
    ],
  });

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border bg-surface-2">
      {block.language && (
        <div className="border-b border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate">
          {block.language}
        </div>
      )}

      <div
        className="font-mono text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
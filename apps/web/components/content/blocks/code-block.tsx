import { highlighter } from "@/lib/shiki";
import type { CodeBlock } from "@/types/blog";
import { cn } from "@/lib/cn";

export async function CodeBlockView({
  block,
}: {
  block: CodeBlock & { className?: string };
}) {
  const html = highlighter.codeToHtml(block.code, {
    lang: block.language || "text",
    theme: "dark-plus",
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
    <div
      className={cn(
        "my-2 overflow-hidden rounded-xl border border-border bg-surface-2 m-auto w-[90%]",
        block.className,
      )}
    >
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

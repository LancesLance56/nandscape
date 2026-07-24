import type { CodeBlock } from "@/types/blog";

export function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border bg-surface-2">
      {block.language && (
        <div className="border-b border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate">
          {block.language}
        </div>
      )}
      <pre className="overflow-x-auto p-4">
        <code className="font-mono text-sm text-ink">{block.code}</code>
      </pre>
    </div>
  );
}

import type { TableBlock } from "@/types/blog";
import { cn } from "@/lib/cn";

export function TableBlockView({ block }: { block: TableBlock & { className?: string } }) {
  const { headers, rows, caption } = block;

  return (
    <div className={cn("my-2 overflow-hidden rounded-xl border border-border", block.className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {headers && headers.length > 0 && (
            <thead>
              <tr className="bg-surface-2">
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="border-b border-border px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-slate"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i > 0 || (headers && headers.length > 0) ? "border-t border-border" : undefined}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {caption && (
        <div className="border-t border-border px-3 py-1.5 text-xs text-slate">{caption}</div>
      )}
    </div>
  );
}

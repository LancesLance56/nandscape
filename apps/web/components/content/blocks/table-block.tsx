import type { TableBlock } from "@/types/blog";
import { TableFrame, TableScroll, tableClasses } from "@/components/ui/table-frame";

export function TableBlockView({ block }: { block: TableBlock & { className?: string } }) {
  const { headers, rows, caption } = block;
  const hasHeaders = Boolean(headers && headers.length > 0);

  return (
    <TableFrame className={block.className}>
      <TableScroll>
      <table className={tableClasses.table}>
        {hasHeaders && (
          <thead>
            <tr className={tableClasses.headRow}>
              {headers!.map((header, i) => (
                <th key={i} className={tableClasses.th}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i > 0 || hasHeaders ? tableClasses.row : undefined}>
              {row.map((cell, j) => (
                <td key={j} className={tableClasses.td}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </TableScroll>

      {caption && (
        <div className="border-t border-border px-3 py-1.5 text-xs text-slate">{caption}</div>
      )}
    </TableFrame>
  );
}

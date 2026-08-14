import type { TableBlock } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

const cellInputClass =
  "w-full min-w-28 rounded-md border border-border-strong bg-surface-card px-2 py-1 text-sm text-ink outline-none focus:border-copper";

const gridButtonClass =
  "rounded-md border border-border-strong px-2 py-1 text-xs text-slate transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30";

/**
 * `block.headers`'s presence, not a separate stored flag, is the header-row
 * toggle (see the TableBlock doc comment in types/content-block.ts) - so
 * turning the switch off here drops the array entirely rather than zeroing
 * a boolean next to it. Column count has no field of its own either; it's
 * read off however many cells the header row (or failing that, the first
 * body row) already has, and add/remove column just resizes every row and
 * the header together so they never drift out of sync.
 */
export function TableBlockEditor({
  block,
  onChange,
}: {
  block: TableBlock;
  onChange: (patch: Partial<Omit<TableBlock, "id" | "type">>) => void;
}) {
  const hasHeader = Boolean(block.headers && block.headers.length > 0);
  const columnCount = hasHeader ? block.headers!.length : (block.rows[0]?.length ?? 2);

  const setHeaderCell = (col: number, value: string) => {
    const next = (block.headers ?? []).slice();
    next[col] = value;
    onChange({ headers: next });
  };

  const setCell = (row: number, col: number, value: string) => {
    const next = block.rows.map((r) => r.slice());
    next[row][col] = value;
    onChange({ rows: next });
  };

  const toggleHeader = (checked: boolean) => {
    onChange({ headers: checked ? Array.from({ length: columnCount }, () => "") : undefined });
  };

  const addColumn = () => {
    onChange({
      headers: hasHeader ? [...block.headers!, ""] : block.headers,
      rows: block.rows.map((r) => [...r, ""]),
    });
  };

  const removeColumn = () => {
    if (columnCount <= 1) return;
    onChange({
      headers: hasHeader ? block.headers!.slice(0, -1) : block.headers,
      rows: block.rows.map((r) => r.slice(0, -1)),
    });
  };

  const addRow = () => onChange({ rows: [...block.rows, Array.from({ length: columnCount }, () => "")] });
  const removeRow = (row: number) => onChange({ rows: block.rows.filter((_, i) => i !== row) });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <ToggleSwitch label="Header row" checked={hasHeader} onChange={toggleHeader} variant="setting" />
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={addColumn} className={gridButtonClass}>
            + Column
          </button>
          <button type="button" onClick={removeColumn} disabled={columnCount <= 1} className={gridButtonClass}>
            − Column
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          {hasHeader && (
            <thead>
              <tr>
                {block.headers!.map((header, col) => (
                  <th key={col} className="text-left font-normal">
                    <input
                      className={cellInputClass}
                      value={header}
                      onChange={(e) => setHeaderCell(col, e.target.value)}
                      placeholder={`Column ${col + 1}`}
                    />
                  </th>
                ))}
                <th />
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>
                    <input className={cellInputClass} value={cell} onChange={(e) => setCell(r, c, e.target.value)} />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    aria-label="Remove row"
                    title="Remove row"
                    onClick={() => removeRow(r)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-surface-2 hover:text-signal-coral"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addRow} className={`self-start ${gridButtonClass}`}>
        + Row
      </button>

      <Field label="Caption (optional)">
        <input
          className={fieldInputClass}
          value={block.caption ?? ""}
          onChange={(e) => onChange({ caption: e.target.value || undefined })}
        />
      </Field>
    </div>
  );
}

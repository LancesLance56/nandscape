import type { ListBlock } from "@/types/content-block";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

const itemInputClass =
  "w-full rounded-md border border-border-strong bg-surface-card px-2 py-1 text-sm text-ink outline-none focus:border-copper";

const rowButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30";

/**
 * Each list item is stored as a run of rich-text spans (`TextSpan[]`), but the
 * editor keeps it to a single plain-text span per item - the same trade-off
 * the table editor makes for cells: a plain `<input>` reorders and deletes
 * cleanly, where one Lexical instance per row would fight React's keys. The
 * published renderer still honours any marks that reach it in the JSON.
 */
export function ListBlockEditor({
  block,
  onChange,
}: {
  block: ListBlock;
  onChange: (patch: Partial<Omit<ListBlock, "id" | "type">>) => void;
}) {
  const text = (i: number) => block.items[i]?.map((s) => s.text).join("") ?? "";

  const setItem = (i: number, value: string) => {
    const next = block.items.map((it) => it.slice());
    next[i] = [{ text: value }];
    onChange({ items: next });
  };

  const addItem = () => onChange({ items: [...block.items, [{ text: "" }]] });

  const removeItem = (i: number) => {
    if (block.items.length <= 1) return;
    onChange({ items: block.items.filter((_, j) => j !== i) });
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= block.items.length) return;
    const next = block.items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ items: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <ToggleSwitch
        label="Numbered"
        checked={block.ordered}
        onChange={(ordered) => onChange({ ordered })}
        variant="setting"
      />

      <div className="flex flex-col gap-2">
        {block.items.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate">
              {block.ordered ? `${i + 1}.` : "•"}
            </span>
            <input
              className={itemInputClass}
              value={text(i)}
              onChange={(e) => setItem(i, e.target.value)}
              placeholder={`Item ${i + 1}`}
            />
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                aria-label="Move item up"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className={rowButtonClass}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move item down"
                onClick={() => move(i, 1)}
                disabled={i === block.items.length - 1}
                className={rowButtonClass}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Remove item"
                onClick={() => removeItem(i)}
                disabled={block.items.length <= 1}
                className={`${rowButtonClass} hover:text-signal-coral`}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="self-start rounded-md border border-border-strong px-2 py-1 text-xs text-slate transition-colors hover:bg-surface-2 hover:text-ink"
      >
        + Item
      </button>
    </div>
  );
}

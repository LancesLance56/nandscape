"use client";

import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { Segmented } from "@/components/content/blocks/interactive/shared/widget-ui";

const DEFAULT_ARRAYS: Record<string, string> = {
  merge: "38,27,43,3,9,82,10",
  quick: "7,2,9,4,3,7,6",
};

function parseArray(text: string): number[] {
  return text
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

export function SortRecursionTreeWidgetEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const algorithm = data.algorithm === "quick" ? "quick" : "merge";
  const arrayText = Array.isArray(data.array) ? (data.array as number[]).join(",") : DEFAULT_ARRAYS[algorithm];

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        label="Algorithm"
        value={algorithm}
        onChange={(id) => onChange({ ...data, algorithm: id, array: undefined })}
        options={[
          { id: "merge", label: "Merge sort" },
          { id: "quick", label: "Quick sort (Lomuto)" },
        ]}
      />
      <Field label="Array (comma-separated, optional)">
        <input
          className={fieldInputClass}
          defaultValue={arrayText}
          placeholder={DEFAULT_ARRAYS[algorithm]}
          onBlur={(e) => {
            const parsed = parseArray(e.target.value);
            onChange({ ...data, array: parsed.length > 0 ? parsed : undefined });
          }}
        />
      </Field>
    </div>
  );
}

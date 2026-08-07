"use client";

import { useBlogEditorUiStore, type BlogEditorViewMode } from "@/store/blog-editor-ui-store";

const OPTIONS: { mode: BlogEditorViewMode; label: string }[] = [
  { mode: "edit", label: "Edit" },
  { mode: "split", label: "Split" },
  { mode: "preview", label: "Preview" },
];

export function ViewModeToggle() {
  const viewMode = useBlogEditorUiStore((s) => s.viewMode);
  const setViewMode = useBlogEditorUiStore((s) => s.setViewMode);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
      {OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={viewMode === mode}
          onClick={() => setViewMode(mode)}
          className={`rounded-md px-3 py-1 font-mono text-xs font-semibold transition-colors ${
            viewMode === mode ? "bg-surface-card text-ink shadow-sm" : "text-slate hover:text-ink-soft"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

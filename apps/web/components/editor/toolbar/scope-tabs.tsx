"use client";

import { useScopesStore } from "@/store/scopes-store";
import { usePuzzleStore } from "@/store/puzzle-store";

/**
 * A CircuitVerse-style tab strip: each tab is a scope (a named circuit)
 * within the current project. Switching commits whatever's on the canvas
 * back into the tab you're leaving first (see scopes-store.ts's
 * commitActive), so nothing typed is lost. Any tab can be dropped into
 * another as a subcircuit instance from the palette's "This project's
 * circuits" group (see gate-palette.tsx) - this strip only handles
 * switching/naming/adding/removing tabs, not placing them.
 *
 * Hidden in puzzle mode: puzzles explicitly disallow subcircuits/blocks
 * altogether (see grade-puzzle.ts's structural check and gate-palette.tsx's
 * matching "Circuit blocks" restriction), so a tab strip would have
 * nothing useful to do there.
 */
export function ScopeTabs() {
  const scopes = useScopesStore((s) => s.scopes);
  const activeScopeId = useScopesStore((s) => s.activeScopeId);
  const switchTo = useScopesStore((s) => s.switchTo);
  const addScope = useScopesStore((s) => s.addScope);
  const renameScope = useScopesStore((s) => s.renameScope);
  const deleteScope = useScopesStore((s) => s.deleteScope);
  const activePuzzleSlug = usePuzzleStore((s) => s.activePuzzleSlug);

  if (activePuzzleSlug) return null;

  const handleRename = (id: string, currentName: string) => {
    const next = window.prompt("Rename this circuit:", currentName);
    if (next && next.trim()) renameScope(id, next);
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? Any subcircuit instances of it will break.`)) return;
    const error = deleteScope(id);
    if (error) window.alert(error);
  };

  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-border/60 bg-surface-card px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {scopes.map((scope) => {
        const active = scope.id === activeScopeId;
        return (
          <div
            key={scope.id}
            className={`group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium transition-colors ${
              active ? "bg-copper-bg text-copper-dark" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <button
              type="button"
              onClick={() => switchTo(scope.id)}
              onDoubleClick={() => handleRename(scope.id, scope.name)}
              className="max-w-[10rem] truncate"
              title="Double-click to rename"
            >
              {scope.name}
            </button>
            {scopes.length > 1 && (
              <button
                type="button"
                aria-label={`Delete ${scope.name}`}
                onClick={() => handleDelete(scope.id, scope.name)}
                className="rounded px-1 text-xs text-ink-soft opacity-0 transition-opacity hover:text-signal-coral group-hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => addScope()}
        aria-label="Add a new circuit tab"
        className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
      >
        +
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useHistoryStore } from "@/store/history-store";
import { useBlogEditorStore } from "@/store/blog-editor-store";

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Deliberately its own listener rather than registering into the global
 * commandRegistry/shortcutRegistry (lib/commands, lib/keyboard) the circuit
 * editor uses. Those are process-wide singletons keyed by combo string with
 * last-registration-wins semantics - mod+s is already bound to
 * "circuit.save" there. Reusing them here would mean whichever editor
 * mounts second silently steals the other's shortcuts for the rest of the
 * tab's life. useHistoryStore itself is fine to share across both editors
 * (see blog-editor-store's loadDocument, which clears it per document load).
 */
export function useBlogEditorShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable)) return;

      const isMac = /mac/i.test(navigator.platform);
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (!mod) return;

      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) useHistoryStore.getState().redo();
        else useHistoryStore.getState().undo();
      } else if (key === "y") {
        event.preventDefault();
        useHistoryStore.getState().redo();
      } else if (key === "s") {
        event.preventDefault();
        void useBlogEditorStore.getState().save();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

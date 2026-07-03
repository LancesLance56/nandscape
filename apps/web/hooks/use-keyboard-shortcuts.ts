"use client";

import { useEffect } from "react";
import { shortcutRegistry, normalizeKeyEvent } from "@/lib/keyboard/shortcut-registry";
import { commandRegistry } from "@/lib/commands/registry";
import { useHistoryStore } from "@/store/history-store";

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Mounts a single window-level keydown listener for the whole editor.
 * Individual components never add their own document-level shortcut
 * listeners — that scales badly (ordering bugs, duplicate handling) once
 * there are a dozen panels. If a panel needs a *local* shortcut (e.g.
 * Enter to confirm a rename), it should stopPropagation on its own input
 * instead of registering here.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable)) {
        return;
      }

      const combo = normalizeKeyEvent(event);
      const binding = shortcutRegistry.resolve(combo);
      if (!binding) return;

      const command = commandRegistry.get(binding.commandId);
      if (!command) return;

      event.preventDefault();
      useHistoryStore.getState().run(command);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

"use client";

import { useEffect } from "react";
import { shortcutRegistry, normalizeKeyEvent } from "@/lib/keyboard/shortcut-registry";
import { commandRegistry } from "@/lib/commands/registry";
import { useHistoryStore } from "@/store/history-store";

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

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

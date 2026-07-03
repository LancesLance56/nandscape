"use client";

import { useEffect, useRef } from "react";
import { commandRegistry } from "@/lib/commands/registry";
import { ALL_REGISTERED_COMMANDS } from "@/lib/commands/commands/registered-commands";
import { shortcutRegistry } from "@/lib/keyboard/shortcut-registry";
import { DEFAULT_SHORTCUTS } from "@/lib/keyboard/default-shortcuts";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { EditorLayout } from "./layout/editor-layout";

export function CircuitEditor() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    commandRegistry.registerAll(ALL_REGISTERED_COMMANDS);
    shortcutRegistry.registerAll(DEFAULT_SHORTCUTS);
  }, []);

  useKeyboardShortcuts();

  return (
    <div className="h-full min-h-[640px] w-full overflow-hidden border border-border bg-surface shadow-sm">
      <EditorLayout />
    </div>
  );
}

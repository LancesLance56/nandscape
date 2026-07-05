"use client";

import { useCallback } from "react";
import { useHistoryStore } from "@/store/history-store";
import type { Command } from "@/lib/commands/command";

/**
 * The one function the Toolbar, context menu, and shortcut handlers should
 * call to make any structural edit. Never call editor-store's mutators
 * directly from UI code — always go through a Command via this hook so the
 * action is undoable and consistent everywhere it can be triggered from.
 *
 * Usage:
 *   const dispatch = useCommandDispatch();
 *   dispatch(createDeleteSelectionCommand());
 */
export function useCommandDispatch() {
  const run = useHistoryStore((s) => s.run);
  return useCallback(<T,>(command: Command<T>) => run(command), [run]);
}

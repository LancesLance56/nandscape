"use client";

import { useCallback } from "react";
import { useHistoryStore } from "@/store/history-store";
import type { Command } from "@/lib/commands/command";

export function useCommandDispatch() {
  const run = useHistoryStore((s) => s.run);
  return useCallback(<T,>(command: Command<T>) => run(command), [run]);
}

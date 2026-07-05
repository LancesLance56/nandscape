"use client";

import { useCallback } from "react";
import { useUiStore } from "@/store/ui-store";

export interface ContextMenuTarget {
  x: number;
  y: number;
  /** Id of the node/edge right-clicked, or null for the empty canvas. */
  targetId: string | null;
  targetType: "node" | "edge" | "pane";
}

export function useContextMenuTrigger() {
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  return useCallback((target: ContextMenuTarget) => openContextMenu(target), [openContextMenu]);
}

export function useContextMenuState() {
  return useUiStore((s) => s.contextMenu);
}

export function useCloseContextMenu() {
  return useUiStore((s) => s.closeContextMenu);
}

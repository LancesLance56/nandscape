"use client";

import type { ComponentType } from "react";
import { useUiStore } from "@/store/ui-store";

export const dialogRegistry: Record<string, ComponentType<{ onClose: () => void }>> = {
  // "confirm-delete-circuit": ConfirmDeleteCircuitDialog,
};

export function DialogRoot() {
  const activeDialog = useUiStore((s) => s.activeDialog);
  const closeDialog = useUiStore((s) => s.closeDialog);

  if (!activeDialog) return null;

  const Dialog = dialogRegistry[activeDialog];
  if (!Dialog) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <Dialog onClose={closeDialog} />
    </div>
  );
}

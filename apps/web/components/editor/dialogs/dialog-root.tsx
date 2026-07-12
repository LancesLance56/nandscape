"use client";

import type {ComponentType} from "react";
import {useUiStore} from "@/store/ui-store";

/**
 * dialogs/ holds modal flows (confirm, rename, export, settings). Only one
 * can be open at a time, tracked by id in ui-store.activeDialog. New
 * dialogs register themselves in `dialogRegistry` below rather than
 * DialogRoot growing a switch statement per dialog.
 */
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
      <Dialog onClose={closeDialog}/>
    </div>
  );
}

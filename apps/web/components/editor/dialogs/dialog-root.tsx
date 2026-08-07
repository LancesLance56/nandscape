"use client";

import { useSyncExternalStore, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { useUiStore } from "@/store/ui-store";
import { SaveSubcircuitDialog } from "./save-subcircuit-dialog";
import { AddCircuitDialog } from "./add-circuit-dialog";
import { ShareDialog } from "./share-dialog";

export const dialogRegistry: Record<string, ComponentType<{ onCloseAction: () => void }>> = {
  "save-subcircuit": SaveSubcircuitDialog,
  "add-circuit": AddCircuitDialog,
  share: ShareDialog,
};

function subscribe() {
  return () => {};
}
function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function DialogRoot() {
  const activeDialog = useUiStore((s) => s.activeDialog);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const mounted = useMounted();

  if (!mounted || !activeDialog) return null;

  const Dialog = dialogRegistry[activeDialog];
  if (!Dialog) return null;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
      className="bg-ink/40 backdrop-blur-sm"
      onClick={closeDialog}
    >
      <Dialog onCloseAction={closeDialog} />
    </div>,
    document.body,
  );
}
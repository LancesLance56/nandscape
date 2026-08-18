"use client";

import type { ComponentType } from "react";
import { useUiStore } from "@/store/ui-store";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SaveSubcircuitDialog } from "./save-subcircuit-dialog";
import { AddCircuitDialog } from "./add-circuit-dialog";
import { ShareDialog } from "./share-dialog";

export const dialogRegistry: Record<string, ComponentType<{ onCloseAction: () => void }>> = {
  "save-subcircuit": SaveSubcircuitDialog,
  "add-circuit": AddCircuitDialog,
  share: ShareDialog,
};

const dialogLabels: Record<string, string> = {
  "save-subcircuit": "Save subcircuit",
  "add-circuit": "Add circuit",
  share: "Share circuit",
};

/**
 * Host for the editor's modal dialogs.
 *
 * This used to hand-roll the portal, the backdrop, the Tab cycle, the Escape
 * handler and the focus restore, in about seventy lines that were the subject
 * of three separate accessibility fixes. The dialog primitive does all of it,
 * and adds the two things the hand-rolled version never had: the page behind
 * the dialog goes inert, and body scrolling is locked while it is open.
 *
 * The registry and the `onCloseAction` contract are unchanged, so the three
 * dialog bodies did not have to move. Each of them draws its own card, hence
 * the stripped-down DialogContent below: no padding, no width cap, no close
 * button of its own.
 */
export function DialogRoot() {
  const activeDialog = useUiStore((s) => s.activeDialog);
  const closeDialog = useUiStore((s) => s.closeDialog);

  const Body = activeDialog ? dialogRegistry[activeDialog] : undefined;
  if (!activeDialog || !Body) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent
        showCloseButton={false}
        className="w-auto max-w-none gap-0 rounded-none bg-transparent p-0 ring-0"
      >
        {/* Required for the dialog to have an accessible name. The bodies
            render their own visible headings, so this one is for assistive
            technology only. */}
        <DialogTitle className="sr-only">{dialogLabels[activeDialog] ?? "Dialog"}</DialogTitle>
        <Body onCloseAction={closeDialog} />
      </DialogContent>
    </Dialog>
  );
}

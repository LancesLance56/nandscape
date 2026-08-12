"use client";

import { useEffect, useRef, useSyncExternalStore, type ComponentType } from "react";
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

const dialogLabels: Record<string, string> = {
  "save-subcircuit": "Save subcircuit",
  "add-circuit": "Add circuit",
  share: "Share circuit",
};

function subscribe() {
  return () => {};
}
function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DialogRoot() {
  const activeDialog = useUiStore((s) => s.activeDialog);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const mounted = useMounted();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeDialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const firstFocusable = container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? container)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDialog();
        return;
      }
      if (e.key !== "Tab" || !container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [activeDialog, closeDialog]);

  if (!mounted || !activeDialog) return null;

  const Dialog = dialogRegistry[activeDialog];
  if (!Dialog) return null;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}
      className="bg-ink/40 backdrop-blur-sm"
      onClick={closeDialog}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabels[activeDialog] ?? "Dialog"}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <Dialog onCloseAction={closeDialog} />
      </div>
    </div>,
    document.body,
  );
}
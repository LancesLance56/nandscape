import { defineCommand } from "../command";
import { useHistoryStore } from "@/store/history-store";
import { useEditorStore } from "@/store/editor-store";
import { useUiStore } from "@/store/ui-store";
import { useSimulationStore } from "@/store/simulation-store";
import { createDeleteSelectionCommand } from "./delete-selection.command";

/**
 * registered-commands.ts
 * ---------------------------------------------------------------------------
 * Commands that take no per-invocation payload, so a single static instance
 * can live in commandRegistry and be triggered identically from the
 * toolbar, a shortcut, or the context menu (see components/editor/index.tsx
 * for where these get registered).
 *
 * Commands that DO need a payload (add a specific node, connect two
 * specific pins, move specific nodes) are factories instead — see
 * add-node.command.ts, connect-edge.command.ts, move-nodes.command.ts —
 * and are constructed at the call site (e.g. canvas.tsx's onConnect),
 * not registered here.
 *
 * Undo/redo and pure-UI toggles are marked `undoable: false` (the default)
 * so they run without creating a phantom entry on the history stack.
 */

export const historyUndoCommand = defineCommand({
  id: "history.undo",
  label: "Undo",
  execute: () => useHistoryStore.getState().undo(),
});

export const historyRedoCommand = defineCommand({
  id: "history.redo",
  label: "Redo",
  execute: () => useHistoryStore.getState().redo(),
});

/** Delegates to the payload-carrying delete command, running it through history itself. */
export const deleteSelectionCommand = defineCommand({
  id: "selection.delete",
  label: "Delete selection",
  execute: () => useHistoryStore.getState().run(createDeleteSelectionCommand()),
});

export const selectAllCommand = defineCommand({
  id: "selection.selectAll",
  label: "Select all",
  execute: () => useEditorStore.getState().selectAll(),
});

export const clearSelectionCommand = defineCommand({
  id: "selection.clear",
  label: "Clear selection",
  execute: () => useEditorStore.getState().clearSelection(),
});

// --- Placeholders — wired up once clipboard/duplication logic exists -------
export const duplicateSelectionCommand = defineCommand({
  id: "selection.duplicate",
  label: "Duplicate selection",
  execute: () => console.info("[nandscape] selection.duplicate: not implemented yet"),
});

export const copySelectionCommand = defineCommand({
  id: "clipboard.copy",
  label: "Copy",
  execute: () => console.info("[nandscape] clipboard.copy: not implemented yet"),
});

export const pasteClipboardCommand = defineCommand({
  id: "clipboard.paste",
  label: "Paste",
  execute: () => console.info("[nandscape] clipboard.paste: not implemented yet"),
});

export const saveCircuitCommand = defineCommand({
  id: "circuit.save",
  label: "Save circuit",
  execute: () => console.info("[nandscape] circuit.save: not implemented yet"),
});

// --- UI toggles --------------------------------------------------------------
export const toggleSidebarCommand = defineCommand({
  id: "ui.toggleSidebar",
  label: "Toggle sidebar",
  execute: () => useUiStore.getState().toggleSidebar(),
});

export const toggleInspectorCommand = defineCommand({
  id: "ui.toggleInspector",
  label: "Toggle inspector",
  execute: () => useUiStore.getState().toggleInspector(),
});

export const toggleBottomPanelCommand = defineCommand({
  id: "ui.toggleBottomPanel",
  label: "Toggle bottom panel",
  execute: () => useUiStore.getState().toggleBottomPanel(),
});

// --- Simulation ---------------------------------------------------------------
export const toggleSimulationPlayCommand = defineCommand({
  id: "simulation.togglePlay",
  label: "Play/pause simulation",
  execute: () => {
    const { status, play, pause } = useSimulationStore.getState();
    if (status === "running") pause();
    else play();
  },
});

// --- View — placeholders until the canvas exposes an imperative zoom API ----
export const zoomToFitCommand = defineCommand({
  id: "view.zoomToFit",
  label: "Zoom to fit",
  execute: () => console.info("[nandscape] view.zoomToFit: wire to CanvasControls' useReactFlow()"),
});

export const zoomInCommand = defineCommand({
  id: "view.zoomIn",
  label: "Zoom in",
  execute: () => console.info("[nandscape] view.zoomIn: wire to CanvasControls' useReactFlow()"),
});

export const zoomOutCommand = defineCommand({
  id: "view.zoomOut",
  label: "Zoom out",
  execute: () => console.info("[nandscape] view.zoomOut: wire to CanvasControls' useReactFlow()"),
});

export const ALL_REGISTERED_COMMANDS = [
  historyUndoCommand,
  historyRedoCommand,
  deleteSelectionCommand,
  selectAllCommand,
  clearSelectionCommand,
  duplicateSelectionCommand,
  copySelectionCommand,
  pasteClipboardCommand,
  saveCircuitCommand,
  toggleSidebarCommand,
  toggleInspectorCommand,
  toggleBottomPanelCommand,
  toggleSimulationPlayCommand,
  zoomToFitCommand,
  zoomInCommand,
  zoomOutCommand,
];

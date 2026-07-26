import {defineCommand} from "../command";
import {useHistoryStore} from "@/store/history-store";
import {useEditorStore} from "@/store/editor-store";
import {useUiStore} from "@/store/ui-store";
import {useSimulationStore} from "@/store/simulation-store";
import {useWireDraftStore} from "@/store/wire-draft-store";
import {createDeleteSelectionCommand} from "@/lib/commands";
import {useCustomCircuitsStore} from "@/store";
import {createRotateNodesCommand} from "@/lib/commands/commands/rotate-nodes.command";
import {GateNodeData} from "@/types/editor";
import { usePuzzleStore } from "@/store/puzzle-store";
import { scopeForPuzzle } from "@/store/custom-circuits-store";

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
  execute: () => {
    if (useWireDraftStore.getState().draft) {
      useWireDraftStore.getState().cancel();
      return;
    }
    useEditorStore.getState().clearSelection();
  },
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
  execute: () => {
    const { nodes, edges } = useEditorStore.getState();
    if (nodes.length === 0) {
      console.info("[nandscape] circuit.save: canvas is empty, nothing to save");
      return;
    }
    const name = window.prompt("Name this circuit:", "My circuit");
    if (!name) return;
    const scope = scopeForPuzzle(usePuzzleStore.getState().activePuzzleSlug);
    useCustomCircuitsStore.getState().save(scope, name, nodes, edges);
  },
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
    const {status, play, pause} = useSimulationStore.getState();
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

export const rotateSelectionCommand = defineCommand({
  id: "selection.rotate90",
  label: "Rotate 90°",
  execute: () => {
    const {nodes, selection} = useEditorStore.getState();
    const selectedIds = new Set(selection.nodeIds);
    const rotations = nodes
      .filter((n) => selectedIds.has(n.id) && n.data.kind === "gate")
      .map((n) => {
        const from = (n.data as GateNodeData).rotation ?? 0;
        const to = ((from + 90) % 360) as 0 | 90 | 180 | 270;
        return {nodeId: n.id, from, to};
      });
    if (rotations.length === 0) return;
    useHistoryStore.getState().run(createRotateNodesCommand(rotations));
  },
});

export const saveAsBlockCommand = defineCommand({
  id: "circuit.saveAsBlock",
  label: "Save as circuit block",
  execute: () => useUiStore.getState().openDialog("save-subcircuit"),
});

export const openAddCircuitDialogCommand = defineCommand({
  id: "circuit.openAddDialog",
  label: "Add a circuit",
  execute: () => useUiStore.getState().openDialog("add-circuit"),
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
  saveAsBlockCommand,
  rotateSelectionCommand,
  toggleSidebarCommand,
  toggleInspectorCommand,
  toggleBottomPanelCommand,
  toggleSimulationPlayCommand,
  zoomToFitCommand,
  zoomInCommand,
  zoomOutCommand,
];
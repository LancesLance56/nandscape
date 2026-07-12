import {commandRegistry} from "@/lib/commands/registry";
import type {Command} from "@/lib/commands/command";
import {createDeleteEdgeCommand} from "@/lib/commands/commands/delete-edge.command";
import {createClearEdgeTurnsCommand} from "@/lib/commands/commands/clear-edge-turns.command";
import type {EditorNode, EditorEdge} from "@/types/editor";

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  destructive?: boolean;
  /** Static command, looked up in commandRegistry by id. */
  commandId?: string;
  /** Per-instance command that needs a specific target id (e.g. "delete this edge"). */
  dynamicCommand?: () => Command<unknown>;
}

export interface ContextMenuBuilderArgs {
  targetId: string | null;
  targetType: "node" | "edge" | "pane";
  node: EditorNode | null;
  edge: EditorEdge | null;
}

/**
 * Menu content is derived from what was right-clicked, keyed by
 * targetType, rather than hardcoded in context-menu.tsx — a future node or
 * edge kind adds its own section here instead of growing a conditional in
 * the menu component itself.
 */
type MenuBuilder = (args: ContextMenuBuilderArgs) => ContextMenuItem[];

const paneMenu: MenuBuilder = () => [
  {commandId: "clipboard.paste", label: "Paste"},
  {commandId: "selection.selectAll", label: "Select all", shortcut: "⌘A"},
  {commandId: "view.zoomToFit", label: "Zoom to fit", shortcut: "⌘0"},
];

const nodeMenu: MenuBuilder = () => [
  {commandId: "selection.duplicate", label: "Duplicate", shortcut: "⌘D"},
  {commandId: "clipboard.copy", label: "Copy", shortcut: "⌘C"},
  {commandId: "selection.delete", label: "Delete", shortcut: "Del", destructive: true},
];

const edgeMenu: MenuBuilder = ({edge}) => {
  if (!edge) return [];
  const items: ContextMenuItem[] = [];
  if (edge.data?.waypoints?.length) {
    items.push({label: "Clear turns", dynamicCommand: () => createClearEdgeTurnsCommand(edge.id)});
  }
  items.push({label: "Delete wire", destructive: true, dynamicCommand: () => createDeleteEdgeCommand(edge.id)});
  return items;
};

/**
 * Placeholder commands (clipboard.*, selection.duplicate) aren't
 * registered yet — filtering them out here would render an empty pane/node
 * menu, so static items pass through even if their command id isn't found
 * yet. Dynamic items always pass through since they don't depend on the
 * static registry.
 */
export function buildContextMenuItems(args: ContextMenuBuilderArgs): ContextMenuItem[] {
  const builder = args.targetType === "edge" ? edgeMenu : args.targetType === "node" ? nodeMenu : paneMenu;
  return builder(args).filter((item) => item.dynamicCommand || commandRegistry.has(item.commandId!) || true);
}

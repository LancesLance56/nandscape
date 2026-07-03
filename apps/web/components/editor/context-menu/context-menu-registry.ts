import { commandRegistry } from "@/lib/commands/registry";
import type { EditorNode } from "@/types/editor";

export interface ContextMenuItem {
  commandId: string;
  label: string;
  shortcut?: string;
  destructive?: boolean;
}

export interface ContextMenuBuilderArgs {
  targetId: string | null;
  node: EditorNode | null;
}

type MenuBuilder = (args: ContextMenuBuilderArgs) => ContextMenuItem[];

const paneMenu: MenuBuilder = () => [
  { commandId: "clipboard.paste", label: "Paste" },
  { commandId: "selection.selectAll", label: "Select all", shortcut: "⌘A" },
  { commandId: "view.zoomToFit", label: "Zoom to fit", shortcut: "⌘0" },
];

const nodeMenu: MenuBuilder = () => [
  { commandId: "selection.duplicate", label: "Duplicate", shortcut: "⌘D" },
  { commandId: "clipboard.copy", label: "Copy", shortcut: "⌘C" },
  { commandId: "selection.delete", label: "Delete", shortcut: "Del", destructive: true },
];

export function buildContextMenuItems(args: ContextMenuBuilderArgs): ContextMenuItem[] {
  const builder = args.targetId ? nodeMenu : paneMenu;
  return builder(args).filter((item) => commandRegistry.has(item.commandId) || true);
  // NOTE: the `|| true` above is intentional for now — placeholder commands
  // (clipboard.*, selection.duplicate) aren't registered yet, so filtering
  // strictly would render an empty menu. Remove once those commands land.
}

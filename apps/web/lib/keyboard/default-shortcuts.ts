import type {ShortcutBinding} from "./shortcut-registry";

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  {combo: "mod+z", commandId: "history.undo"},
  {combo: "mod+shift+z", commandId: "history.redo"},
  {combo: "mod+y", commandId: "history.redo"},
  {combo: "delete", commandId: "selection.delete"},
  {combo: "backspace", commandId: "selection.delete"},
  {combo: "mod+a", commandId: "selection.selectAll"},
  {combo: "escape", commandId: "selection.clear"},
  {combo: "mod+d", commandId: "selection.duplicate"},
  {combo: "mod+c", commandId: "selection.copy"},
  {combo: "mod+v", commandId: "selection.paste"},
  {combo: "mod+s", commandId: "circuit.save"},
  {combo: "space", commandId: "simulation.step"},
  {combo: "mod+b", commandId: "ui.toggleSidebar"},
  {combo: "mod+i", commandId: "ui.toggleInspector"},
  {combo: "mod+j", commandId: "ui.toggleBottomPanel"},
  {combo: "mod+0", commandId: "view.zoomToFit"},
  {combo: "mod+=", commandId: "view.zoomIn"},
  {combo: "mod+-", commandId: "view.zoomOut"},
  {combo: "r", commandId: "selection.rotate90"},
];

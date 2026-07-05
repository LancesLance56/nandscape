/**
 * command.ts
 * ---------------------------------------------------------------------------
 * Every mutation the editor makes to circuit structure (add/remove nodes,
 * connect wires, move things, rename things...) is expressed as a Command.
 *
 * WHY: the toolbar, context menus, and keyboard shortcuts all need to
 * trigger the exact same logic, and undo/redo needs a uniform way to
 * reverse it. Routing everything through Commands means:
 *   - the Toolbar only ever dispatches commands, never touches stores directly
 *   - history-store only needs to know about `execute`/`undo`, not editor internals
 *   - new features add a new Command instead of new bespoke store methods
 *
 * A Command is a plain object, not a class instance, so it can be created
 * cheaply, serialized for debugging, and diffed in tests.
 */

export interface CommandContext {
  /** Present so commands can read current state before computing a patch. */
  now: () => number;
}

export interface Command<TResult = void> {
  /** Stable id for shortcut binding, logging, and analytics. e.g. "node.delete" */
  id: string;
  /** Human-readable label shown in menus, the command palette, and the undo stack. */
  label: string;
  /** Applies the command's effect. Must be idempotent given the same context. */
  execute: (ctx: CommandContext) => TResult;
  /** Reverses the effect of `execute`. Omit for non-undoable commands (e.g. "view.zoomToFit"). */
  undo?: (ctx: CommandContext) => void;
  /** Non-undoable, purely informational commands (camera moves, panel toggles) skip the history stack. */
  undoable?: boolean;
}

/** Narrows a Command to one that is guaranteed to be reversible. */
export type UndoableCommand<TResult = void> = Command<TResult> & {
  undo: NonNullable<Command<TResult>["undo"]>;
  undoable: true;
};

export function isUndoable<T>(command: Command<T>): command is UndoableCommand<T> {
  return command.undoable === true && typeof command.undo === "function";
}

/** Factory helper — keeps individual command files declarative and short. */
export function defineCommand<TResult = void>(command: Command<TResult>): Command<TResult> {
  return command;
}

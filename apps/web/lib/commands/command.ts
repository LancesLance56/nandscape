export interface CommandContext {
  now: () => number;
}

export interface Command<TResult = void> {
  id: string;
  label: string;
  execute: (ctx: CommandContext) => TResult;
  undo?: (ctx: CommandContext) => void;
  undoable?: boolean;
}

export type UndoableCommand<TResult = void> = Command<TResult> & {
  undo: NonNullable<Command<TResult>["undo"]>;
  undoable: true;
};

export function isUndoable<T>(command: Command<T>): command is UndoableCommand<T> {
  return command.undoable === true && typeof command.undo === "function";
}

export function defineCommand<TResult = void>(command: Command<TResult>): Command<TResult> {
  return command;
}
